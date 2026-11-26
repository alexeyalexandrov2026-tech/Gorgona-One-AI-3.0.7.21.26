import { NextResponse } from 'next/server';
import { normalizeLocale, unavailableReply } from '../../../lib/ai/locale';
import { readChatRequest, validateChatTransport, ChatInputError } from '../../../lib/ai/chatRequest.mjs';
import { conversationNavigation } from '../../../lib/ai/conversation.mjs';
import { askWorkersBrain } from '../../../lib/ai/workersBrain.mjs';
import { answerConciergeFact } from '../../../lib/ai/conciergeFacts.mjs';
import { CONVERSATION_POLICY } from '../../../lib/ai/conciergeReply.mjs';
import { conversationPlan } from '../../../lib/server/planCatalog.mjs';
import { catalogueAnswer, explicitBooking, bookingDisclaimer } from '../../../lib/ai/catalogueAnswer.mjs';
import { alignPlanWithReply, gatedListings, listingCards, namedVenueCards, replyMentionedCards } from '../../../lib/ai/listingCards.mjs';
import { getDynamicEntities, peekDynamicEntities } from '../../../lib/server/conciergeIndex.mjs';
import { getLiveEventEntities, peekLiveEventEntities } from '../../../lib/server/conciergeEvents.mjs';
import { extractTripProfile } from '../../../lib/ai/tripProfile.mjs';
import { resolvePageEntity } from '../../../lib/ai/factPack.mjs';
import { getMiamiForecast, peekMiamiForecast, shouldFetchForecast } from '../../../lib/ai/miamiForecast.mjs';
import { persistTelemetryEvent, recordChatTurn, recordFeedbackVote, recordReferralClick } from '../../../lib/server/conciergeTelemetry.mjs';
import { SERVER_BUDGET_MS } from '../../../lib/ai/chatDeadline.mjs';
import { detectMessageLocale } from '../../../lib/ai/semanticVibes.mjs';
import { chatCacheKey, isCacheableChatTurn, readCachedChatReply, writeCachedChatReply } from '../../../lib/server/chatEdgeCache.mjs';
import { formatGuestMemoryPromptLine, loadGuestAccountMemory } from '../../../lib/server/guestMemory.mjs';
import { getStage3Copy } from '../../../lib/ai/stage3Copy.mjs';
import { checkPreInferenceFleetAvailability, enrichListingsWithAgentTools, enrichPlanWithAgentTools } from '../../../lib/ai/agentTools.mjs';
import { runBackgroundTask } from '../../../lib/server/trackHandler.mjs';

// ===========================================================================
// Concierge chat adapter (JSON + optional SSE streaming via Accept header).
//
// One explicit chain, in order:
//   1. deterministic facts: greetings, Miami time and NWS weather
//   2. Cloudflare Edge Cache for popular non-personalized first-turn queries
//   3. native Workers AI, opt-in with durable usage limits & account memory
//   4. deterministic authored fallback (lib/ai/catalogueAnswer.mjs)
//
// JSON clients (Android app, automated tests) receive the exact unchanged
// JSON contract (`200 OK`). Web clients sending `Accept: text/event-stream`
// receive live progress statuses, instant card previews, smooth delta text
// streaming, and the final validated `done` envelope.
// ===========================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DECIDERS = new Set(['model', 'lexicon', 'fact']);
const ENGINE_STATES = new Set(['ok', 'disabled', 'unavailable', 'usage_denied', 'timeout', 'cancelled', 'invalid_input', 'invalid_reply', 'cache']);

function fireAndForget(promise) {
  if (!promise) return;
  try {
    void runBackgroundTask(promise);
  } catch {}
}

