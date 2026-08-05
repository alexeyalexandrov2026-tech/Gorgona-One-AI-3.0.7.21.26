// ===========================================================================
// Gorgona One — local AI brain adapter (server-only).
//
// Bridges /api/chat to the self-hosted "Gorgona AI Brain" microservice
// (FastAPI + Ollama). It is an INDEPENDENT module: nothing else in the
// platform imports it, and /api/chat treats it as one optional link in a
// chain, so the site behaves identically whether the backend is running,
// half-configured, or absent entirely.
//
//   /api/chat -> askLocalBrain() -> FastAPI -> Ollama -> reply
//             -> (miss) ai-router -> (miss) canned concierge reply
//
// THE BACKEND'S CONTRACT (app/api/v1/chat.py, app/models/chat.py)
//
//   POST {base}/api/v1/chat/completions
//     -> { prompt, session_id?, model?, temperature?, max_tokens?, stream }
//     <- { session_id, response, model, usage, created_at }
//   GET  {base}/api/health
//     <- { status, app_name, provider, provider_connected, active_sessions }
//
// Two properties of that service shape this adapter:
//
//   * IT OWNS THE CONVERSATION. ChatService reads only the newest user turn
//     (ChatRequest.get_user_input()) and rebuilds context from its own
//     session memory. So we send one turn plus the session_id it gave us —
//     sending our whole transcript would be ignored, and dropping the
//     session_id would start a fresh, amnesiac session on every message.
//   * IT OWNS THE PERSONA. get_system_prompt() injects the service's own
//     brand prompt and the API exposes no hook to extend it, so the site's
//     SYSTEM_PROMPT is deliberately not sent on this path.
//
// THREE PROPERTIES THIS MODULE GUARANTEES
//
// 1. It never throws. Every path resolves to a plain result object, so a
//    caller can `await` it without a try/catch and never crash a render.
// 2. An offline backend is nearly free. A circuit breaker trips after a
//    couple of consecutive misses and then short-circuits for a cooldown
//    window, so guests never queue behind a dead socket. /api/health also
//    distinguishes "FastAPI is down" from "Ollama is down", and neither
//    costs a completion to discover.
// 3. It adapts rather than dictates. The contract above is verified at
//    runtime via /api/health; if the service moves or changes, the adapter
//    falls back to reading FastAPI's own /openapi.json, then to probing
//    conventional paths, and a 422 teaches it the right field names.
//
// Everything is env-overridable — see .env.example.
// ===========================================================================

import { inlineLanguageDirective } from './locale';

const DEFAULT_BASE = 'http://127.0.0.1:8000';

// The known Gorgona AI Brain contract, used when /api/health identifies the
// service. Kept as data so a redeploy behind a prefix only needs env changes.
const GORGONA_HEALTH_PATH = '/api/health';
const GORGONA_CHAT_PATH = '/api/v1/chat/completions';

// Consulted only when the service does not identify itself: a different
// build, a proxy in front, or a non-FastAPI process on the port.
const FALLBACK_CANDIDATES = [
  { path: GORGONA_CHAT_PATH, protocol: 'gorgona' },
  { path: '/v1/chat/completions', protocol: 'openai' },
  { path: '/api/chat', protocol: 'ollama' },
  { path: '/chat', protocol: 'simple' },
  { path: '/ask', protocol: 'simple' },
  { path: '/api/generate', protocol: 'ollama-generate' }
];

// Request-body field names we know how to fill, by role. Used to interpret a
// discovered OpenAPI schema and to repair a 422.
const FIELD_ROLES = [
  { role: 'text', match: /^(prompt|message|query|question|text|input|content|user_message|user_input)$/i },
  { role: 'history', match: /^(history|messages|conversation|context|chat_history)$/i },
  { role: 'session', match: /^(session_id|sessionid|conversation_id|thread_id)$/i },
  { role: 'system', match: /^(system|system_prompt|instructions|persona)$/i },
  { role: 'model', match: /^(model|model_name|llm)$/i }
];

const DEFAULT_FIELD_MAP = {
  text: 'message',
  history: 'history',
  session: 'session_id',
  system: 'system',
  model: 'model'
};

