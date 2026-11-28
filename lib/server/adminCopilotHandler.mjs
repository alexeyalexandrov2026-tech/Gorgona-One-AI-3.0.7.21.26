// ===========================================================================
// Admin ELIO Team Copilot & Omnichannel Messenger Control Handlers.
//
// Strictly admin-only (Bearer + verified profiles.role === 'admin').
//   - POST /api/dashboard/copilot: generates localized client reply draft,
//     structured quote pre-fill for AdminQuotePanel, and manager weather/upsell brief
//   - GET/POST /api/dashboard/messenger: reads & updates omnichannel mode
//     ('24_7', 'after_hours', 'copilot_only'), channel readiness, and thread pauses
// ===========================================================================

import { database, json, failure, readBody, uuid, RequestError } from './dashboardCore.mjs';
import { detectMessageLocale } from '../ai/semanticVibes.mjs';
import { languageName } from '../ai/locale.js';
import { getMiamiForecast } from '../ai/miamiForecast.mjs';
import { checkPreInferenceFleetAvailability } from '../ai/agentTools.mjs';
import { extractTripProfile } from '../ai/tripProfile.mjs';
import { getRentals } from '../rentalsData.js';
import { SITE_URL } from '../seo.mjs';

const COPILOT_PRIMARY_MODEL = '@cf/deepseek-ai/deepseek-v4.1-flash-1017';
const COPILOT_FALLBACK_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

function parseDaysFromDates(datesText = '') {
  const m = String(datesText).match(/\b([1-9]|1[0-4])\s*(?:days?|nights?|дн\p{L}*|сут\p{L}*|ноч\p{L}*|d[íi]as?|noches?)/iu);
  if (m) return Math.max(1, Math.min(14, Number(m[1])));
  const range = String(datesText).match(/(\d{4}-\d{2}-\d{2})\D+(\d{4}-\d{2}-\d{2})/);
  if (range) {
    const diff = Math.round((Date.parse(range[2]) - Date.parse(range[1])) / 86400000);
    if (Number.isFinite(diff) && diff >= 1 && diff <= 14) return diff;
  }
  return 1;
}

function parseGuestsFromDates(datesText = '') {
  const m = String(datesText).match(/\b([1-9]|1\d|2\d)\s*(?:guests?|people|pax|чел\p{L}*|гост\p{L}*|personas?)/iu);
  return m ? Math.max(1, Math.min(12, Number(m[1]))) : 1;
}

function findMatchingRental(request) {
  const slug = String(request?.item_slug || '').toLowerCase();
  const title = String(request?.item_title || '').toLowerCase();
  return getRentals().find((item) =>
    item.slug?.toLowerCase() === slug
    || (title && item.title?.toLowerCase() === title)
    || (title && item.title && title.includes(item.title.toLowerCase()))
  ) || null;
}

function buildQuoteDraft(request, matchedCar) {
  const days = parseDaysFromDates(request?.dates);
  const guests = parseGuestsFromDates(request?.dates);
  const kind = String(request?.kind || 'car');
  const parsedRate = Number(String(matchedCar?.dailyPrice || '').replace(/[^0-9.]/g, ''));
  const dailyRate = Number.isFinite(parsedRate) && parsedRate >= 100
    ? parsedRate
    : (kind === 'stay' ? 2200 : kind === 'yacht' ? 3500 : kind === 'jet' ? 9500 : 1200);
  const baseTotal = Math.round(dailyRate * days);
  const deliveryFee = kind === 'car' ? 150 : 0;
  const totalUsd = baseTotal + deliveryFee;
  const depositUsd = kind === 'car' ? Math.min(2500, Math.max(500, Math.round(dailyRate * 0.5))) : Math.round(totalUsd * 0.25);
  const splitWays = guests >= 2 ? Math.min(12, guests) : 1;
  const supplierName = matchedCar?.company || (kind === 'car' ? 'Miami Elio Fleet' : 'Miami Elio Verified Partner');

  const lineItems = [
    { label: `${request?.item_title || 'Reservation'} (${days}d)`, amountUsd: String(baseTotal), category: 'base' },
    ...(deliveryFee > 0 ? [{ label: 'White-glove Miami delivery & pickup', amountUsd: String(deliveryFee), category: 'service' }] : [])
  ];

  return {
    supplierName,
    amountUsd: String(totalUsd),
    depositUsd: String(depositUsd),
    splitWays: String(splitWays),
    kycRequired: kind === 'car' || kind === 'stay' || totalUsd >= 2500,
    weatherShieldEnabled: kind === 'yacht' || kind === 'experience',
    lineItems,
    notes: `Handled personally by the Miami Elio team (${request?.dates || 'dates to confirm'}).`
  };
}

