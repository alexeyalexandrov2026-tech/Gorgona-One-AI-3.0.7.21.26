// ===========================================================================
// Gorgona One — the authoritative AI brain (server-only).
//
// Every LLM request in the platform resolves through this module. HTTP routes
// (app/api/chat) are thin adapters: they validate input, localize output, and
// call askBrain() / askBrainStream(). New AI modules MUST call the brain
// rather than talking to a provider directly, so the whole ecosystem inherits
// one model policy, one retry/fallback strategy, one configuration surface:
//
//   User -> Concierge UI -> /api/chat -> askBrain[Stream]() -> OpenRouter
//        -> openrouter/free -> reply -> User
//
// Feature flags (all env-driven, all safe-off; the platform never depends on
// any of them being available):
//   AI_STREAMING  'on' (default) | 'off'   - SSE token streaming to clients.
//   AI_TOOLS      'off' (default) | 'on'   - search_listings tool-calling
//                 (reliable on paid chains; free-pool models rarely call
//                 tools, so it stays opt-in).
//   OPENROUTER_*  model chain / providers / web search (see getBrainConfig).
//
// Reply-integrity guards (degenerate-completion + PII-redaction scan with
// buffered retries) apply on EVERY path. In streaming mode, forwarded tokens
// that later fail the scan are retracted via onRetract() and the buffered
// retry path produces the clean reply - guests never keep corrupted text.
// ===========================================================================

import { searchListings } from '../data/listings';

const OPENROUTER_URL = 'http://localhost:20128/v1/chat/completions';

const csv = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

let cachedConfig = null;

export function getBrainConfig() {
  if (cachedConfig) return cachedConfig;

  const primary = process.env.OPENROUTER_MODEL || 'openrouter/free';
  // Default: no external fallbacks. `openrouter/free` already routes across
  // the whole free pool internally; appending paid models here would create
  // dead routes on an uncredited account (each one 402s before giving up).
  const fallbacks = csv(process.env.OPENROUTER_FALLBACK_MODELS);

  const webSearch = ['native', 'exa'].includes(process.env.OPENROUTER_WEB_SEARCH)
    ? process.env.OPENROUTER_WEB_SEARCH
    : 'off';

  // Optional provider allowlist (csv of OpenRouter provider slugs). Unset by
  // default: the free pool needs provider breadth to route at all. For a paid
  // first-party chain set 'anthropic,openai,google-ai-studio,google-vertex'.
  const providerOnly = csv(process.env.OPENROUTER_PROVIDER_ONLY);

  // Providers excluded from routing. Novita and Poolside PII-redact prompt
  // content ("Miami Beach Villa" arrived as "[ADDRESS] Villa"), corrupting
  // concierge answers. Override (or clear) via OPENROUTER_PROVIDER_IGNORE.
  const providerIgnore = csv(process.env.OPENROUTER_PROVIDER_IGNORE ?? 'novita,poolside');

  const streaming = !['off', '0', 'false'].includes(String(process.env.AI_STREAMING || '').toLowerCase());
  const tools = ['on', '1', 'true'].includes(String(process.env.AI_TOOLS || '').toLowerCase());

  cachedConfig = {
    models: [primary, ...fallbacks],
    webSearch,
    providerOnly,
    providerIgnore,
    streaming,
    tools,
    timeoutMs: 30_000,
    streamTimeoutMs: 45_000,
    maxAttempts: 4, // free pool: 429s, empty/degenerate and PII-redacted replies are all transient per-model
    retryDelayMs: 900,
    maxToolRounds: 2,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 600
  };
  return cachedConfig;
}

export function isStreamingEnabled() {
  return getBrainConfig().streaming;
}

function buildRequestBody(config, messages, systemPrompt, extra = {}) {
  const body = {
    models: config.models,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: config.temperature,
    top_p: config.topP,
    max_tokens: config.maxTokens,
    ...extra
  };
  if (config.webSearch !== 'off') {
    body.plugins = [{ id: 'web', engine: config.webSearch, max_results: 5 }];
  }
  if (config.providerOnly.length || config.providerIgnore.length) {
    body.provider = {};
    if (config.providerOnly.length) body.provider.only = config.providerOnly;
    if (config.providerIgnore.length) body.provider.ignore = config.providerIgnore;
  }
  return body;
}

// --- Reply-integrity guards ------------------------------------------------