function buildReplyPayload(text, {
  messages = [],
  latestUserMessage = '',
  source = null,
  locale = 'en',
  replyLocale = null,
  error = false,
  navigation = null,
  responsePolicy = null,
  plan = null,
  listings = [],
  followups = null,
  tripPatch = null,
  handoffSummary = '',
  rejectionReason = null,
  handoff = false,
  action = null,
  decidedBy = 'lexicon',
  engine = null,
  cached = false,
  started = null,
  skipTelemetry = false
} = {}) {
  const decider = DECIDERS.has(decidedBy) ? decidedBy : 'lexicon';
  const rows = Array.isArray(listings) ? listings.slice(0, 4) : [];
  const referrals = [...new Set(rows.map((r) => r?.booking?.platform).filter(Boolean))];
  const elapsedMs = Number.isFinite(started) ? Date.now() - started : null;
  const effectiveLocale = replyLocale || locale;
  if (!skipTelemetry) {
    recordChatTurn({ decidedBy: decider, action, locale: effectiveLocale, referrals, handoff: Boolean(handoff), error: Boolean(error), cached: Boolean(cached), ms: elapsedMs });
    fireAndForget(persistTelemetryEvent({
      eventType: cached ? 'cache_hit' : 'turn',
      locale: effectiveLocale,
      decidedBy: decider,
      action,
      latencyMs: elapsedMs,
      handoff: Boolean(handoff),
      error: Boolean(error),
      cached: Boolean(cached)
    }, process.env));
  }
  console.info(JSON.stringify({
    event: 'concierge.chat',
    decidedBy: decider,
    source,
    action,
    listings: rows.length,
    ...(referrals.length ? { referrals } : {}),
    handoff: Boolean(handoff),
    error: Boolean(error),
    ...(rejectionReason ? { rejectionReason } : {}),
    ...(cached ? { cached: true } : {}),
    locale: effectiveLocale,
    ...(ENGINE_STATES.has(engine) ? { engine } : {}),
    ...(elapsedMs !== null ? { ms: elapsedMs } : {})
  }));
  return {
    reply: text,
    ...(replyLocale && replyLocale !== locale ? { replyLocale } : {}),
    ...(navigation || conversationNavigation(messages.length ? messages : [{ role: 'user', content: latestUserMessage }], { reply: error ? '' : text, locale: effectiveLocale })),
    listings: rows,
    decidedBy: decider,
    ...(action ? { action } : {}),
    ...(responsePolicy ? { responsePolicy } : {}),
    ...(plan ? { plan } : {}),
    ...(Array.isArray(followups) && followups.length ? { followups: followups.slice(0, 3) } : {}),
    ...(tripPatch && typeof tripPatch === 'object' ? { tripPatch } : {}),
    ...(handoffSummary ? { handoffSummary } : {}),
    configured: !error,
    ...(source ? { source } : {}),
    ...(cached ? { cached: true } : {}),
    ...(handoff ? { handoff: true } : {}),
    ...(error ? { error: true } : {})
  };
}

function splitStreamChunks(text) {
  const raw = String(text || '');
  if (!raw) return [];
  const tokens = raw.match(/\S+\s*/g) || [raw];
  const chunks = [];
  const groupSize = tokens.length > 40 ? 4 : 2;
  for (let i = 0; i < tokens.length; i += groupSize) {
    chunks.push(tokens.slice(i, i + groupSize).join(''));
  }
  return chunks;
}