function buildFallbackReply({ request, quoteDraft, clientLanguage }) {
  const name = request?.client_name ? String(request.client_name).split(/\s+/)[0] : '';
  const item = request?.item_title || 'your Miami request';
  const dates = request?.dates || 'your preferred dates';
  const total = Number(quoteDraft.amountUsd).toLocaleString('en-US');

  if (clientLanguage === 'ru') {
    return [
      `Здравствуйте${name ? `, ${name}` : ''}! Это команда Miami Elio.`,
      `Мы получили ваш запрос по ${item} (${dates}) и уже проверяем точное наличие на ваши даты.`,
      `Ориентировочный расчёт с учётом сопровождения: $${total} (депозит $${Number(quoteDraft.depositUsd).toLocaleString('en-US')}, возвратный).`,
      `Подскажите, пожалуйста, удобный адрес доставки или номер рейса (MIA/OPF/FLL) — и мы сразу отправим защищённую ссылку на договор и оплату.`
    ].join(' ');
  }
  if (clientLanguage === 'es') {
    return [
      `Hola${name ? ` ${name}` : ''}, somos el equipo de Miami Elio.`,
      `Recibimos tu solicitud para ${item} (${dates}) y ya estamos confirmando disponibilidad exacta.`,
      `Estimación de referencia todo incluido: $${total} (depósito reembolsable $${Number(quoteDraft.depositUsd).toLocaleString('en-US')}).`,
      `Compártenos tu dirección de entrega o número de vuelo (MIA/OPF/FLL) y te enviaremos el enlace seguro de firma y pago de inmediato.`
    ].join(' ');
  }
  return [
    `Hi${name ? ` ${name}` : ''} — this is the Miami Elio team.`,
    `We received your request for ${item} (${dates}) and are confirming exact availability for you now.`,
    `Estimated all-in total: $${total} (refundable security hold $${Number(quoteDraft.depositUsd).toLocaleString('en-US')}).`,
    `Please confirm your delivery address or arrival flight (MIA/OPF/FLL) and we will send your secure e-sign & payment link right away.`
  ].join(' ');
}

function buildManagerTips({ request, matchedCar, forecast, availability, quoteDraft }) {
  const tips = [];
  if (availability?.promptLine) {
    tips.push(`Fleet calendar: ${availability.promptLine.slice(0, 140)}`);
  } else if (matchedCar) {
    tips.push(`Verified catalog rate: $${matchedCar.dailyPrice || quoteDraft.amountUsd}/day (${matchedCar.company || 'Miami Elio Fleet'}).`);
  }

  const rainy = Array.isArray(forecast?.periods)
    ? forecast.periods.find((p) => Number(p?.precipChance) >= 55)
    : null;
  if (rainy) {
    tips.push(`NOAA weather note: ${rainy.name} shows ${rainy.precipChance}% rain chance — mention Weather Shield or indoor dining backup.`);
  }

  if (request?.kind === 'car') {
    tips.push('Suggested upsell: Offer MIA/OPF tarmac-curbside delivery + a sunset yacht charter or Brickell dinner table.');
  } else if (request?.kind === 'stay') {
    tips.push('Suggested upsell: Bundle an SUV/exotic car delivered to the villa driveway with a 10% package perk.');
  } else {
    tips.push('Suggested upsell: Offer Group Split-Pay if traveling with friends, plus private airport transfer.');
  }
  return tips.slice(0, 3);
}

function buildDirectLinks(request, replyDraft) {
  const phoneDigits = String(request?.client_phone || '').replace(/\D/g, '');
  const telegramHandle = String(request?.client_phone || '').trim().startsWith('@')
    ? String(request.client_phone).trim().slice(1)
    : '';
  return {
    whatsappHref: phoneDigits.length >= 10
      ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(replyDraft)}`
      : null,
    telegramHref: telegramHandle
      ? `https://t.me/${encodeURIComponent(telegramHandle)}`
      : null
  };
}

