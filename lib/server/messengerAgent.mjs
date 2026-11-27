// ===========================================================================
// Unified Omnichannel ELIO Messenger Agent (Telegram Business/Bot + WhatsApp).
//
// Reuses Miami Elio's verified 16-language AI brain, live fleet calendar,
// NOAA forecast, and package estimator while enforcing:
//   - Instant Human Takeover (when a live manager steps into the thread)
//   - Live /admin mode control ('24_7', 'after_hours', 'copilot_only')
//   - Idempotent webhook deduplication
//   - Automatic lead capture into /admin when service + dates are clear
//   - Zero fabricated prices/availability; live Miami Elio team handles booking
// ===========================================================================

import { extractTripProfile } from '../ai/tripProfile.mjs';
import { detectMessageLocale } from '../ai/semanticVibes.mjs';
import { checkPreInferenceFleetAvailability } from '../ai/agentTools.mjs';
import { getMiamiForecast } from '../ai/miamiForecast.mjs';
import { normalizeLocale } from '../ai/locale.js';
import { SITE_URL } from '../seo.mjs';
import { database, digest } from './dashboardCore.mjs';
import { persistTelemetryEvent } from './conciergeTelemetry.mjs';

const MAX_HISTORY_TURNS = 12;
const DEFAULT_SETTINGS = Object.freeze({
  mode: '24_7',
  telegramEnabled: true,
  whatsappEnabled: true,
  takeoverHours: 4
});

const HUMAN_REQUEST_RE = /\b(human|live manager|real person|speak to (someone|a person|manager|team)|call me|phone call|operator|representative)\b|жив(?:ой|ого|ым)\s+менеджер|жив(?:ой|ого)\s+человек|позов(?:и|ите)\s+менеджер|связ(?:ать|жите)\s+с\s+менеджер|оператор|позвоните|hablar con (un |una )?(persona|gerente|agente|humano)|falar com (um )?(gerente|humano|atendente)|parler [àa] un (humain|conseiller)/iu;

const HANDOFF_REPLIES = Object.freeze({
  en: 'Of course — I have alerted our Miami Elio team with your message. A live specialist will step directly into this chat shortly.',
  ru: 'Конечно — я уже передал ваш запрос нашей команде Miami Elio. Живой специалист подключится к этому чату в ближайшее время.',
  es: 'Por supuesto — ya avisé a nuestro equipo de Miami Elio con su mensaje. Un especialista en vivo entrará en este chat enseguida.',
  uk: 'Звісно — я вже передав ваш запит нашій команді Miami Elio. Живий спеціаліст підключиться до цього чату найближчим часом.',
  pt: 'Claro — já avisei nossa equipe da Miami Elio com sua mensagem. Um especialista ao vivo entrará neste chat em breve.',
  fr: 'Bien sûr — j’ai prévenu notre équipe Miami Elio avec votre message. Un spécialiste va rejoindre cette conversation rapidement.',
  de: 'Natürlich — ich habe unser Miami Elio Team bereits informiert. Ein persönlicher Ansprechpartner meldet sich gleich direkt hier im Chat.',
  it: 'Certo — ho già avvisato il nostro team Miami Elio. Uno specialista si collegherà a questa chat a breve.'
});

const TEAM_SIGN_OFF = Object.freeze({
  en: 'Our Miami Elio team handles every reservation personally from start to finish.',
  ru: 'Наша команда Miami Elio лично ведёт каждое бронирование от начала до конца.',
  es: 'Nuestro equipo de Miami Elio gestiona cada reserva personalmente de principio a fin.'
});

export function isAfterHoursMiami(now = new Date()) {
  try {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/New_York'
    }).format(now);
    const hour = Number(hourStr);
    if (!Number.isFinite(hour)) return false;
    return hour >= 22 || hour < 9;
  } catch {
    return false;
  }
}

export function wantsHumanTakeover(text) {
  return typeof text === 'string' && HUMAN_REQUEST_RE.test(text);
}