async function computeChatPayload(request, body, started, emit = null) {
  const skipTelemetry = /\bMiamiElioApp\//.test(request?.headers?.get('user-agent') || '');
  const messages = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
  const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const locale = normalizeLocale(body?.locale);
  const detectedLocale = detectMessageLocale(latestUserMessage, locale);
  const s3 = getStage3Copy(detectedLocale);

  const fact = await answerConciergeFact(latestUserMessage, detectedLocale, request.signal);
  if (fact && !fact.remainingMessage) {
    return buildReplyPayload(fact.reply, {
      source: fact.source,
      error: fact.error,
      locale,
      replyLocale: detectedLocale,
      navigation: { cards: [], suggestions: [] },
      responsePolicy: CONVERSATION_POLICY,
      action: 'fact',
      decidedBy: 'fact',
      started,
      skipTelemetry
    });
  }

  const modelMessages = fact ? [...messages.slice(0, -1), { role: 'user', content: fact.remainingMessage }] : messages;
  const profile = extractTripProfile(modelMessages, new Date(), body.savedPrefs || null);
  const localNav = conversationNavigation(modelMessages, { locale: detectedLocale });
  const localQuery = localNav.query || latestUserMessage;
  const localSections = [
    ...(localNav.cards || []).map((c) => c.href),
    ...(localNav.suggestions || []).map((s) => s.href)
  ];
  const clientIp = request?.headers?.get('cf-connecting-ip');
  const allowLiveUpstream = !globalThis.caches?.default || Boolean(clientIp && /^[a-f0-9:.]{3,64}$/i.test(clientIp));
  const wantsEvents = allowLiveUpstream && localSections.includes('/events');
  const wantsForecast = allowLiveUpstream && shouldFetchForecast(latestUserMessage, profile, localSections);
  const bookingText = [...modelMessages].reverse().find((m) => m.role === 'user')?.content || '';
  const bookingTurn = explicitBooking(bookingText);
  const hasAuth = Boolean(request?.headers?.get('authorization'));

  if (emit) {
    emit('status', { stage: 'context', label: wantsForecast ? s3.statusWeather : s3.statusCatalog });
    if (localNav.cards?.length || localNav.suggestions?.length) {
      emit('preview', { cards: localNav.cards || [], suggestions: localNav.suggestions || [] });
    }
  }

  // Stage 3 Edge Cache check for popular non-personalized first-turn queries (<150ms).
  // Dated fleet availability queries bypass Edge Cache so live garage holds are never stale.
  const wantsFleetAvailability = Boolean(
    profile?.dateRange?.from && (localSections.includes('/rentals') || String(body.pagePath || '').startsWith('/rentals'))
  );
  const canCache = !wantsFleetAvailability && isCacheableChatTurn({
    messages: modelMessages,
    savedPrefs: body.savedPrefs || null,
    pagePath: body.pagePath || '',
    hasAuth,
    wantsForecast,
    wantsEvents,
    bookingTurn
  });
  const cacheKey = canCache ? await chatCacheKey(detectedLocale, latestUserMessage) : null;
  if (cacheKey) {
    const cachedHit = await readCachedChatReply(cacheKey);
    if (cachedHit) {
      return buildReplyPayload(cachedHit.reply, {
        messages: modelMessages,
        locale,
        replyLocale: cachedHit.replyLocale || detectedLocale,
        navigation: { cards: cachedHit.cards || [], suggestions: cachedHit.suggestions || [] },
        listings: cachedHit.listings || [],
        plan: cachedHit.plan || null,
        followups: cachedHit.followups || null,
        handoffSummary: cachedHit.handoffSummary || '',
        responsePolicy: cachedHit.responsePolicy || CONVERSATION_POLICY,
        action: cachedHit.action || 'recommend',
        decidedBy: 'model',
        source: 'edge-cache',
        engine: 'cache',
        cached: true,
        started,
        skipTelemetry
      });
    }
  }

  const plan = conversationPlan(modelMessages, { locale: detectedLocale });
  const dynamicEntities = getDynamicEntities(process.env);
  const liveEventEntities = wantsEvents
    ? getLiveEventEntities(localQuery, { profile, locale, env: process.env })
    : Promise.resolve([]);
  const forecastPromise = wantsForecast
    ? getMiamiForecast({ env: process.env, signal: request.signal })
    : Promise.resolve([]);
  const guestMemoryPromise = hasAuth
    ? loadGuestAccountMemory(request, process.env)
    : Promise.resolve(null);
  const availabilityPromise = wantsFleetAvailability
    ? checkPreInferenceFleetAvailability({
        query: localQuery,
        pagePath: body.pagePath || '',
        profile,
        localSections,
        env: process.env
      }).catch(() => ({ checked: false, statuses: new Map(), promptLine: '' }))
    : Promise.resolve({ checked: false, statuses: new Map(), promptLine: '' });

  const respond = async (text, options = {}) => {
    const replyLocale = options.replyLocale || detectedLocale;
    const handoff = bookingTurn || options.handoff === true;
    let answer = fact ? fact.reply + '\n\n' + text : text;
    const disclaimer = bookingDisclaimer(replyLocale);
    if (handoff && !answer.includes(disclaimer)) answer = disclaimer + '\n\n' + answer;
    const action = handoff ? 'handoff' : options.action;
    const sections = Array.isArray(options.sections) && options.sections.length
      ? options.sections
      : (options.navigation?.cards || []).map((card) => card.href);
    const query = options.navigation?.query || localNav.query || latestUserMessage;
    const decidedBy = handoff && !options.handoff ? 'lexicon' : options.decidedBy;
    const [dyn, initialLiveEvents, resolvedPlan, resolvedGuestMemory, resolvedAvailability] = await Promise.all([
      dynamicEntities,
      liveEventEntities,
      plan,
      guestMemoryPromise,
      availabilityPromise
    ]);
    const liveEvents = !allowLiveUpstream || initialLiveEvents.length || !sections.includes('/events')
      ? initialLiveEvents
      : await Promise.race([
          getLiveEventEntities(query, { profile, locale: replyLocale, env: process.env }).catch(() => []),
          new Promise((resolve) => setTimeout(() => resolve([]), 1200))
        ]);
    const extraEntities = liveEvents.length ? [...dyn, ...liveEvents] : dyn;
    const viewedEntity = body.pagePath ? resolvePageEntity(body.pagePath, extraEntities) : null;
    const effectiveQuery = viewedEntity && viewedEntity.type !== 'Section' && sections.includes(viewedEntity.section)
      && !query.toLowerCase().includes(viewedEntity.title.toLowerCase())
      ? `${query} ${viewedEntity.title}`
      : query;
    const planHrefs = new Set((resolvedPlan?.sections || []).map((s) => s.href));
    const partnerSections = resolvedPlan
      ? [...new Set([...sections, ...localSections])].filter((href) => !planHrefs.has(href))
      : [];
    const listingSections = partnerSections.length ? partnerSections : sections;
    const listingLimit = partnerSections.length || sections.length >= 2 ? 4 : 3;
    let resolvedListings = handoff
      ? namedVenueCards(bookingText, { locale: replyLocale, extraEntities, profile })
      : gatedListings(effectiveQuery, { locale: replyLocale, action, sections: listingSections, extraEntities, profile, stops: options.stops, limit: listingLimit });
    if (!handoff && decidedBy === 'model' && ['consult', 'recommend', 'plan', 'ideas'].includes(action) && listingSections.length) {
      const cardKey = (c) => (c.label === 'Flight' || c.label === 'Yacht') && c.booking?.href ? c.booking.href : c.href;
      const fromReply = replyMentionedCards(text, { sections: listingSections, extraEntities, limit: listingLimit });
      if (fromReply.length) {
        const merged = [];
        const seen = new Set();
        for (const card of [...fromReply, ...resolvedListings]) {
          const key = cardKey(card);
          if (!seen.has(key) && merged.length < listingLimit) {
            seen.add(key);
            merged.push(card);
          }
        }
        resolvedListings = merged;
      }
      if (action === 'plan' && listingSections.length >= 2 && resolvedListings.length < listingLimit) {
        const seen = new Set(resolvedListings.map(cardKey));
        const balanced = listingCards(effectiveQuery, { locale: replyLocale, sections: listingSections, extraEntities, profile, limit: listingLimit });
        for (const card of balanced) {
          const key = cardKey(card);
          if (!seen.has(key) && resolvedListings.length < listingLimit) {
            seen.add(key);
            resolvedListings.push(card);
          }
        }
      }
    }
    const alignedPlan = (!handoff && decidedBy === 'model' && resolvedPlan)
      ? alignPlanWithReply(resolvedPlan, text, { extraEntities })
      : resolvedPlan;
    const [enrichedListings, enrichedPlan] = await Promise.all([
      enrichListingsWithAgentTools(resolvedListings, {
        profile,
        locale: replyLocale,
        preStatuses: resolvedAvailability?.statuses,
        env: process.env
      }).catch(() => resolvedListings),
      alignedPlan
        ? enrichPlanWithAgentTools(alignedPlan, {
            profile,
            locale: replyLocale,
            preStatuses: resolvedAvailability?.statuses,
            env: process.env
          }).catch(() => alignedPlan)
        : Promise.resolve(alignedPlan)
    ]);
    resolvedListings = enrichedListings;
    // Authenticated /pay/[token] & Live Trip Room bridge: when a signed-in guest
    // asks about their quote, signature, payment, or trip pass, surface verified
    // direct /pay/<token> card(s) without ever exposing raw tokens to the LLM.
    const wantsOwnQuote = /\b(?:quote|invoice|esign|e-sign|sign|payment|pay|checkout|trip\s*room|my\s+(?:trip|booking|pass|quote))\b|оплат|сч[её]т|договор|подпис|квот|моя\s+поездк|мой\s+заказ|бронь|cotizaci|pagar|factura|חשבונית|תשלום|دفع|فاتورة|报价|付款|見積|支払|결제/iu.test(latestUserMessage);
    if (wantsOwnQuote && Array.isArray(resolvedGuestMemory?.openQuotes) && resolvedGuestMemory.openQuotes.length) {
      const quoteCards = resolvedGuestMemory.openQuotes.slice(0, 2).map((q) => ({
        href: q.payPath,
        title: q.title,
        label: q.status === 'signed' ? 'Ready to Pay' : 'ESIGN & Pay',
        subtitle: q.status === 'signed' ? 'Signed quote — complete payment' : 'Review & sign quote',
        ...(Number.isFinite(q.amountCents) && q.amountCents > 0
          ? { price: `$${Math.round(q.amountCents / 100).toLocaleString('en-US')}` }
          : {})
      }));
      resolvedListings = [...quoteCards, ...resolvedListings].slice(0, Math.max(listingLimit, 4));
    }
    const payload = buildReplyPayload(answer, {
      messages: modelMessages,
      locale,
      replyLocale,
      ...options,
      action,
      decidedBy,
      started,
      skipTelemetry,
      listings: resolvedListings,
      ...(handoff ? { handoff: true } : {}),
      plan: enrichedPlan
    });
    if (cacheKey && !payload.error && !payload.handoff && payload.decidedBy === 'model') {
      fireAndForget(writeCachedChatReply(cacheKey, payload));
    }
    return payload;
  };

  // Pre-inference window (<= 1100 ms) for live catalog, events, NOAA forecast, fleet calendar & guest memory.
  const preWait = Promise.all([dynamicEntities, liveEventEntities, forecastPromise, guestMemoryPromise, availabilityPromise])
    .then(([dyn, live, forecast, memory, availability]) => ({ extra: [...dyn, ...live], forecast, memory, availability }));
  let preTimer;
  const pre = await Promise.race([
    preWait,
    new Promise((resolve) => {
      preTimer = setTimeout(() => resolve({
        extra: [
          ...peekDynamicEntities(process.env),
          ...(wantsEvents ? peekLiveEventEntities(localQuery, { profile, locale: detectedLocale }) : [])
        ],
        forecast: wantsForecast ? peekMiamiForecast() : [],
        memory: null,
        availability: { checked: false, statuses: new Map(), promptLine: '' }
      }), 1100);
    })
  ]).finally(() => clearTimeout(preTimer));

  if (emit) {
    emit('status', { stage: 'model', label: s3.statusModel });
  }

  const guestMemoryLine = formatGuestMemoryPromptLine(pre.memory);
  const cloud = await askWorkersBrain(
    { messages, locale, signal: request.signal, request },
    {
      messagesForInference: modelMessages,
      timeoutMs: SERVER_BUDGET_MS - (Date.now() - started),
      extraEntities: pre.extra,
      pagePath: body.pagePath || '',
      forecastPeriods: pre.forecast,
      savedPrefs: body.savedPrefs || null,
      guestMemoryLine,
      availabilityLine: pre.availability?.promptLine || '',
      conversationSummary: body.conversationSummary || '',
      onReplyDelta: emit ? (chunk) => emit('delta', { text: chunk, live: true }) : null,
      onStreamReset: emit ? () => emit('reset', { reason: 'repair' }) : null
    }
  );
  if (cloud.ok) {
    return respond(cloud.reply, {
      source: 'workers-ai',
      navigation: cloud.navigation,
      sections: cloud.sections,
      responsePolicy: cloud.responsePolicy,
      handoff: cloud.handoff,
      action: cloud.action,
      decidedBy: cloud.decidedBy,
      stops: cloud.stops,
      followups: cloud.followups || null,
      tripPatch: cloud.tripPatch || null,
      handoffSummary: cloud.handoffSummary || '',
      replyLocale: cloud.replyLocale,
      engine: 'ok'
    });
  }

  const localAnswer = catalogueAnswer(modelMessages, detectedLocale);
  const degraded = localAnswer.matched ? localAnswer.reply : unavailableReply(detectedLocale);
  const fallback = {
    source: 'navigation',
    error: true,
    navigation: localAnswer.navigation,
    action: localAnswer.action,
    decidedBy: 'lexicon',
    replyLocale: detectedLocale,
    rejectionReason: cloud.rejectionReason || null
  };
  return respond(degraded, { ...fallback, engine: cloud.kind });
}