async function generateAiReplyDraft({ request, quoteDraft, clientLanguage, managerTips, env }) {
  if (!env?.CONCIERGE_AI || env.CONCIERGE_WORKERS_AI_ENABLED !== 'true') return null;
  const targetLang = languageName(clientLanguage) || 'English';
  const system = [
    'You are the internal Team Copilot for Miami Elio (https://gorgona-one.com), drafting a short, warm, high-trust message for a live Miami Elio specialist to send to a client.',
    `Write strictly in ${targetLang}.`,
    'Never use the word "concierge" or its translations. Sound like a real human specialist from the Miami Elio team.',
    'Keep it to 3-4 crisp sentences (<= 550 chars), no markdown asterisks, no fabricated guarantees, and end with one clear next step (confirm delivery address/flight or ready for e-sign link).',
    'Return strict JSON: {"replyDraft":"...","extraTip":"..."}'
  ].join(' ');
  const user = JSON.stringify({
    clientName: request?.client_name || 'Guest',
    itemTitle: request?.item_title || '',
    kind: request?.kind || 'car',
    dates: request?.dates || '',
    status: request?.status || 'pending',
    estimatedTotalUsd: quoteDraft.amountUsd,
    refundableDepositUsd: quoteDraft.depositUsd,
    contextNotes: managerTips
  });

  for (const model of [COPILOT_PRIMARY_MODEL, COPILOT_FALLBACK_MODEL]) {
    try {
      const raw = await env.CONCIERGE_AI.run(model, {
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_completion_tokens: 320,
        temperature: 0.35,
        response_format: { type: 'json_object' },
        ...(model === COPILOT_PRIMARY_MODEL ? { reasoning_effort: 'none' } : {})
      });
      const content = raw?.choices?.[0]?.message?.content || raw?.response || '';
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      const draft = String(parsed?.replyDraft || '')
        .replace(/\bconcierge\b/gi, 'Miami Elio team')
        .replace(/консьерж\w*/giu, 'команда Miami Elio')
        .trim();
      if (draft.length >= 24) {
        return {
          replyDraft: draft.slice(0, 900),
          extraTip: typeof parsed?.extraTip === 'string' ? parsed.extraTip.trim().slice(0, 220) : ''
        };
      }
    } catch {
      // Fall through to fallback model / deterministic draft.
    }
  }
  return null;
}