export function shouldAutoReply({ settings = DEFAULT_SETTINGS, thread = null, channel = 'telegram', now = new Date() }) {
  const mode = settings?.mode || '24_7';
  if (mode === 'copilot_only') return { allowed: false, reason: 'copilot_only' };
  if (channel === 'telegram' && settings?.telegramEnabled === false) return { allowed: false, reason: 'channel_disabled' };
  if (channel === 'whatsapp' && settings?.whatsappEnabled === false) return { allowed: false, reason: 'channel_disabled' };

  const pausedUntilMs = thread?.humanPausedUntil ? Date.parse(thread.humanPausedUntil) : NaN;
  if (Number.isFinite(pausedUntilMs) && pausedUntilMs > now.getTime()) {
    return { allowed: false, reason: 'human_takeover' };
  }
  if (mode === 'after_hours' && !isAfterHoursMiami(now)) {
    return { allowed: false, reason: 'business_hours' };
  }
  return { allowed: true, reason: 'ok' };
}

function cleanMessengerText(raw, listings = [], locale = 'en') {
  let text = String(raw || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\bconcierge\b/gi, 'Miami Elio team')
    .replace(/консьерж\w*/giu, 'команда Miami Elio')
    .trim();

  if (!text) {
    text = TEAM_SIGN_OFF[locale] || TEAM_SIGN_OFF.en;
  }

  const top = Array.isArray(listings) ? listings.find((item) => item?.href && String(item.href).startsWith('/')) : null;
  if (top && !text.includes('gorgona-one.com')) {
    const link = `${SITE_URL.replace(/\/$/, '')}${top.href}`;
    text = `${text}\n\n${top.title ? `${top.title}: ` : ''}${link}`;
  }

  return text.slice(0, 1400);
}