// --- Route handlers --------------------------------------------------------

export async function POST(request) {
  const started = Date.now();
  let body;
  try {
    validateChatTransport(request);
    body = await readChatRequest(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof ChatInputError ? error.message : 'Invalid chat request.' },
      { status: error instanceof ChatInputError ? error.status : 400 }
    );
  }

  const messages = Array.isArray(body?.messages) ? body.messages.slice(-12) : [];
  if (!messages.length) {
    return NextResponse.json({ error: 'No message provided.' }, { status: 400 });
  }

  const wantsStream = (request.headers.get('accept') || '').toLowerCase().includes('text/event-stream');
  if (!wantsStream) {
    const payload = await computeChatPayload(request, body, started);
    return NextResponse.json(payload);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let streamedLive = false;
      let streamedLiveText = '';
      const emit = (eventName, data) => {
        if (closed || request.signal?.aborted) return;
        if (eventName === 'reset') {
          streamedLive = false;
          streamedLiveText = '';
        } else if (eventName === 'delta' && data?.live) {
          streamedLive = true;
          if (typeof data.text === 'string') streamedLiveText += data.text;
        }
        try {
          controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };
      try {
        const payload = await computeChatPayload(request, body, started, emit);
        if (!closed && !request.signal?.aborted) {
          const finalReply = String(payload.reply || '').trim();
          const diverged = streamedLive && streamedLiveText.trim() !== finalReply;
          if (diverged) {
            emit('reset', { reason: 'final' });
          }
          if (!streamedLive || diverged) {
            const chunks = splitStreamChunks(payload.reply);
            for (const chunk of chunks) {
              emit('delta', { text: chunk });
              if (chunks.length > 1) {
                await new Promise((r) => setTimeout(r, 12));
              }
            }
          }
          emit('done', payload);
        }
      } catch {
        emit('error', { error: true });
      } finally {
        if (!closed) {
          closed = true;
          try { controller.close(); } catch {}
        }
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no'
    }
  });
}

