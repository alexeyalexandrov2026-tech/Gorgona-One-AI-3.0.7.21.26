import { NextResponse } from 'next/server';
import { normalizeLocale, unavailableReply } from '../../../lib/ai/locale';
import {readChatRequest,validateChatTransport,ChatInputError} from '../../../lib/ai/chatRequest.mjs';
import {conversationNavigation} from '../../../lib/ai/conversation.mjs';
import {askWorkersBrain} from '../../../lib/ai/workersBrain.mjs';
import {answerConciergeFact} from '../../../lib/ai/conciergeFacts.mjs';
import {CONVERSATION_POLICY} from '../../../lib/ai/conciergeReply.mjs';
import { conversationPlan } from '../../../lib/server/planCatalog.mjs';
import { catalogueAnswer, explicitBooking, bookingDisclaimer } from '../../../lib/ai/catalogueAnswer.mjs';
import { gatedListings } from '../../../lib/ai/listingCards.mjs';
import { SERVER_BUDGET_MS } from '../../../lib/ai/chatDeadline.mjs';

// ===========================================================================
// Concierge chat adapter.
//
// One explicit chain, in order:
//
//   1. deterministic facts: greetings, Miami time and NWS weather
//      (lib/ai/conciergeFacts.mjs)
//   2. native Workers AI, opt-in with durable usage limits
//      (lib/ai/workersBrain.mjs)
//   3. the deterministic authored fallback: the catalogue sentence and the
//      links the keywords found, or the localized unavailable line
//      (lib/ai/catalogueAnswer.mjs)
//
// There is no other engine: a disabled, denied or failed Workers AI call goes
// straight to step 3 and never starts a second model.
//
// The contract this route returns NEVER changes shape and the status is
// ALWAYS 200 for a well-formed request, whatever happens upstream. A degraded
// answer is explicitly labelled error:true/configured:false, with locally
// computed navigation buttons still available. Invalid requests return 400/413.
// ===========================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Who chose the final answer: the validated model output, the keyword
// matcher that replaced it, or a deterministic fact (greeting, time, weather).
const DECIDERS = new Set(['model', 'lexicon', 'fact']);

function reply(text, { messages = [], latestUserMessage = '', source = null, locale = 'en', error = false, navigation = null, responsePolicy = null, plan = null, listings = [], handoff = false, action = null, decidedBy = 'lexicon' } = {}) {
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
    // A booking or payment request: the client offers the live manager.
    ...(handoff ? { handoff: true } : {}),
    ...(error ? { error: true } : {})
  });
}

// --- Route handlers --------------------------------------------------------

export async function POST(request) {
  const started = Date.now();
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
  // The language showing in the global switcher. Workers AI is told to
  // answer in it, and the fallback speaks it too.
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

  // Disabled, denied or failed: graceful degradation, never a second engine.
  // Still a 200 with a well-formed body: the widget renders this like any
  // other answer instead of hitting an error path. A recognised request gets
  // the catalogue sentence and listing links, not the "temporarily
  // unavailable" line.
  return respond(degraded,fallback);
}

// Public health check only: engine configuration is an internal detail and
// stays off the open internet.
export async function GET() {
  return NextResponse.json({ ok: true });
}
