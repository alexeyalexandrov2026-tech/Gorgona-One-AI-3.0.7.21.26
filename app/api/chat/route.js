import { NextResponse } from 'next/server';
import { normalizeLocale, unavailableReply } from '../../../lib/ai/locale';
import {readChatRequest,validateChatTransport,ChatInputError} from '../../../lib/ai/chatRequest.mjs';
import {conversationNavigation} from '../../../lib/ai/conversation.mjs';
import {askWorkersBrain} from '../../../lib/ai/workersBrain.mjs';
import {answerConciergeFact} from '../../../lib/ai/conciergeFacts.mjs';
import {CONVERSATION_POLICY} from '../../../lib/ai/conciergeReply.mjs';
import { conversationPlan } from '../../../lib/server/planCatalog.mjs';
import { catalogueAnswer, explicitBooking, bookingDisclaimer } from '../../../lib/ai/catalogueAnswer.mjs';
import { gatedListings, namedVenueCards } from '../../../lib/ai/listingCards.mjs';
import { getDynamicEntities, peekDynamicEntities } from '../../../lib/server/conciergeIndex.mjs';
import { getLiveEventEntities, peekLiveEventEntities } from '../../../lib/server/conciergeEvents.mjs';
import { extractTripProfile } from '../../../lib/ai/tripProfile.mjs';
import { resolvePageEntity } from '../../../lib/ai/factPack.mjs';
import { getMiamiForecast, peekMiamiForecast, shouldFetchForecast } from '../../../lib/ai/miamiForecast.mjs';
import { recordChatTurn, recordReferralClick } from '../../../lib/server/conciergeTelemetry.mjs';
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

// What happened to the model call: 'ok', or why it gave no answer
// (disabled, unavailable, usage_denied, timeout, cancelled, invalid_input, invalid_reply).
const ENGINE_STATES = new Set(['ok', 'disabled', 'unavailable', 'usage_denied', 'timeout', 'cancelled', 'invalid_input', 'invalid_reply']);

