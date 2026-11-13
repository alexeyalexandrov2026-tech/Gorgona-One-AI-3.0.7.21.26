import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '../../../lib/aiEcosystemContext';
import { askLocalBrain } from '../../../lib/ai/localBrain';
import { languageDirective, normalizeLocale, unavailableReply } from '../../../lib/ai/locale';
import {readChatRequest,validateChatTransport,ChatInputError} from '../../../lib/ai/chatRequest.mjs';
import {conversationNavigation} from '../../../lib/ai/conversation.mjs';
import {askWorkersBrain} from '../../../lib/ai/workersBrain.mjs';
import {groundedReply,CATALOGUE_PROTOCOL} from '../../../lib/ai/groundedReply.mjs';
import {answerConciergeFact} from '../../../lib/ai/conciergeFacts.mjs';
import {CONVERSATION_POLICY} from '../../../lib/ai/conciergeReply.mjs';

// ===========================================================================
// Concierge chat adapter.
//
// A thin adapter over a fallback chain, in order of preference:
//
//   0. local greetings, Miami time and current weather
//   1. native Workers AI, opt-in with durable usage limits
//   2. the local Miami Elio AI Brain (FastAPI + Ollama) — lib/ai/localBrain.js
//   3. the hosted ai-router on :20128 (OpenAI-compatible)
//   4. a localized unavailable reply
//
// The contract this route returns NEVER changes shape and the status is
// ALWAYS 200 for a well-formed request, whatever happens upstream. A degraded
// answer is explicitly labelled error:true/configured:false, with locally
// computed navigation buttons still available. Invalid requests return 400/413.
// ===========================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROUTER_URL = 'http://localhost:20128/v1/chat/completions';
const ROUTER_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
// Upstream calls must never hang the request indefinitely - a stalled fetch
// previously left the concierge "thinking" forever with no way for the
// client's own request to resolve. 20s comfortably covers normal latency.
const ROUTER_TIMEOUT_MS = 20_000;


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

function reply(text, { messages = [], latestUserMessage = '', source = null, sessionId = null, locale = 'en', error = false, navigation = null, responsePolicy = null } = {}) {
  return NextResponse.json({
    reply: text,
    // Navigation is computed locally from keywords, so the guest still gets
    // somewhere to go even when no model answered. The guest's own words
    // lead; the reply only reinforces - and on the degraded path it is a
    // canned line, so it is excluded entirely.
    ...(navigation||conversationNavigation(messages.length?messages:[{role:'user',content:latestUserMessage}],{reply:error?'':text,locale})),
    ...(responsePolicy?{responsePolicy}:{}),
    configured: !error,
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
    { role: 'system', content: `${SYSTEM_PROMPT}${languageDirective(locale)}${CATALOGUE_PROTOCOL}` },
    ...messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTER_TIMEOUT_MS);

  try {
    const response = await fetch(ROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The ai-router owns API keys and model routing; the placeholder just
        // satisfies its auth header check.
        Authorization: 'Bearer sk-local'
      },
      body: JSON.stringify({
        model: ROUTER_MODEL,
        messages: openaiMessages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 480
      }),
      cache: 'no-store',
      signal: controller.signal
    });

    if (!response.ok) {
      // Provider bodies may echo customer input or credentials. Log metadata only.
      logRouterIssue('provider status',response.status);
      await response.body?.cancel().catch(()=>{});
      return null;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    if (error?.name === 'AbortError') {
      logRouterIssue('request timed out after', ROUTER_TIMEOUT_MS, 'ms');
    } else {
      logRouterIssue('unreachable');
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
    validateChatTransport(request);
    body = await readChatRequest(request);
  } catch(error) {
    return NextResponse.json({ error: error instanceof ChatInputError?error.message:'Invalid chat request.' }, { status: error instanceof ChatInputError?error.status:400 });
  }

  const messages = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
  if (!messages.length) {
    return NextResponse.json({ error: 'No message provided.' }, { status: 400 });
  }

  const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  // Opaque to us: minted by the local brain, echoed back by the client.
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 120) : undefined;
  // The language showing in the global switcher. Every engine below is told
  // to answer in it, and the degraded path speaks it too.
  const locale = normalizeLocale(body?.locale);

  const fact=await answerConciergeFact(latestUserMessage,locale,request.signal);
  if(fact)return reply(fact.reply,{source:fact.source,error:fact.error,locale,
    navigation:{cards:[],suggestions:[]},responsePolicy:CONVERSATION_POLICY});

  const cloud=await askWorkersBrain({messages,locale,signal:request.signal,request});
  if(cloud.ok)return reply(cloud.reply,{messages,latestUserMessage,source:'workers-ai',locale,navigation:cloud.navigation,responsePolicy:cloud.responsePolicy});
  // A denied/failed metered engine must not start another unmetered engine.
  if(cloud.kind!=='disabled')return reply(unavailableReply(locale),{messages,latestUserMessage,locale,source:'navigation',error:true});

  // Link 1 - the local brain. Resolves to a plain result object on every path
  // (including "switched off"), so no try/catch is needed here.
  const local = await askLocalBrain({ messages, systemPrompt: SYSTEM_PROMPT+CATALOGUE_PROTOCOL, sessionId, locale,responseProtocol:CATALOGUE_PROTOCOL });
  if (local.ok) {
    const projection=groundedReply(local.reply,{messages,locale});
    if(projection)return reply(projection.reply, { messages, latestUserMessage, source: 'local', sessionId: local.sessionId, locale,navigation:projection.navigation,responsePolicy:projection.responsePolicy });
    return reply(unavailableReply(locale),{messages,latestUserMessage,locale,source:'navigation',error:true});
  }

  // Link 2 - the hosted router.
  const routed = await askRouter(messages, locale);
  if (routed) {
    const projection=groundedReply(routed,{messages,locale});
    if(projection)return reply(projection.reply, { messages, latestUserMessage, source: 'router', locale,navigation:projection.navigation,responsePolicy:projection.responsePolicy });
  }

  // Link 3 - graceful degradation. Still a 200 with a well-formed body: the
  // widget renders this like any other answer instead of hitting an error path.
  return reply(unavailableReply(locale), { messages, latestUserMessage, locale, source:'navigation', error: true });
}

// Non-LLM diagnostics: confirms which engines are wired up without spending a
// completion. Handy for checking the local backend from a browser tab.
// Public health check only: the router address, model and local-brain state
// are internal details and stay off the open internet.
export async function GET() {
  return NextResponse.json({ ok: true });
}