export async function notifyOwnerMessengerAlert({ channel, customerName, customerHandle, locale, userMessage, reason, bookingId }, env, fetcher = fetch) {
  if (!env?.TELEGRAM_BOT_TOKEN || !/^[1-9]\d{0,15}$/.test(String(env?.TELEGRAM_OWNER_CHAT_ID || ''))) return false;
  const tag = channel === 'whatsapp' ? 'WhatsApp' : 'Telegram';
  const lines = [
    `[Miami Elio ${tag}] ${reason}`,
    `Guest: ${customerName || 'Guest'}${customerHandle ? ` (${customerHandle})` : ''} · ${locale.toUpperCase()}`,
    `Message: "${String(userMessage || '').slice(0, 260)}"`,
    ...(bookingId ? [`Lead ID: ${bookingId.slice(0, 8)} — open /admin`] : [`Open /admin to review or pause ELIO`])
  ];
  try {
    const res = await fetcher(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_OWNER_CHAT_ID,
        text: lines.join('\n'),
        allow_paid_broadcast: false,
        link_preview_options: { is_disabled: true }
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function maybeCaptureMessengerLead({ db, channel, externalChatId, customerName, customerHandle, text, profile, listings, existingBookingId }, env) {
  if (existingBookingId || !db || !env?.BOOKING_RATE_SECRET || env.BOOKING_RATE_SECRET.length < 32) return null;
  const hasDate = Boolean(profile?.dateRange?.start || /\b(today|tomorrow|weekend|friday|saturday|sunday|сегодня|завтра|выходн|суббот|пятниц|воскресен|mañana|sábado)\b/iu.test(text));
  const hasService = Boolean(
    profile?.categories?.length
    || /\b(yacht|villa|car|urus|rolls|ferrari|lamborghini|escalade|jet|table|dinner|яхт|вилл|авто|машин|джет|стол|ужин|yate|coche)\b/iu.test(text)
  );
  if (!hasDate || !hasService) return null;

  const firstListing = Array.isArray(listings) ? listings[0] : null;
  const primaryCat = profile?.categories?.[0] || '';
  const kind = firstListing?.kind && ['car', 'stay', 'experience'].includes(firstListing.kind)
    ? firstListing.kind
    : primaryCat === 'villas' || primaryCat === 'stays'
      ? 'stay'
      : primaryCat === 'cars'
        ? 'car'
        : 'experience';

  const slugFromHref = firstListing?.href?.match(/^\/(?:rentals|vacation-rentals|experiences)\/([a-z0-9-]+)$/)?.[1];
  const itemSlug = slugFromHref || `${channel}-inquiry`;
  const itemTitle = firstListing?.title || `Miami Elio ${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} Inquiry`;
  const safeHandle = String(customerHandle || externalChatId || 'guest').replace(/[^a-zA-Z0-9._+-]/g, '').slice(0, 36) || 'guest';
  const email = `${channel}.${safeHandle.toLowerCase()}@messenger.gorgona-one.com`.slice(0, 250);
  const phone = channel === 'whatsapp'
    ? `+${String(externalChatId).replace(/\D/g, '').slice(0, 15)}`
    : (customerHandle ? `@${String(customerHandle).replace(/^@/, '')}` : `tg:${externalChatId}`).slice(0, 40);
  const dates = [
    profile?.dateRange?.start ? `${profile.dateRange.start}${profile.dateRange.end ? ` to ${profile.dateRange.end}` : ''}` : '',
    profile?.guests ? `${profile.guests} guests` : '',
    text.slice(0, 260)
  ].filter(Boolean).join(' · ').slice(0, 580);

  try {
    const keyHex = await digest(`messenger-lead:${channel}:${externalChatId}`, env.BOOKING_RATE_SECRET);
    const key = `${keyHex.slice(0, 8)}-${keyHex.slice(8, 12)}-4${keyHex.slice(13, 16)}-a${keyHex.slice(17, 20)}-${keyHex.slice(20, 32)}`;
    const rate = await digest(`messenger-rate:${channel}:${externalChatId}`, env.BOOKING_RATE_SECRET);
    const input = {
      name: (customerName || `${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} Guest`).slice(0, 110),
      email,
      phone: phone || 'messenger',
      dates: dates || 'Flexible dates',
      itemSlug,
      itemTitle: itemTitle.slice(0, 230),
      kind
    };
    const fingerprint = await digest(JSON.stringify([input, null]));
    const receipt = await db.rpc('dashboard_submit', {
      p_key: key,
      p_fingerprint: fingerprint,
      p_rate: rate,
      p_user: null,
      p_input: input
    });
    return receipt?.bookingId || null;
  } catch {
    return null;
  }
}

export async function processIncomingMessengerTurn({
  channel,
  externalChatId,
  businessConnectionId = null,
  providerMessageId = null,
  customerName = '',
  customerHandle = '',
  text = '',
  isFromBusinessOwner = false,
  env = process.env,
  fetcher = fetch,
  now = new Date()
}) {
  const cleanText = String(text || '').trim().slice(0, 1500);
  if (!['telegram', 'whatsapp'].includes(channel) || !externalChatId || (!cleanText && !isFromBusinessOwner)) {
    return { action: 'ignored' };
  }

  let db = null;
  try {
    db = database(env, fetcher);
  } catch {
    db = null;
  }

  const [settings, thread] = db
    ? await Promise.all([
        db.rpc('messenger_settings_get', {}).catch(() => DEFAULT_SETTINGS),
        db.rpc('messenger_thread_get', { p_channel: channel, p_external_chat_id: String(externalChatId) }).catch(() => null)
      ])
    : [DEFAULT_SETTINGS, null];

  const effectiveSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  if (providerMessageId && thread?.lastProviderMessageId === String(providerMessageId)) {
    return { action: 'duplicate' };
  }

  const takeoverMs = Math.max(1, Math.min(48, Number(effectiveSettings.takeoverHours) || 4)) * 3600 * 1000;
  const existingMessages = Array.isArray(thread?.messages) ? thread.messages.slice(-MAX_HISTORY_TURNS) : [];

  // Automatic Human Takeover: as soon as the live business owner sends a message
  // inside the thread, ELIO pauses immediately and stays silent for takeoverHours.
  if (isFromBusinessOwner) {
    const pausedUntil = new Date(now.getTime() + takeoverMs).toISOString();
    const updatedMessages = cleanText
      ? [...existingMessages, { role: 'assistant', content: cleanText, at: now.toISOString(), human: true }].slice(-MAX_HISTORY_TURNS)
      : existingMessages;
    if (db) {
      await db.rpc('messenger_thread_upsert', {
        p_channel: channel,
        p_external_chat_id: String(externalChatId),
        p_business_connection_id: businessConnectionId,
        p_customer_name: customerName || null,
        p_customer_handle: customerHandle || null,
        p_locale: thread?.locale || 'en',
        p_messages: updatedMessages,
        p_last_provider_message_id: providerMessageId ? String(providerMessageId) : null,
        p_human_paused_until: pausedUntil,
        p_keep_pause: true,
        p_booking_id: thread?.bookingId || null,
        p_last_message_preview: thread?.lastMessagePreview || null,
        p_last_reply_preview: cleanText ? cleanText.slice(0, 300) : null,
        p_increment_turns: false
      }).catch(() => {});
    }
    return { action: 'owner_takeover', pausedUntil };
  }

  const fallbackLocale = normalizeLocale(thread?.locale || 'en');
  const replyLocale = detectMessageLocale(cleanText, fallbackLocale);
  const withUserTurn = [...existingMessages, { role: 'user', content: cleanText, at: now.toISOString() }].slice(-MAX_HISTORY_TURNS);

  const gate = shouldAutoReply({ settings: effectiveSettings, thread, channel, now });
  if (!gate.allowed) {
    if (db) {
      await db.rpc('messenger_thread_upsert', {
        p_channel: channel,
        p_external_chat_id: String(externalChatId),
        p_business_connection_id: businessConnectionId,
        p_customer_name: customerName || null,
        p_customer_handle: customerHandle || null,
        p_locale: replyLocale,
        p_messages: withUserTurn,
        p_last_provider_message_id: providerMessageId ? String(providerMessageId) : null,
        p_human_paused_until: null,
        p_keep_pause: true,
        p_booking_id: thread?.bookingId || null,
        p_last_message_preview: cleanText.slice(0, 300),
        p_last_reply_preview: null,
        p_increment_turns: false
      }).catch(() => {});
    }
    return { action: 'skipped', reason: gate.reason, locale: replyLocale };
  }

  if (wantsHumanTakeover(cleanText)) {
    const pausedUntil = new Date(now.getTime() + takeoverMs).toISOString();
    const replyText = HANDOFF_REPLIES[replyLocale] || HANDOFF_REPLIES.en;
    const savedHistory = [...withUserTurn, { role: 'assistant', content: replyText, at: now.toISOString() }].slice(-MAX_HISTORY_TURNS);
    if (db) {
      await db.rpc('messenger_thread_upsert', {
        p_channel: channel,
        p_external_chat_id: String(externalChatId),
        p_business_connection_id: businessConnectionId,
        p_customer_name: customerName || null,
        p_customer_handle: customerHandle || null,
        p_locale: replyLocale,
        p_messages: savedHistory,
        p_last_provider_message_id: providerMessageId ? String(providerMessageId) : null,
        p_human_paused_until: pausedUntil,
        p_keep_pause: true,
        p_booking_id: thread?.bookingId || null,
        p_last_message_preview: cleanText.slice(0, 300),
        p_last_reply_preview: replyText.slice(0, 300),
        p_increment_turns: true
      }).catch(() => {});
    }
    await notifyOwnerMessengerAlert({
      channel,
      customerName,
      customerHandle,
      locale: replyLocale,
      userMessage: cleanText,
      reason: 'Guest requested a live specialist (ELIO paused)',
      bookingId: thread?.bookingId || null
    }, env, fetcher);
    return { action: 'handoff', replyText, locale: replyLocale, pausedUntil };
  }

  const chatHistory = withUserTurn.map(({ role, content }) => ({ role, content }));
  const profile = extractTripProfile(chatHistory, now);
  const [availability, forecast] = await Promise.all([
    checkPreInferenceFleetAvailability(profile, env, fetcher).catch(() => null),
    getMiamiForecast(fetcher).catch(() => null)
  ]);

  let replyRaw = '';
  let decidedBy = 'lexicon';
  let listings = [];

  try {
    if (env?.CONCIERGE_AI && env?.CONCIERGE_WORKERS_AI_ENABLED === 'true') {
      const [{ askWorkersBrain }, { listingCards }] = await Promise.all([
        import('../ai/workersBrain.mjs'),
        import('../ai/listingCards.mjs')
      ]);
      const brain = await askWorkersBrain(chatHistory, replyLocale, {
        env,
        profile,
        availabilityLine: availability?.promptLine || '',
        forecastPeriods: forecast?.periods || null,
        pagePath: '/'
      });
      if (brain?.ok && typeof brain.reply === 'string' && brain.reply.trim()) {
        replyRaw = brain.reply;
        decidedBy = 'model';
        listings = listingCards({ messages: chatHistory, reply: brain.reply, locale: replyLocale, profile }) || [];
      }
    }
  } catch {
    replyRaw = '';
  }

  if (!replyRaw) {
    try {
      const { catalogueAnswer } = await import('../ai/catalogueAnswer.mjs');
      const fallback = catalogueAnswer(chatHistory, replyLocale, { profile });
      replyRaw = fallback?.reply || TEAM_SIGN_OFF[replyLocale] || TEAM_SIGN_OFF.en;
      listings = Array.isArray(fallback?.listings) ? fallback.listings : [];
    } catch {
      const fallbackByLang = {
        ru: 'Здравствуйте! Это команда Miami Elio. Расскажите, какие даты, сколько гостей и что вам интересно (яхта, авто, вилла, джет, ужин или билеты) — подберём лучшие варианты в Майами и передадим менеджеру.',
        es: '¡Hola! Somos el equipo de Miami Elio. Cuéntanos tus fechas, cuántos huéspedes son y qué buscas (yate, auto, villa, jet, cena o entradas) para prepararte las mejores opciones en Miami.',
        en: 'Hello! This is the Miami Elio team. Share your dates, group size, and what you are looking for (yacht, exotic car, villa, private jet, dining, or event tickets) and we will prepare tailored options right away.'
      };
      replyRaw = fallbackByLang[replyLocale] || fallbackByLang.en;
      listings = [];
    }
  }

  const replyText = cleanMessengerText(replyRaw, listings, replyLocale);
  const bookingId = await maybeCaptureMessengerLead({
    db,
    channel,
    externalChatId,
    customerName,
    customerHandle,
    text: cleanText,
    profile,
    listings,
    existingBookingId: thread?.bookingId || null
  }, env);

  const savedHistory = [...withUserTurn, { role: 'assistant', content: replyText, at: now.toISOString() }].slice(-MAX_HISTORY_TURNS);
  if (db) {
    await db.rpc('messenger_thread_upsert', {
      p_channel: channel,
      p_external_chat_id: String(externalChatId),
      p_business_connection_id: businessConnectionId,
      p_customer_name: customerName || null,
      p_customer_handle: customerHandle || null,
      p_locale: replyLocale,
      p_messages: savedHistory,
      p_last_provider_message_id: providerMessageId ? String(providerMessageId) : null,
      p_human_paused_until: null,
      p_keep_pause: true,
      p_booking_id: bookingId || thread?.bookingId || null,
      p_last_message_preview: cleanText.slice(0, 300),
      p_last_reply_preview: replyText.slice(0, 300),
      p_increment_turns: true
    }).catch(() => {});
  }

  if (bookingId && !thread?.bookingId) {
    await notifyOwnerMessengerAlert({
      channel,
      customerName,
      customerHandle,
      locale: replyLocale,
      userMessage: cleanText,
      reason: 'New qualified lead auto-captured by ELIO',
      bookingId
    }, env, fetcher);
  }

  await persistTelemetryEvent({
    eventType: 'turn',
    locale: replyLocale,
    platform: `messenger_${channel}`,
    decidedBy,
    action: bookingId ? 'lead_captured' : 'messenger_reply'
  }, env, fetcher).catch(() => {});

  return {
    action: 'replied',
    replyText,
    locale: replyLocale,
    decidedBy,
    bookingId: bookingId || thread?.bookingId || null
  };
}