function reply(text, { messages = [], latestUserMessage = '', source = null, locale = 'en', error = false, navigation = null, responsePolicy = null, plan = null, listings = [], handoff = false, action = null, decidedBy = 'lexicon', engine = null, started = null } = {}) {
  const decider = DECIDERS.has(decidedBy) ? decidedBy : 'lexicon';
  const rows = Array.isArray(listings) ? listings.slice(0, 4) : [];
  const referrals = [...new Set(rows.map((r) => r?.booking?.platform).filter(Boolean))];
  const elapsedMs = Number.isFinite(started) ? Date.now() - started : null;
  recordChatTurn({ decidedBy: decider, action, locale, referrals, handoff: Boolean(handoff), error: Boolean(error), ms: elapsedMs });
  // One structured line per turn, metadata only: never the guest's words or the reply.
  // engine says why a model did not answer; ms is the whole server turn.
  console.info(JSON.stringify({ event: 'concierge.chat', decidedBy: decider, source, action, listings: rows.length, ...(referrals.length ? { referrals } : {}), handoff: Boolean(handoff), error: Boolean(error), locale,
    ...(ENGINE_STATES.has(engine) ? { engine } : {}), ...(elapsedMs !== null ? { ms: elapsedMs } : {}) }));
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
    navigation:{cards:[],suggestions:[]},responsePolicy:CONVERSATION_POLICY,action:'fact',decidedBy:'fact',started});

  const modelMessages=fact?[...messages.slice(0,-1),{role:'user',content:fact.remainingMessage}]:messages;
  const profile = extractTripProfile(modelMessages);
  const plan = conversationPlan(modelMessages, { locale });
  const dynamicEntities = getDynamicEntities(process.env);
  const localAnswer = catalogueAnswer(modelMessages, locale);
  const localQuery = localAnswer.navigation.query || latestUserMessage;
  const localSections = [
    ...(localAnswer.navigation.cards || []).map((c) => c.href),
    ...(localAnswer.navigation.suggestions || []).map((s) => s.href)
  ];
  const wantsEvents = localSections.includes('/events');
  const liveEventEntities = wantsEvents
    ? getLiveEventEntities(localQuery, { profile, locale, env: process.env })
    : Promise.resolve([]);
  const wantsForecast = shouldFetchForecast(latestUserMessage, profile, localSections);
  const forecastPromise = wantsForecast
    ? getMiamiForecast({ env: process.env, signal: request.signal })
    : Promise.resolve([]);
  const degraded = localAnswer.matched ? localAnswer.reply : unavailableReply(locale);
  // Booking and payment requests are a handoff whichever engine answers: the
  // disclaimer is guaranteed here, in code. The only rows attached are the
  // restaurants or clubs the guest named, each with its own booking page.
  const bookingText=[...modelMessages].reverse().find(m=>m.role==='user')?.content||'';
  const bookingTurn=explicitBooking(bookingText);
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
    const [dyn, initialLiveEvents, resolvedPlan] = await Promise.all([dynamicEntities, liveEventEntities, plan]);
    const liveEvents = initialLiveEvents.length || !sections.includes('/events')
      ? initialLiveEvents
      : await getLiveEventEntities(query, { profile, locale, env: process.env });
    const extraEntities = liveEvents.length ? [...dyn, ...liveEvents] : dyn;
    const viewedEntity = body.pagePath ? resolvePageEntity(body.pagePath, extraEntities) : null;
    const effectiveQuery = viewedEntity && viewedEntity.type !== 'Section' && sections.includes(viewedEntity.section)
      && !query.toLowerCase().includes(viewedEntity.title.toLowerCase())
      ? `${query} ${viewedEntity.title}`
      : query;
    // When a multi-section VIP plan is active, surface balanced partner cards
    // (yachts, helicopters/experiences, live events) for any requested sections
    // not already shown inside AiPlan.
    const planHrefs = new Set((resolvedPlan?.sections || []).map((s) => s.href));
    const partnerSections = resolvedPlan
      ? [...new Set([...sections, ...localSections])].filter((href) => !planHrefs.has(href))
      : [];
    const listingSections = partnerSections.length ? partnerSections : sections;
    const listingLimit = partnerSections.length ? 4 : 3;
    return reply(answer,{messages:modelMessages,locale,...options,action,decidedBy,started,
      listings:handoff
        ? namedVenueCards(bookingText,{locale,extraEntities,profile})
        : gatedListings(effectiveQuery,{locale,action,sections:listingSections,extraEntities,profile,stops:options.stops,limit:listingLimit}),
      ...(handoff?{handoff:true}:{}),plan:resolvedPlan});
  };
  // Degraded turns: the keyword matcher decides.
  const fallback={source:'navigation',error:true,navigation:localAnswer.navigation,action:localAnswer.action,decidedBy:'lexicon'};
  // Give live events, dynamic catalog & 7-day NWS forecast a brief pre-inference window (<= 1100 ms)
  // so DeepSeek V4.1 Flash sees real live dates, venues, prices, and forecast before answering.
  const preWait = Promise.all([dynamicEntities, liveEventEntities, forecastPromise])
    .then(([dyn, live, forecast]) => ({ extra: [...dyn, ...live], forecast }));
  let preTimer;
  const pre = await Promise.race([
    preWait,
    new Promise((resolve) => {
      preTimer = setTimeout(() => resolve({
        extra: [
          ...peekDynamicEntities(process.env),
          ...(wantsEvents ? peekLiveEventEntities(localQuery, { profile, locale }) : [])
        ],
        forecast: wantsForecast ? peekMiamiForecast() : []
      }), 1100);
    })
  ]).finally(() => clearTimeout(preTimer));
  const cloud=await askWorkersBrain({messages,locale,signal:request.signal,request},{messagesForInference:modelMessages,timeoutMs:SERVER_BUDGET_MS-(Date.now()-started),extraEntities:pre.extra,pagePath:body.pagePath||'',forecastPeriods:pre.forecast});
  if(cloud.ok)return respond(cloud.reply,{source:'workers-ai',navigation:cloud.navigation,responsePolicy:cloud.responsePolicy,handoff:cloud.handoff,action:cloud.action,decidedBy:cloud.decidedBy,stops:cloud.stops,engine:'ok'});

  // Disabled, denied or failed: graceful degradation, never a second engine.
  // Still a 200 with a well-formed body: the widget renders this like any
  // other answer instead of hitting an error path. A recognised request gets
  // the catalogue sentence and listing links, not the "temporarily
  // unavailable" line.
  return respond(degraded,{...fallback,engine:cloud.kind});
}

const TRACKED_REFERRAL_PLATFORMS = new Set([
  'ticketnetwork', 'viator', 'headout', 'ovago', 'yatr', 'stay22', 'privatejetfinder',
  'opentable', 'resy', 'sevenrooms', 'tock', 'discotech', 'tablelistpro', 'dice', 'eatwith', 'venue', 'maps'
]);

// Public health check + zero-PII partner referral click attribution beacon.
export async function GET(request) {
  try {
    const url = request?.url ? new URL(request.url, 'https://gorgona-one.com') : null;
    const platform = url?.searchParams?.get('referral');
    if (platform && TRACKED_REFERRAL_PLATFORMS.has(platform)) {
      recordReferralClick(platform);
      console.info(JSON.stringify({ event: 'concierge.referral_click', platform }));
    }
  } catch {}
  return NextResponse.json({ ok: true });
}