// PII-redaction markers leaking into text: several free-pool resellers
// sanitize prompts and the model echoes "[ADDRESS]"-style placeholders where
// venue names belong. Compound variants seen live: [PERSON_NAME]. Checked
// incrementally during streaming and on every final reply.
const PII_MARKER = /\[(?:[A-Z]{2,}_)*(?:ADDRESS|LOCATION|EMAIL|PHONE|NAME|PERSON|CITY)(?:_[A-Z]{2,})*\]/;

function containsForbidden(text) {
  return PII_MARKER.test(text) || /^user safety\s*:/i.test(text.trim());
}

// The free auto-router occasionally hands a request to a non-conversational
// specialty model (observed live: a content-safety classifier answering a
// villa question with "User Safety: safe"). Patterns stay narrow - false
// positives would discard good replies.
function looksDegenerate(reply) {
  const r = reply.trim();
  if (r.length < 3) return true;
  if (/^(safe|unsafe|harmful|harmless)[.!\s]*$/i.test(r)) return true;
  return containsForbidden(r);
}

// --- Transport -------------------------------------------------------------

function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    // Attribution headers per OpenRouter docs (used for app rankings).
    'HTTP-Referer': 'https://gorgona-one.com',
    'X-Title': 'GORGONA ONE'
  };
}

async function callOnce(apiKey, body, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

// --- Tool-calling (AI_TOOLS=on) -------------------------------------------

// One tool, backed by the same Postgres engine as the site search - AI
// answers and search share a single source of truth (docs/ARCHITECTURE.md).
const SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'search_listings',
    description:
      "Search GORGONA ONE's live inventory: yachts, car rentals, vacation rentals (villas), and dining & nightlife venues. Use whenever the guest asks about specific listings, prices, capacities, or locations.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text search terms' },
        world: {
          type: 'string',
          enum: ['yachts', 'car-rentals', 'vacation-rentals', 'dining-nightlife'],
          description: 'Optional: restrict to one world'
        },
        limit: { type: 'integer', minimum: 1, maximum: 10 }
      },
      required: ['query']
    }
  }
};

async function executeSearchTool(rawArgs) {
  let args = {};
  try {
    args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs || {};
  } catch {
    /* malformed args -> empty search below returns [] */
  }
  try {
    const results = await searchListings(args.query, { limit: args.limit || 6, world: args.world });
    console.log('AI brain: search tool executed', JSON.stringify({ query: args.query, world: args.world || null, hits: results.length }));
    // Compact projection keeps tool payloads small for limited models.
    return results.map((r) => ({
      title: r.title,
      world: r.world,
      location: r.location,
      price: r.price,
      href: r.href,
      description: (r.description || '').slice(0, 140)
    }));
  } catch (error) {
    console.error('AI brain: search tool failed', error?.name || error);
    return [];
  }
}

// Buffered tool-resolution phase. Returns augmented messages for the final
// answer turn, or a direct clean answer if the model finished without tools.
// Any failure degrades to tool-less messages - tools may never break a chat.
async function resolveToolCalls(apiKey, config, messages, systemPrompt) {
  let working = [...messages];
  for (let round = 0; round < config.maxToolRounds; round += 1) {
    let data;
    try {
      const response = await callOnce(
        apiKey,
        buildRequestBody(config, working, systemPrompt, { tools: [SEARCH_TOOL], tool_choice: 'auto' }),
        config.timeoutMs
      );
      if (!response.ok) {
        console.error('AI brain: tool round error', response.status, (await response.text()).slice(0, 300));
        return { messages, direct: null };
      }
      data = await response.json();
    } catch (error) {
      console.error('AI brain: tool round failed', error?.name || error);
      return { messages, direct: null };
    }

    const choice = data?.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;
    if (!toolCalls?.length) {
      const reply = choice?.message?.content?.trim();
      if (reply && !looksDegenerate(reply)) {
        return {
          messages: working,
          direct: { ok: true, reply, model: data?.model || config.models[0], provider: data?.provider || null }
        };
      }
      return { messages: working === messages ? messages : working, direct: null };
    }

    working = [...working, { role: 'assistant', content: choice.message.content || '', tool_calls: toolCalls }];
    for (const call of toolCalls) {
      const results =
        call?.function?.name === 'search_listings' ? await executeSearchTool(call.function.arguments) : [];
      working.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(results) });
    }
  }
  return { messages: working, direct: null };
}

// --- Buffered ask ----------------------------------------------------------

/**
 * Buffered entry point: full reply-integrity guards + retries.
 *
 * @returns {Promise<
 *   | { ok: true, reply: string, model: string, provider: (string|null) }
 *   | { ok: false, kind: 'unconfigured'|'auth'|'credits'|'rate_limited'|'unavailable', status: number }
 * >}
 */