const truthy = (v) => ['on', '1', 'true', 'yes'].includes(String(v ?? '').trim().toLowerCase());
const falsy = (v) => ['off', '0', 'false', 'no'].includes(String(v ?? '').trim().toLowerCase());

function positiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

let cachedConfig = null;

export function getLocalBrainConfig() {
  if (cachedConfig) return cachedConfig;

  const base = String(process.env.GORGONA_AI_URL || DEFAULT_BASE)
    .trim()
    .replace(/\/+$/, '');

  cachedConfig = {
    // Opt-out rather than opt-in: with the backend absent the chain simply
    // falls through, so leaving this on by default costs nothing.
    enabled: !falsy(process.env.GORGONA_AI_ENABLED),
    base,
    apiKey: String(process.env.GORGONA_AI_API_KEY || '').trim(),
    // Pin the contract explicitly to skip detection entirely.
    path: String(process.env.GORGONA_AI_PATH || '').trim(),
    protocol: String(process.env.GORGONA_AI_PROTOCOL || '').trim().toLowerCase(),
    // Left empty on purpose: the service resolves an installed Ollama tag by
    // itself (OllamaProvider._resolve_model) and falls back to whatever is
    // pulled, which is more robust than us naming a model it may not have.
    model: String(process.env.GORGONA_AI_MODEL || '').trim(),
    // Full completion budget. The service's own ceiling is
    // LLM_TIMEOUT_SECONDS (120s by default); this is the site's shorter,
    // guest-facing limit.
    timeoutMs: positiveInt(process.env.GORGONA_AI_TIMEOUT_MS, 45_000),
    // Health/discovery budget. Deliberately small — this is what keeps an
    // unreachable host from stalling a guest's request.
    probeTimeoutMs: positiveInt(process.env.GORGONA_AI_PROBE_TIMEOUT_MS, 2_500),
    failureThreshold: positiveInt(process.env.GORGONA_AI_FAILURE_THRESHOLD, 2),
    cooldownMs: positiveInt(process.env.GORGONA_AI_COOLDOWN_MS, 30_000),
    // Matches the service's own defaults (DEFAULT_TEMPERATURE=0.7); the reply
    // ceiling stays concierge-sized rather than the service's 2048.
    temperature: 0.7,
    maxTokens: 600,
    verbose: truthy(process.env.GORGONA_AI_VERBOSE)
  };
  return cachedConfig;
}

// --- Circuit breaker -------------------------------------------------------
//
// The whole point of this integration is that a switched-off backend is a
// non-event. Without a breaker every message would pay a connect timeout;
// with it, the first couple of misses trip the circuit and the rest of the
// cooldown window is answered instantly by the next link in the chain.

const breaker = { failures: 0, openedAt: 0, loggedAt: 0 };

// Cached negotiated contract. Survives across requests so a healthy backend
// is only detected once per server process.
let contract = null;

function breakerIsOpen(config) {
  if (!breaker.openedAt) return false;
  if (Date.now() - breaker.openedAt < config.cooldownMs) return true;
  // Cooldown elapsed — allow one probing request through.
  breaker.openedAt = 0;
  breaker.failures = 0;
  return false;
}

function noteFailure(config, reason) {
  breaker.failures += 1;
  if (breaker.failures >= config.failureThreshold && !breaker.openedAt) {
    breaker.openedAt = Date.now();
    // Detection is re-run after an outage: the service may come back on a
    // different contract than the one we cached.
    contract = null;
  }
  // Log at most once per cooldown window. An offline backend is an expected
  // state, not an incident, and must not flood the server log.
  const now = Date.now();
  if (config.verbose || now - breaker.loggedAt > config.cooldownMs) {
    breaker.loggedAt = now;
    console.info(`AI local brain: unavailable (${reason}) — falling back to the hosted chain.`);
  }
}

function noteSuccess() {
  breaker.failures = 0;
  breaker.openedAt = 0;
}

/** Test/dev helper: forget cached config, contract, and breaker state. */
export function resetLocalBrain() {
  cachedConfig = null;
  contract = null;
  breaker.failures = 0;
  breaker.openedAt = 0;
  breaker.loggedAt = 0;
}

// --- Transport -------------------------------------------------------------