const TRACKED_REFERRAL_PLATFORMS = new Set([
  'ticketnetwork', 'viator', 'headout', 'ovago', 'yatr', 'stay22', 'privatejetfinder',
  'opentable', 'resy', 'sevenrooms', 'tock', 'discotech', 'tablelistpro', 'dice', 'eatwith', 'venue', 'maps'
]);
const TRACKED_FEEDBACK = new Set(['up', 'down']);

function isSameOriginReferralRequest(request) {
  const secFetch = request?.headers?.get('sec-fetch-site');
  if (secFetch && secFetch !== 'same-origin') return false;
  const origin = request?.headers?.get('origin');
  if (origin && request?.url) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return false;
    } catch {
      return false;
    }
  }
  return true;
}

// Public health check + zero-PII same-origin partner referral & feedback beacon (web only).
export async function GET(request) {
  try {
    const ua = request?.headers?.get('user-agent') || '';
    if (/\bMiamiElioApp\//.test(ua)) return NextResponse.json({ ok: true });
    const url = request?.url ? new URL(request.url, 'https://gorgona-one.com') : null;
    const platform = url?.searchParams?.get('referral');
    if (platform && TRACKED_REFERRAL_PLATFORMS.has(platform) && isSameOriginReferralRequest(request)) {
      recordReferralClick(platform);
      fireAndForget(persistTelemetryEvent({ eventType: 'referral_click', platform }, process.env));
      console.info(JSON.stringify({ event: 'concierge.referral_click', platform }));
    }
    const feedback = url?.searchParams?.get('feedback');
    if (feedback && TRACKED_FEEDBACK.has(feedback) && isSameOriginReferralRequest(request)) {
      recordFeedbackVote(feedback);
      fireAndForget(persistTelemetryEvent({ eventType: 'feedback', vote: feedback }, process.env));
      console.info(JSON.stringify({ event: 'concierge.feedback', vote: feedback }));
    }
  } catch {}
  return NextResponse.json({ ok: true });
}