export async function askBrain({ messages, systemPrompt }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { ok: false, kind: 'unconfigured', status: 0 };

  const config = getBrainConfig();
  let workingMessages = messages;
  if (config.tools) {
    const resolved = await resolveToolCalls(apiKey, config, messages, systemPrompt);
    if (resolved.direct) return resolved.direct;
    workingMessages = resolved.messages;
  }
  return buffered(apiKey, config, workingMessages, systemPrompt);
}

async function buffered(apiKey, config, messages, systemPrompt) {
  const body = buildRequestBody(config, messages, systemPrompt);

  let lastStatus = 0;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    try {
      const response = await callOnce(apiKey, body, config.timeoutMs);

      if (response.ok) {
        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply && !looksDegenerate(reply)) {
          return { ok: true, reply, model: data?.model || config.models[0], provider: data?.provider || null };
        }
        lastStatus = 200;
        console.error('AI brain: unusable completion from', data?.model, JSON.stringify((reply || '').slice(0, 80)));
      } else {
        lastStatus = response.status;
        // Log status + upstream error body only - never the payload or key.
        console.error('AI brain: OpenRouter error', response.status, (await response.text()).slice(0, 500));
        if (response.status === 401 || response.status === 403) {
          return { ok: false, kind: 'auth', status: response.status };
        }
        if (response.status === 402) {
          return { ok: false, kind: 'credits', status: 402 };
        }
      }
    } catch (error) {
      lastStatus = 0;
      if (error?.name === 'AbortError') {
        console.error('AI brain: request timed out after', config.timeoutMs, 'ms (attempt', attempt, ')');
      } else {
        console.error('AI brain: request failed', error);
      }
    }

    if (attempt < config.maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, config.retryDelayMs * attempt));
    }
  }

  return { ok: false, kind: lastStatus === 429 ? 'rate_limited' : 'unavailable', status: lastStatus };
}

// --- Streaming ask ---------------------------------------------------------

/**
 * Streaming entry point (AI_STREAMING=on). Forwards token deltas via
 * onDelta(text); if the accumulated reply trips an integrity guard, calls
 * onRetract() and transparently falls back to the buffered path, so the
 * caller ALWAYS ends with the same result contract as askBrain().
 */
export async function askBrainStream({ messages, systemPrompt, onDelta, onRetract }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { ok: false, kind: 'unconfigured', status: 0 };

  const config = getBrainConfig();
  let workingMessages = messages;
  if (config.tools) {
    const resolved = await resolveToolCalls(apiKey, config, messages, systemPrompt);
    if (resolved.direct) {
      // Deliver the already-clean direct answer as one delta so streaming
      // consumers keep a single code path.
      onDelta?.(resolved.direct.reply);
      return resolved.direct;
    }
    workingMessages = resolved.messages;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.streamTimeoutMs);
  let sentAny = false;

  const fallback = async () => {
    if (sentAny) onRetract?.();
    return buffered(apiKey, config, workingMessages, systemPrompt);
  };

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify(buildRequestBody(config, workingMessages, systemPrompt, { stream: true })),
      cache: 'no-store',
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      console.error('AI brain: stream open failed', response.status, (await response.text()).slice(0, 300));
      if (response.status === 401 || response.status === 403) return { ok: false, kind: 'auth', status: response.status };
      if (response.status === 402) return { ok: false, kind: 'credits', status: 402 };
      return fallback();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let model = null;
    let provider = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') continue;
        let chunk;
        try {
          chunk = JSON.parse(payload);
        } catch {
          continue;
        }
        model = model || chunk?.model;
        provider = provider || chunk?.provider;
        const delta = chunk?.choices?.[0]?.delta?.content;
        if (!delta) continue;
        accumulated += delta;
        // Incremental guard: stop forwarding the moment corruption appears.
        if (containsForbidden(accumulated)) {
          controller.abort();
          console.error('AI brain: stream tripped integrity guard from', model);
          return fallback();
        }
        sentAny = true;
        onDelta?.(delta);
      }
    }

    const reply = accumulated.trim();
    if (reply && !looksDegenerate(reply)) {
      return { ok: true, reply, model: model || config.models[0], provider: provider || null };
    }
    console.error('AI brain: stream produced unusable completion from', model);
    return fallback();
  } catch (error) {
    if (error?.name !== 'AbortError') console.error('AI brain: stream failed', error);
    return fallback();
  } finally {
    clearTimeout(timeout);
  }
}