// Single place where the network is touched. Resolves to a Response or null;
// it never rejects, so no caller needs a try/catch around it.
async function request(url, { method = 'GET', body, timeoutMs, headers } = {}) {
  const config = getLocalBrainConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  
  const reqHeaders = { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers };
  if (config.apiKey) reqHeaders['X-API-Key'] = config.apiKey;

  try {
    return await fetch(url, {
      method,
      headers: reqHeaders,
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
      signal: controller.signal
    });
  } catch {
    // Connection refused, DNS failure, TLS error, timeout — all "not
    // available right now", all handled identically by the caller.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// --- Health -----------------------------------------------------------------

// Ask the service to identify itself. Cheap, non-LLM, and definitive: a
// HealthStatus body means we are talking to the Gorgona AI Brain and can use
// its known contract without probing.
async function checkHealth(config) {
  const response = await request(`${config.base}${GORGONA_HEALTH_PATH}`, { timeoutMs: config.probeTimeoutMs });
  if (!response) return { reachable: false, identified: false };
  if (!response.ok) return { reachable: true, identified: false };

  const payload = await readJson(response);
  // app_name + provider are HealthStatus-specific; `status` alone is too
  // common to treat as proof of identity.
  const identified = Boolean(payload && typeof payload.app_name === 'string' && 'provider_connected' in payload);

  return {
    reachable: true,
    identified,
    // The LLM engine behind FastAPI. False means Ollama is not up yet, so a
    // completion would only 502 after a wasted round trip.
    engineReady: identified ? payload.provider_connected !== false : true,
    detail: identified
      ? {
          app: payload.app_name,
          version: payload.version,
          status: payload.status,
          provider: payload.provider,
          model: payload.system_details?.model_name || null,
          activeSessions: payload.active_sessions
        }
      : null
  };
}

// --- Generic discovery (fallback) ------------------------------------------

// Score a path by how much it looks like a conversational endpoint. Ranking
// beats hardcoding: a service exposing /api/v2/chat wins over /healthz
// without us having to know the prefix in advance.
function scorePath(path) {
  const p = path.toLowerCase();
  if (/(^|\/)(health|healthz|ready|live|metrics|docs|openapi|version|sessions?)(\/|$)/.test(p)) return -1;
  let score = 0;
  if (p.includes('chat')) score += 10;
  if (p.includes('completion')) score += 8;
  if (p.includes('ask')) score += 6;
  if (p.includes('message')) score += 5;
  if (p.includes('generate')) score += 4;
  if (p.includes('prompt')) score += 3;
  // Streaming endpoints need an SSE reader; prefer the buffered sibling.
  if (/(^|\/)(stream|sse)(\/|$)/.test(p)) score -= 6;
  // Prefer the shallowest match so /chat beats /admin/debug/chat.
  score -= (p.split('/').length - 1) * 0.1;
  return score;
}

function protocolForPath(path) {
  const p = path.toLowerCase();
  if (p === GORGONA_CHAT_PATH) return 'gorgona';
  if (p.includes('chat/completions')) return 'openai';
  if (p === '/api/chat') return 'ollama';
  if (p.includes('generate')) return 'ollama-generate';
  return 'simple';
}

// Resolve a $ref like "#/components/schemas/ChatRequest" inside the document.
function resolveRef(doc, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  let node = doc;
  for (const segment of ref.slice(2).split('/')) {
    node = node?.[segment];
    if (!node) return null;
  }
  return node;
}

// Turn a declared request schema into our field map, so we send the field
// names the service actually asked for.
function fieldMapFromSchema(doc, schema) {
  const resolved = schema?.$ref ? resolveRef(doc, schema.$ref) : schema;
  const properties = resolved?.properties;
  if (!properties || typeof properties !== 'object') return null;

  const map = {};
  const required = new Set(Array.isArray(resolved.required) ? resolved.required : []);
  for (const name of Object.keys(properties)) {
    const role = FIELD_ROLES.find((r) => r.match.test(name))?.role;
    // A required field of a given role beats an optional one of the same role.
    if (role && (!map[role] || required.has(name))) map[role] = name;
  }
  return map.text || map.history ? { ...DEFAULT_FIELD_MAP, ...map } : null;
}

// Read FastAPI's self-description to find the chat route and its field names.
async function discoverFromOpenApi(config) {
  const response = await request(`${config.base}/openapi.json`, { timeoutMs: config.probeTimeoutMs });
  if (!response?.ok) return null;
  const doc = await readJson(response);
  const paths = doc?.paths;
  if (!paths || typeof paths !== 'object') return null;

  let best = null;
  for (const [path, methods] of Object.entries(paths)) {
    const post = methods?.post;
    if (!post) continue;
    // Path parameters would need values we do not have.
    if (path.includes('{')) continue;
    const score = scorePath(path);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      const schema = post.requestBody?.content?.['application/json']?.schema;
      best = { path, score, fieldMap: fieldMapFromSchema(doc, schema) };
    }
  }
  if (!best) return null;

  // A schema carrying both a text field and a session field is the Gorgona
  // shape (server-side memory), whatever the path happens to be called.
  const looksGorgona = Boolean(best.fieldMap?.session && best.fieldMap?.text);
  const protocol = config.protocol || (looksGorgona ? 'gorgona' : protocolForPath(best.path));

  return {
    path: best.path,
    protocol,
    fieldMap: best.fieldMap || DEFAULT_FIELD_MAP,
    source: 'openapi'
  };
}

// --- Request bodies --------------------------------------------------------

function toChatMessages(messages, systemPrompt) {
  const turns = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
  return systemPrompt ? [{ role: 'system', content: systemPrompt }, ...turns] : turns;
}

function latestUserText(messages) {
  const turns = toChatMessages(messages, null);
  return [...turns].reverse().find((m) => m.role === 'user')?.content || '';
}

function flattenForPrompt(chatMessages) {
  return chatMessages
    .map((m) => (m.role === 'system' ? m.content : `${m.role === 'user' ? 'Guest' : 'Concierge'}: ${m.content}`))
    .join('\n\n')
    .concat('\n\nConcierge:');
}

function buildBody({ protocol, fieldMap, messages, systemPrompt, sessionId, locale, config }) {
  const chatMessages = toChatMessages(messages, systemPrompt);
  const model = config.model;

  switch (protocol) {
    // The Gorgona AI Brain: one turn in, session_id carries the rest. The
    // service supplies its own system prompt and history.
    case 'gorgona': {
      const map = { ...DEFAULT_FIELD_MAP, ...(fieldMap || {}) };
      return {
        // The service injects its own system prompt and exposes no hook to
        // extend it, so the language instruction has to ride along with the
        // turn itself - it is the only text of ours the model ever sees.
        prompt: `${latestUserText(messages)}${inlineLanguageDirective(locale)}`,
        ...(sessionId ? { [map.session || 'session_id']: sessionId } : {}),
        stream: false,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        ...(model ? { model } : {})
      };
    }

    case 'openai':
      return {
        ...(model ? { model } : {}),
        messages: chatMessages,
        stream: false,
        temperature: config.temperature,
        max_tokens: config.maxTokens
      };

    case 'ollama':
      return {
        // Ollama's native API requires an explicit model.
        model: model || 'llama3',
        messages: chatMessages,
        stream: false,
        options: { temperature: config.temperature }
      };

    case 'ollama-generate':
      return {
        model: model || 'llama3',
        prompt: flattenForPrompt(chatMessages),
        stream: false,
        options: { temperature: config.temperature }
      };

    case 'simple':
    default: {
      // An unknown hand-written endpoint. Send the newest user turn under the
      // field it declared, with prior turns as history. Unknown extra keys are
      // ignored by Pydantic's default config, so a superset is safe.
      const map = { ...DEFAULT_FIELD_MAP, ...(fieldMap || {}) };
      const turns = toChatMessages(messages, null);
      return {
        [map.text]: latestUserText(messages),
        [map.history]: turns.slice(0, -1),
        ...(sessionId && map.session ? { [map.session]: sessionId } : {}),
        ...(systemPrompt ? { [map.system]: systemPrompt } : {}),
        ...(model ? { [map.model]: model } : {})
      };
    }
  }
}

// --- Response parsing ------------------------------------------------------

// Local backends differ in what they call the reply. Walk the shapes we know
// rather than demanding one.
function extractReply(payload, depth = 0) {
  if (typeof payload === 'string') return payload.trim();
  if (!payload || typeof payload !== 'object' || depth > 3) return '';
  // The service's error envelope is {error, type, message, path} — its
  // `message` is a diagnostic, never something to show a guest.
  if (payload.error === true) return '';

  // Gorgona: {response}. Ollama native: {message:{content}}. OpenAI: choices[].
  const nested = payload.message?.content ?? payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();

  for (const key of ['response', 'reply', 'answer', 'message', 'text', 'output', 'result', 'content', 'completion']) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  // Envelopes: { data: {...} } / { result: {...} }
  for (const key of ['data', 'result', 'output']) {
    if (payload[key] && typeof payload[key] === 'object') {
      const inner = extractReply(payload[key], depth + 1);
      if (inner) return inner;
    }
  }
  return '';
}

// A FastAPI 422 names the fields it wanted. Read them and rebuild the map so
// the retry sends exactly what the endpoint declared.
function fieldMapFrom422(detail) {
  if (!Array.isArray(detail)) return null;
  const map = {};
  for (const item of detail) {
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    if (loc[0] !== 'body' || typeof loc[1] !== 'string') continue;
    const role = FIELD_ROLES.find((r) => r.match.test(loc[1]))?.role;
    if (role && !map[role]) map[role] = loc[1];
  }
  return Object.keys(map).length ? { ...DEFAULT_FIELD_MAP, ...map } : null;
}

// --- Negotiation -----------------------------------------------------------

async function attempt(config, candidate, { messages, systemPrompt, sessionId, locale }) {
  const body = buildBody({
    protocol: candidate.protocol,
    fieldMap: candidate.fieldMap,
    messages,
    systemPrompt,
    sessionId,
    locale,
    config
  });

  const response = await request(`${config.base}${candidate.path}`, {
    method: 'POST',
    body,
    timeoutMs: config.timeoutMs
  });

  // Network-level miss: the service is not answering at all.
  if (!response) return { outcome: 'offline' };

  if (response.status === 404 || response.status === 405) return { outcome: 'wrong-path' };

  if (response.status === 422) {
    const payload = await readJson(response);
    const repaired = fieldMapFrom422(payload?.detail);
    // Only worth retrying if the 422 actually taught us something new.
    if (repaired && JSON.stringify(repaired) !== JSON.stringify(candidate.fieldMap)) {
      return { outcome: 'retry', fieldMap: repaired };
    }
    return { outcome: 'wrong-path' };
  }

  if (!response.ok) {
    // 502/504 here means FastAPI is fine but Ollama failed or timed out.
    if (config.verbose) {
      const payload = await readJson(response);
      console.info('AI local brain:', response.status, payload?.message || '', 'from', candidate.path);
    }
    return { outcome: 'error', status: response.status };
  }

  const payload = await readJson(response);
  const reply = extractReply(payload);
  if (!reply) return { outcome: 'empty' };

  return {
    outcome: 'ok',
    reply,
    // Carrying this back is what keeps the service's session memory coherent
    // across turns.
    sessionId: payload?.session_id || payload?.sessionId || sessionId || null,
    model: payload?.model || payload?.model_name || config.model || null
  };
}

// Ordered list of contracts to try. Returns `reachable: false` only when we
// positively know nothing is listening, so the caller can bail immediately.
async function candidatesFor(config) {
  if (contract) return { reachable: true, candidates: [contract] };

  if (config.path) {
    const path = config.path.startsWith('/') ? config.path : `/${config.path}`;
    return {
      reachable: true,
      candidates: [
        {
          path,
          protocol: config.protocol || protocolForPath(path),
          fieldMap: DEFAULT_FIELD_MAP,
          source: 'env'
        }
      ]
    };
  }

  // 1. Ask the service who it is. One cheap GET settles path, protocol, and
  //    whether the LLM engine behind it is even up.
  const health = await checkHealth(config);
  if (!health.reachable) return { reachable: false, candidates: [] };

  if (health.identified) {
    if (!health.engineReady) return { reachable: true, engineReady: false, candidates: [] };
    return {
      reachable: true,
      candidates: [
        {
          path: GORGONA_CHAT_PATH,
          protocol: config.protocol || 'gorgona',
          fieldMap: DEFAULT_FIELD_MAP,
          source: 'health'
        }
      ]
    };
  }

  // 2. Something else is listening — read its OpenAPI description.
  const discovered = await discoverFromOpenApi(config);
  if (discovered) return { reachable: true, candidates: [discovered] };

  // 3. Last resort: conventional paths.
  return {
    reachable: true,
    candidates: FALLBACK_CANDIDATES.map((c) => ({ ...c, fieldMap: DEFAULT_FIELD_MAP, source: 'probe' }))
  };
}

// --- Public entry point ----------------------------------------------------

/**
 * Ask the local Gorgona AI Brain. Never throws, never blocks past its budget.
 *
 * @param {Object} args
 * @param {Array<{role:string, content:string}>} args.messages Conversation so far.
 *   Only the newest user turn reaches the service; it rebuilds the rest from
 *   `sessionId`.
 * @param {string} [args.systemPrompt] Used only by generic backends — the
 *   Gorgona service injects its own persona and ignores this.
 * @param {string} [args.sessionId] Session handle from a previous reply.
 * @returns {Promise<
 *   | { ok: true, reply: string, sessionId: (string|null), model: (string|null), source: 'local' }
 *   | { ok: false, kind: 'disabled'|'cooldown'|'offline'|'engine-offline'|'unusable' }
 * >}
 */
export async function askLocalBrain({ messages, systemPrompt, sessionId, locale } = {}) {
  const config = getLocalBrainConfig();

  if (!config.enabled) return { ok: false, kind: 'disabled' };
  if (!Array.isArray(messages) || !messages.length) return { ok: false, kind: 'unusable' };
  // Fast path while the backend is known-down: no socket, no wait.
  if (breakerIsOpen(config)) return { ok: false, kind: 'cooldown' };

  const { reachable, engineReady, candidates } = await candidatesFor(config);

  if (!reachable) {
    noteFailure(config, 'not reachable');
    return { ok: false, kind: 'offline' };
  }
  if (engineReady === false) {
    // FastAPI answered but reports its LLM engine down; a completion would
    // only 502 after a wasted round trip.
    noteFailure(config, 'LLM engine not connected');
    return { ok: false, kind: 'engine-offline' };
  }

  let sawBackend = false;

  for (const candidate of candidates) {
    let current = candidate;
    let offline = false;

    // At most two passes per candidate: the initial call, plus one retry with
    // field names learned from a 422.
    for (let pass = 0; pass < 2; pass += 1) {
      const result = await attempt(config, current, { messages, systemPrompt, sessionId, locale });

      if (result.outcome === 'ok') {
        // Remember the winning contract so later requests skip negotiation.
        contract = { ...current, source: current.source || 'probe' };
        noteSuccess();
        return {
          ok: true,
          reply: result.reply,
          sessionId: result.sessionId,
          model: result.model,
          source: 'local'
        };
      }

      if (result.outcome === 'retry') {
        current = { ...current, fieldMap: result.fieldMap };
        sawBackend = true;
        continue;
      }

      if (result.outcome === 'offline') offline = true;
      else sawBackend = true;
      break;
    }

    // The host stopped answering mid-negotiation; no other path on the same
    // host will fare better, so stop rather than pay another timeout.
    if (offline) break;
  }

  // A cached contract that just stopped working may simply be stale — drop it
  // so the next request re-detects instead of retrying a dead route.
  contract = null;
  noteFailure(config, sawBackend ? 'no usable chat endpoint' : 'not reachable');
  return { ok: false, kind: sawBackend ? 'unusable' : 'offline' };
}

/**
 * Non-LLM status probe for diagnostics. Reports whether the service and its
 * LLM engine are up, without spending a completion. Never throws.
 */
export async function getLocalBrainStatus() {
  const config = getLocalBrainConfig();
  if (!config.enabled) return { enabled: false, reachable: false, url: config.base };

  const cooling = breakerIsOpen(config);
  const health = cooling ? { reachable: false, identified: false } : await checkHealth(config);

  return {
    enabled: true,
    url: config.base,
    reachable: health.reachable,
    identified: health.identified,
    engineReady: health.reachable ? health.engineReady !== false : false,
    cooldown: cooling,
    service: health.detail || null,
    contract: contract ? { path: contract.path, protocol: contract.protocol, source: contract.source } : null
  };
}
