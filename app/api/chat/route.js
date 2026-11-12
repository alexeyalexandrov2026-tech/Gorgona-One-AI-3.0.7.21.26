import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { SYSTEM_PROMPT, matchSuggestions, matchActionCards } from '../../../lib/aiEcosystemContext';
import { getEcosystemDigest } from '../../../lib/aiEcosystemDigest';
import { askLocalBrain, getLocalBrainConfig } from '../../../lib/ai/localBrain';
import { askWorkersAi } from '../../../lib/ai/workersAi.mjs';
import { fallbackReply, languageDirective, normalizeLocale } from '../../../lib/ai/locale';
import {
  MAX_BODY_BYTES,
  cleanReply,
  clientAddress,
  createRateLimiter,
  isLoopbackUrl,
  isUsableReply,
  latestUserText,
  sanitizeMessages
} from '../../../lib/ai/chatCore.mjs';

// ===========================================================================
// Concierge chat adapter.
//
// A thin adapter over a fallback chain, in order of preference:
//
//   1. Cloudflare Workers AI, through the `AI` binding   — lib/ai/workersAi.mjs
//      (the engine on production; absent off Cloudflare)
//   2. the local Miami Elio AI Brain (FastAPI + Ollama)  — lib/ai/localBrain.js
//   3. the ai-router (OpenAI-compatible), AI_ROUTER_URL
//   4. the concierge's own line plus navigation cards
//
// Links 2 and 3 default to localhost, which is where they live in development.
// A Cloudflare Worker cannot reach localhost, so on production they are skipped
// unless they are pointed at a public address.
//
// The contract this route returns NEVER changes shape and the status is
// ALWAYS 200 for a well-formed request, whatever happens upstream. That is
// what lets the chat widget stay a pure presentation layer: it renders
// `reply` and `suggestions` and has no failure branch to style. Swapping,
// disabling, or breaking a backend changes which engine answers — never the
// page.
// ===========================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_ROUTER_URL = 'http://localhost:20128/v1/chat/completions';
// Upstream calls must never hang the request indefinitely - a stalled fetch
// previously left the concierge "thinking" forever with no way for the
// client's own request to resolve. 20s comfortably covers normal latency.
const ROUTER_TIMEOUT_MS = 20_000;
// The inventory digest reads the listings repository, which may be waiting on
// the database. The model can answer without it; the guest should not wait.
const DIGEST_TIMEOUT_MS = 3_000;

const allowRequest = createRateLimiter({ limit: 20, windowMs: 60_000 });

// An engine that is simply not running is an expected state, not a per-request
// incident. Collapse repeats so the server log stays readable instead of one
// line per message.
const LOG_INTERVAL_MS = 30_000;
const loggedAt = new Map();

function logIssue(engine, ...args) {
  const now = Date.now();
  if (now - (loggedAt.get(engine) || 0) < LOG_INTERVAL_MS) return;
  loggedAt.set(engine, now);
  console.error(`AI ${engine}:`, ...args);
}

// The Worker's bindings, or null when this is not running on Cloudflare
// (`next dev`, `next start`, the CI build). Sync mode on purpose: the async
// mode would start a local Workers runtime to find them.
function cloudflareEnv() {
  try {
    return getCloudflareContext().env || null;
  } catch {
    return null;
  }
}

function reply(text, { latestUserMessage = '', source = null, sessionId = null, locale = 'en' } = {}) {
  return NextResponse.json({
    reply: text,
    // Navigation is computed locally from keywords, so the guest still gets
    // somewhere to go even when no model answered. The guest's own words
    // lead; the reply only reinforces.
    suggestions: matchSuggestions(latestUserMessage, { reply: text, locale }),
    cards: matchActionCards(latestUserMessage, { reply: text, locale }),
    configured: true,
    ...(source ? { source } : {}),
    // Handle for the local brain's server-side conversation memory. The
    // client echoes it back on the next turn; without it the service would
    // open a fresh, context-free session per message.
    ...(sessionId ? { sessionId } : {})
  });
}

// No model answered (or the guest is over the rate limit). Still a 200 with a
// well-formed body: the widget renders this like any other answer. The cards
// come from the guest's words alone - the line below is ours, not a model's.
function degraded({ latestUserMessage, locale }) {
  const cards = matchActionCards(latestUserMessage, { locale });
  return NextResponse.json({
    reply: fallbackReply(locale, cards.length > 0),
    suggestions: matchSuggestions(latestUserMessage, { locale }),
    cards,
    configured: true,
    error: true
  });
}

