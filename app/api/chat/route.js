import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT, matchSuggestions, matchActionCards } from '../../../lib/aiEcosystemContext';
import { askLocalBrain, getLocalBrainStatus } from '../../../lib/ai/localBrain';
import { languageDirective, normalizeLocale, unavailableReply } from '../../../lib/ai/locale';

// ===========================================================================
// Concierge chat adapter.
//
// A thin adapter over a fallback chain, in order of preference:
//
//   1. the local Gorgona AI Brain (FastAPI + Ollama) — lib/ai/localBrain.js
//   2. the ai-router (OpenAI-compatible) at AI_ROUTER_URL, default :20128
//   3. a polite canned reply
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

// The default only works where the router runs on the same machine (local
// dev). A Cloudflare Worker cannot reach localhost, so production needs
// AI_ROUTER_URL pointing at a reachable router - otherwise every message
// falls through to the canned reply.
const DEFAULT_ROUTER_URL = 'http://localhost:20128/v1/chat/completions';
const routerUrl = () => process.env.AI_ROUTER_URL || DEFAULT_ROUTER_URL;
const routerModel = () => process.env.GEMINI_MODEL || 'gemini-2.0-flash';
// The ai-router owns provider keys and model routing. Its own key check is off
// by default (REQUIRE_API_KEY=false), so the placeholder satisfies it; set
// AI_ROUTER_API_KEY when the router requires a real key.
const routerApiKey = () => process.env.AI_ROUTER_API_KEY || 'sk-local';
// Upstream calls must never hang the request indefinitely - a stalled fetch
// previously left the concierge "thinking" forever with no way for the
// client's own request to resolve. 20s comfortably covers normal latency.
const ROUTER_TIMEOUT_MS = 20_000;

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 4000;

// Keeps only well-formed user/assistant turns. Anything else in the body
// (nulls, objects as content, unknown roles) is dropped before it can reach
// an engine or the suggestion matcher.
function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m) =>
        m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
}

// GET /api/chat reports engine URLs and service details. That is useful while
// wiring things up and an information leak on the public site, so production
// answers with the bare status unless GORGONA_AI_DIAGNOSTICS is switched on.
function diagnosticsEnabled() {
  if (process.env.NODE_ENV !== 'production') return true;
  return ['on', '1', 'true', 'yes'].includes(String(process.env.GORGONA_AI_DIAGNOSTICS || '').trim().toLowerCase());
}


// A router that is simply not running is an expected state (it is a separate
// process), not a per-request incident. Collapse repeats so the server log
// stays readable instead of one stack per message.
const ROUTER_LOG_INTERVAL_MS = 30_000;
let routerLoggedAt = 0;

function logRouterIssue(...args) {
  const now = Date.now();
  if (now - routerLoggedAt < ROUTER_LOG_INTERVAL_MS) return;
  routerLoggedAt = now;
  console.error('AI router:', ...args);
}

function reply(text, { latestUserMessage = '', source = null, sessionId = null, locale = 'en', error = false } = {}) {
  return NextResponse.json({
    reply: text,
    // Navigation is computed locally from keywords, so the guest still gets
    // somewhere to go even when no model answered. The guest's own words
    // lead; the reply only reinforces - and on the degraded path it is a
    // canned line, so it is excluded entirely.
    suggestions: matchSuggestions(latestUserMessage, { reply: error ? '' : text, locale }),
    cards: matchActionCards(latestUserMessage, { reply: error ? '' : text, locale }),
    configured: true,
    ...(source ? { source } : {}),
    // Handle for the local brain's server-side conversation memory. The
    // client echoes it back on the next turn; without it the service would
    // open a fresh, context-free session per message.
    ...(sessionId ? { sessionId } : {}),
    ...(error ? { error: true } : {})
  });
}

// --- Link 2: the hosted ai-router -----------------------------------------

// Returns the reply text, or null when the router cannot answer. Never throws.
async function askRouter(messages, locale) {
  const openaiMessages = [
    // The router path owns its system prompt, so the language instruction
    // goes where it belongs: appended to the persona.
    { role: 'system', content: `${SYSTEM_PROMPT}${languageDirective(locale)}` },
    ...messages
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTER_TIMEOUT_MS);

  try {
    const response = await fetch(routerUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${routerApiKey()}`
      },
      body: JSON.stringify({
        model: routerModel(),
        messages: openaiMessages,
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
      logRouterIssue(response.status, (await response.text()).slice(0, 500));
      return null;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    if (error?.name === 'AbortError') {
      logRouterIssue('request timed out after', ROUTER_TIMEOUT_MS, 'ms');
    } else {
      logRouterIssue('unreachable —', error?.message || error);
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
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const messages = sanitizeMessages(body?.messages);
  const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  if (!latestUserMessage) {
    return NextResponse.json({ error: 'No message provided.' }, { status: 400 });
  }

  // Opaque to us: minted by the local brain, echoed back by the client.
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 120) : undefined;
  // The language showing in the global switcher. Every engine below is told
  // to answer in it, and the degraded path speaks it too.
  const locale = normalizeLocale(body?.locale);

  // Link 1 - the local brain. Resolves to a plain result object on every path
  // (including "switched off"), so no try/catch is needed here.
  const local = await askLocalBrain({ messages, systemPrompt: SYSTEM_PROMPT, sessionId, locale });
  if (local.ok) {
    return reply(local.reply, { latestUserMessage, source: 'local', sessionId: local.sessionId, locale });
  }

  // Link 2 - the hosted router.
  const routed = await askRouter(messages, locale);
  if (routed) {
    return reply(routed, { latestUserMessage, source: 'router', locale });
  }

  // Link 3 - graceful degradation. Still a 200 with a well-formed body: the
  // widget renders this like any other answer instead of hitting an error path.
  return reply(unavailableReply(locale), { latestUserMessage, locale, error: true });
}

// Non-LLM diagnostics: confirms which engines are wired up without spending a
// completion. Handy for checking the local backend from a browser tab.
export async function GET() {
  if (!diagnosticsEnabled()) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({
    ok: true,
    local: await getLocalBrainStatus(),
    router: { url: routerUrl(), model: routerModel() }
  });
}
