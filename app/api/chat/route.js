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
import { conversationPlan } from '../../../lib/server/planCatalog.mjs';
import { catalogueAnswer, explicitBooking, bookingDisclaimer } from '../../../lib/ai/catalogueAnswer.mjs';
import { gatedListings } from '../../../lib/ai/listingCards.mjs';

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

// Who chose the final answer: the validated model output, the keyword
// matcher that replaced it, or a deterministic fact (greeting, time, weather).
const DECIDERS = new Set(['model', 'lexicon', 'fact']);

function reply(text, { messages = [], latestUserMessage = '', source = null, sessionId = null, locale = 'en', error = false, navigation = null, responsePolicy = null, plan = null, listings = [], handoff = false, action = null, decidedBy = 'lexicon' } = {}) {
  const decider = DECIDERS.has(decidedBy) ? decidedBy : 'lexicon';
  const rows = Array.isArray(listings) ? listings.slice(0, 4) : [];
  // One structured line per turn, metadata only: never the guest's words or the reply.
  console.info(JSON.stringify({ event: 'concierge.chat', decidedBy: decider, source, action, listings: rows.length, handoff: Boolean(handoff), error: Boolean(error), locale }));
  return NextResponse.json({
    reply: text,
    // Navigation is computed locally from keywords, so the guest still gets
    // somewhere to go even when no model answered. The guest's own words
    // lead; the reply only reinforces - and on the degraded path it is a
    // canned line, so it is excluded entirely.
    ...(navigation||conversationNavigation(messages.length?messages:[{role:'user',content:latestUserMessage}],{reply:error?'':text,locale})),
    listings: rows,
    decidedBy: decider,
    ...(action ? { action } : {}),
    ...(responsePolicy?{responsePolicy}:{}),
    ...(plan ? { plan } : {}),
    configured: !error,
    ...(source ? { source } : {}),
    // Handle for the local brain's server-side conversation memory. The
    // client echoes it back on the next turn; without it the service would
    // open a fresh, context-free session per message.
    ...(sessionId ? { sessionId } : {}),
    // A booking or payment request: the client offers the live manager.
    ...(handoff ? { handoff: true } : {}),
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
  if(fact&&!fact.remainingMessage)return reply(fact.reply,{source:fact.source,error:fact.error,locale,
    navigation:{cards:[],suggestions:[]},responsePolicy:CONVERSATION_POLICY,action:'fact',decidedBy:'fact'});

  const modelMessages=fact?[...messages.slice(0,-1),{role:'user',content:fact.remainingMessage}]:messages;
  const plan = conversationPlan(modelMessages, { locale });
  const localAnswer = catalogueAnswer(modelMessages, locale);
  const degraded = localAnswer.matched ? localAnswer.reply : unavailableReply(locale);
  // Booking and payment requests are a handoff whichever engine answers: the
  // disclaimer is guaranteed here, in code, and no catalogue rows are attached.
  const bookingTurn=explicitBooking([...modelMessages].reverse().find(m=>m.role==='user')?.content||'');
  const respond=async(text,options={})=>{
    const handoff=bookingTurn||options.handoff===true;
    let answer=fact?fact.reply+'\n\n'+text:text;
    const disclaimer=bookingDisclaimer(locale);
    if(handoff&&!answer.includes(disclaimer))answer=disclaimer+'\n\n'+answer;
    // Listing rows follow the final decision: a recommend or consult action,
    // and only inside the sections this answer shows.
    const action=handoff?'handoff':options.action;
    const sections=(options.navigation?.cards||[]).map(card=>card.href);
    const query=options.navigation?.query||localAnswer.navigation.query||latestUserMessage;
    const decidedBy=handoff&&!options.handoff?'lexicon':options.decidedBy;
    return reply(answer,{messages:modelMessages,locale,...options,action,decidedBy,
      listings:gatedListings(query,{locale,action,sections}),...(handoff?{handoff:true}:{}),plan:await plan});
  };
  // Degraded turns: the keyword matcher decides.
  const fallback={source:'navigation',error:true,navigation:localAnswer.navigation,action:localAnswer.action,decidedBy:'lexicon'};
  const cloud=await askWorkersBrain({messages,locale,signal:request.signal,request},{messagesForInference:modelMessages});
  if(cloud.ok)return respond(cloud.reply,{source:'workers-ai',navigation:cloud.navigation,responsePolicy:cloud.responsePolicy,handoff:cloud.handoff,action:cloud.action,decidedBy:cloud.decidedBy});
  // A denied/failed metered engine must not start another unmetered engine.
  // The guest still gets the catalogue sentence and the links the keywords found.
  if(cloud.kind!=='disabled')return respond(degraded,fallback);

  // Link 1 - the local brain. Resolves to a plain result object on every path
  // (including "switched off"), so no try/catch is needed here.
  const local = await askLocalBrain({ messages:modelMessages, systemPrompt: SYSTEM_PROMPT+CATALOGUE_PROTOCOL, sessionId, locale,responseProtocol:CATALOGUE_PROTOCOL });
  if (local.ok) {
    const projection=groundedReply(local.reply,{messages:modelMessages,locale});
    if(projection)return respond(projection.reply,{source:'local',sessionId:local.sessionId,navigation:projection.navigation,responsePolicy:projection.responsePolicy,handoff:projection.handoff,action:projection.action,decidedBy:projection.decidedBy});
    return respond(degraded,fallback);
  }

  // Link 2 - the hosted router.
  const routed = await askRouter(modelMessages, locale);
  if (routed) {
    const projection=groundedReply(routed,{messages:modelMessages,locale});
    if(projection)return respond(projection.reply,{source:'router',navigation:projection.navigation,responsePolicy:projection.responsePolicy,handoff:projection.handoff,action:projection.action,decidedBy:projection.decidedBy});
  }

  // Link 3 - graceful degradation. Still a 200 with a well-formed body: the
  // widget renders this like any other answer instead of hitting an error path.
  // A recognised request gets the catalogue sentence and listing links, not
  // the "temporarily unavailable" line.
  return respond(degraded,fallback);
}

// Non-LLM diagnostics: confirms which engines are wired up without spending a
// completion. Handy for checking the local backend from a browser tab.
// Public health check only: the router address, model and local-brain state
// are internal details and stay off the open internet.
export async function GET() {
  return NextResponse.json({ ok: true });
}
