// ===========================================================================
// Telegram Bot + Telegram Business (@MIAMI_ELIO) Webhook Handler.
//
// Security:
//   - Requires constant-time match on X-Telegram-Bot-Api-Secret-Token
//   - Fails closed (503) if TELEGRAM_WEBHOOK_SECRET is not configured
//   - Ignores bots, group chats, channels, and owner alert chat
//   - Supports Telegram Business (`business_message`) with instant Human Takeover
//     when the business owner replies inside the client thread
// ===========================================================================

import { json, failure, readBody, RequestError } from './dashboardCore.mjs';
import { processIncomingMessengerTurn } from './messengerAgent.mjs';

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sendTelegramReply({ chatId, businessConnectionId, text }, env, fetcher = fetch) {
  if (!env?.TELEGRAM_BOT_TOKEN || !chatId || !text) return false;
  const payload = {
    chat_id: chatId,
    text,
    allow_paid_broadcast: false,
    link_preview_options: { is_disabled: false },
    ...(businessConnectionId ? { business_connection_id: businessConnectionId } : {})
  };
  try {
    const res = await fetcher(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch {
    return false;
  }
}

function extractName(from) {
  if (!from || typeof from !== 'object') return '';
  return [from.first_name, from.last_name].filter(Boolean).join(' ').trim().slice(0, 110);
}

export function telegramWebhookHandlers(env = process.env, fetcher = fetch) {
  return {
    async post(request) {
      try {
        const expectedSecret = String(env?.TELEGRAM_WEBHOOK_SECRET || '');
        if (expectedSecret.length < 16) throw new RequestError(503, 'Telegram webhook not configured');
        const suppliedSecret = request.headers.get('x-telegram-bot-api-secret-token') || '';
        if (!constantTimeEqual(suppliedSecret, expectedSecret)) {
          throw new RequestError(401, 'Unauthorized');
        }

        const update = await readBody(request, 65536);
        const isBusiness = Boolean(update.business_message && typeof update.business_message === 'object');
        const msg = isBusiness ? update.business_message : update.message;
        if (!msg || typeof msg !== 'object') return json({ ok: true, action: 'ignored' });

        if (msg.chat?.type !== 'private') return json({ ok: true, action: 'ignored_non_private' });
        if (msg.from?.is_bot) return json({ ok: true, action: 'ignored_bot' });

        const chatId = String(msg.chat?.id || '');
        const fromId = String(msg.from?.id || '');
        const ownerId = String(env?.TELEGRAM_OWNER_CHAT_ID || '').trim();
        if (!chatId) return json({ ok: true, action: 'ignored' });

        // Standard bot messages from the owner's alert chat are ignored so owner alerts never loop.
        if (!isBusiness && ownerId && chatId === ownerId) {
          return json({ ok: true, action: 'ignored_owner_chat' });
        }

        const rawText = typeof msg.text === 'string'
          ? msg.text
          : typeof msg.caption === 'string'
            ? msg.caption
            : '';
        const text = rawText.trim();

        // In Telegram Business (`business_message`), when the business owner replies to a customer,
        // `msg.from.id` differs from `msg.chat.id` (the customer's chat id) or matches TELEGRAM_OWNER_CHAT_ID.
        const isFromBusinessOwner = isBusiness && (
          (ownerId && fromId === ownerId) || (fromId && chatId && fromId !== chatId)
        );

        if (!text && !isFromBusinessOwner) return json({ ok: true, action: 'ignored_non_text' });

        const customerName = isFromBusinessOwner ? '' : extractName(msg.from);
        const customerHandle = isFromBusinessOwner
          ? ''
          : (msg.from?.username ? `@${msg.from.username}` : '');

        const normalizedText = text === '/start'
          ? 'Hello, I want to explore Miami Elio (yachts, cars, villas, dining, events).'
          : text;

        const result = await processIncomingMessengerTurn({
          channel: 'telegram',
          externalChatId: chatId,
          businessConnectionId: isBusiness ? String(msg.business_connection_id || '') || null : null,
          providerMessageId: msg.message_id ? `tg:${chatId}:${msg.message_id}` : null,
          customerName,
          customerHandle,
          text: normalizedText,
          isFromBusinessOwner,
          env,
          fetcher
        });

        let delivered = false;
        if (result.replyText) {
          delivered = await sendTelegramReply({
            chatId,
            businessConnectionId: isBusiness ? String(msg.business_connection_id || '') || null : null,
            text: result.replyText
          }, env, fetcher);
        }

        return json({
          ok: true,
          action: result.action,
          delivered,
          ...(result.bookingId ? { bookingId: result.bookingId } : {})
        });
      } catch (error) {
        return failure(error);
      }
    }
  };
}