export function adminCopilotHandlers(env = process.env, fetcher = fetch) {
  const guarded = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return failure(error);
    }
  };

  return {
    draftForRequest: guarded(async (request) => {
      const db = database(env, fetcher);
      const user = await db.identity(request);
      if (user.role !== 'admin') throw new RequestError(403, 'Access denied');

      const body = await readBody(request, 8192);
      const bookingId = body?.bookingId;
      if (!uuid(bookingId)) throw new RequestError(400, 'Invalid bookingId');

      const rows = await db.call(
        `/rest/v1/bookings?select=id,item_slug,item_title,dates,status,kind,client_name,client_email,client_phone,created_at&id=eq.${bookingId}&limit=1`,
        { service: true }
      );
      const booking = Array.isArray(rows) ? rows[0] : null;
      if (!booking) throw new RequestError(404, 'Booking not found');

      const sampleText = [booking.dates, booking.item_title, booking.client_name].filter(Boolean).join(' ');
      const clientLanguage = detectMessageLocale(sampleText, 'en');
      const matchedCar = findMatchingRental(booking);
      const quoteDraft = buildQuoteDraft(booking, matchedCar);
      const profile = extractTripProfile([{ role: 'user', content: `${booking.item_title || ''} ${booking.dates || ''}` }], new Date());

      const [forecast, availability] = await Promise.all([
        getMiamiForecast(fetcher).catch(() => null),
        checkPreInferenceFleetAvailability(profile, env, fetcher).catch(() => null)
      ]);

      const managerTips = buildManagerTips({ request: booking, matchedCar, forecast, availability, quoteDraft });
      const aiResult = await generateAiReplyDraft({ request: booking, quoteDraft, clientLanguage, managerTips, env });
      const replyDraft = aiResult?.replyDraft || buildFallbackReply({ request: booking, quoteDraft, clientLanguage });
      if (aiResult?.extraTip) managerTips.unshift(aiResult.extraTip);

      return json({
        ok: true,
        bookingId: booking.id,
        clientLanguage,
        engine: aiResult ? 'workers_ai' : 'deterministic',
        replyDraft,
        quoteDraft,
        managerTips: managerTips.slice(0, 4),
        directLinks: buildDirectLinks(booking, replyDraft)
      });
    }),

    messengerStatus: guarded(async (request) => {
      const db = database(env, fetcher);
      const user = await db.identity(request);
      if (user.role !== 'admin') throw new RequestError(403, 'Access denied');

      const [settings, threads] = await Promise.all([
        db.rpc('messenger_settings_get', {}).catch(() => ({
          mode: '24_7',
          telegramEnabled: true,
          whatsappEnabled: true,
          takeoverHours: 4
        })),
        db.rpc('messenger_threads_recent', { p_limit: 20 }).catch(() => [])
      ]);

      const base = SITE_URL.replace(/\/$/, '');
      return json({
        ok: true,
        settings,
        channels: {
          telegramConfigured: Boolean(env?.TELEGRAM_BOT_TOKEN && env?.TELEGRAM_WEBHOOK_SECRET),
          whatsappConfigured: Boolean(env?.WHATSAPP_ACCESS_TOKEN && env?.WHATSAPP_PHONE_NUMBER_ID && env?.WHATSAPP_APP_SECRET && env?.WHATSAPP_VERIFY_TOKEN),
          webhookUrls: {
            telegram: `${base}/api/webhooks/telegram`,
            whatsapp: `${base}/api/webhooks/whatsapp`
          }
        },
        threads: Array.isArray(threads) ? threads : []
      });
    }),

    messengerUpdate: guarded(async (request) => {
      const db = database(env, fetcher);
      const user = await db.identity(request);
      if (user.role !== 'admin') throw new RequestError(403, 'Access denied');

      const body = await readBody(request, 8192);
      const action = String(body?.action || 'settings');

      if (action === 'sync_telegram_webhook') {
        const botToken = String(env?.TELEGRAM_BOT_TOKEN || '').trim();
        const webhookSecret = String(env?.TELEGRAM_WEBHOOK_SECRET || '').trim();
        if (!botToken || webhookSecret.length < 16) {
          throw new RequestError(400, 'Telegram bot token or webhook secret is not configured');
        }
        const webhookUrl = `${SITE_URL.replace(/\/$/, '')}/api/webhooks/telegram`;
        const allowedUpdates = ['message', 'business_message'];
        const tgApi = async (method, payload) => {
          const res = await fetcher(`https://api.telegram.org/bot${botToken}/${method}`, {
            method: payload ? 'POST' : 'GET',
            signal: AbortSignal.timeout(8000),
            ...(payload ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {})
          });
          const data = await res.json().catch(() => null);
          return { ok: res.ok && Boolean(data?.ok), data };
        };

        const meRes = await tgApi('getMe');
        const setRes = await tgApi('setWebhook', {
          url: webhookUrl,
          secret_token: webhookSecret,
          allowed_updates: allowedUpdates,
          drop_pending_updates: false
        });
        if (!setRes.ok) {
          throw new RequestError(502, setRes.data?.description || 'Telegram setWebhook failed');
        }
        const infoRes = await tgApi('getWebhookInfo');
        const info = infoRes.data?.result || {};
        const me = meRes.data?.result || {};

        return json({
          ok: true,
          telegram: {
            botUsername: typeof me.username === 'string' ? me.username : null,
            botFirstName: typeof me.first_name === 'string' ? me.first_name : null,
            canConnectToBusiness: Boolean(me.can_connect_to_business),
            webhookUrl: typeof info.url === 'string' && info.url ? info.url : webhookUrl,
            allowedUpdates: Array.isArray(info.allowed_updates) && info.allowed_updates.length
              ? info.allowed_updates
              : allowedUpdates,
            pendingUpdateCount: Number(info.pending_update_count || 0),
            lastErrorMessage: typeof info.last_error_message === 'string' && info.last_error_message
              ? info.last_error_message.slice(0, 200)
              : null
          }
        });
      }

      if (action === 'pause' || action === 'resume') {
        const threadId = body?.threadId;
        if (!uuid(threadId)) throw new RequestError(400, 'Invalid threadId');
        const hours = Math.max(1, Math.min(48, Number(body?.hours) || 4));
        const pausedUntil = action === 'pause'
          ? new Date(Date.now() + hours * 3600 * 1000).toISOString()
          : null;
        const result = await db.rpc('messenger_thread_set_pause', {
          p_thread_id: threadId,
          p_paused_until: pausedUntil
        });
        return json({ ok: true, thread: result });
      }

      if (action !== 'settings') throw new RequestError(400, 'Invalid action');
      const mode = body?.mode;
      if (mode !== undefined && !['24_7', 'after_hours', 'copilot_only'].includes(mode)) {
        throw new RequestError(400, 'Invalid mode');
      }
      const takeoverHours = body?.takeoverHours !== undefined ? Number(body.takeoverHours) : null;
      if (takeoverHours !== null && (!Number.isInteger(takeoverHours) || takeoverHours < 1 || takeoverHours > 48)) {
        throw new RequestError(400, 'Invalid takeoverHours');
      }

      const updated = await db.rpc('messenger_settings_set', {
        p_mode: mode ?? null,
        p_telegram_enabled: typeof body?.telegramEnabled === 'boolean' ? body.telegramEnabled : null,
        p_whatsapp_enabled: typeof body?.whatsappEnabled === 'boolean' ? body.whatsappEnabled : null,
        p_takeover_hours: takeoverHours,
        p_actor: user.id
      });
      return json({ ok: true, settings: updated });
    })
  };
}