// Persona + what is actually in the inventory + the language to answer in.
async function buildSystemPrompt(locale) {
  let timer;
  const digest = await Promise.race([
    getEcosystemDigest().catch(() => ''),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(''), DIGEST_TIMEOUT_MS);
    })
  ]);
  clearTimeout(timer);
  return `${SYSTEM_PROMPT}${digest}${languageDirective(locale)}`;
}

// --- The ai-router ---------------------------------------------------------

// Returns the reply text, or null when the router cannot answer. Never throws.
async function askRouter(url, messages, systemPrompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTER_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The ai-router owns provider keys and model routing; its own key
        // defaults to the placeholder a local instance accepts.
        Authorization: `Bearer ${process.env.AI_ROUTER_API_KEY || 'sk-local'}`
      },
      body: JSON.stringify({
        model: process.env.AI_ROUTER_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 480
      }),
      cache: 'no-store',
      signal: controller.signal
    });

    if (!response.ok) {
      // Log only the status and upstream error body server-side for debugging -
      // never the request payload or the API key - and never forward either to
      // the client.
      logIssue('router', response.status, (await response.text()).slice(0, 500));
      return null;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    if (error?.name === 'AbortError') {
      logIssue('router', 'request timed out after', ROUTER_TIMEOUT_MS, 'ms');
    } else {
      logIssue('router', 'unreachable —', error?.message || error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Route handlers --------------------------------------------------------

export async function POST(request) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Untrusted input: only real user/assistant text survives, ending on the
  // guest's own turn.
  const messages = sanitizeMessages(body?.messages);
  if (!messages.length) {
    return NextResponse.json({ error: 'No message provided.' }, { status: 400 });
  }

  const latestUserMessage = latestUserText(messages);
  // Opaque to us: minted by the local brain, echoed back by the client.
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 120) : undefined;
  // The language showing in the global switcher. Every engine below is told
  // to answer in it, and the degraded path speaks it too.
  const locale = normalizeLocale(body?.locale);

  // One guest must not be able to spend everyone's model allowance.
  if (!allowRequest(clientAddress(request.headers))) {
    return degraded({ latestUserMessage, locale });
  }

  const cloudflare = cloudflareEnv();
  const systemPrompt = await buildSystemPrompt(locale);

  // A model's text is shown verbatim, so it is tidied and sanity-checked
  // before it counts as an answer; a reply that fails falls to the next link.
  const usable = (text) => {
    const cleaned = cleanReply(text);
    return isUsableReply(cleaned) ? cleaned : null;
  };

  // Link 1 - Workers AI. The binding exists only on Cloudflare.
  if (cloudflare?.AI) {
    const hosted = await askWorkersAi({
      binding: cloudflare.AI,
      messages,
      systemPrompt,
      model: process.env.WORKERS_AI_MODEL
    });
    const text = hosted.ok ? usable(hosted.reply) : null;
    if (text) return reply(text, { latestUserMessage, source: 'workers-ai', locale });
    logIssue('workers-ai', hosted.ok ? 'unusable completion' : hosted.kind, hosted.detail || '');
  }

  // Link 2 - the local brain. Resolves to a plain result object on every path
  // (including "switched off"), so no try/catch is needed here.
  if (!(cloudflare && isLoopbackUrl(getLocalBrainConfig().base))) {
    const local = await askLocalBrain({ messages, systemPrompt, sessionId, locale });
    const text = local.ok ? usable(local.reply) : null;
    if (text) return reply(text, { latestUserMessage, source: 'local', sessionId: local.sessionId, locale });
  }

  // Link 3 - the ai-router.
  const routerUrl = process.env.AI_ROUTER_URL || DEFAULT_ROUTER_URL;
  if (!(cloudflare && isLoopbackUrl(routerUrl))) {
    const text = usable(await askRouter(routerUrl, messages, systemPrompt));
    if (text) return reply(text, { latestUserMessage, source: 'router', locale });
  }

  // Link 4 - the concierge's own line and the cards.
  return degraded({ latestUserMessage, locale });
}

// Public health check only: the engine addresses, model and local-brain state
// are internal details and stay off the open internet.
export async function GET() {
  return NextResponse.json({ ok: true });
}
