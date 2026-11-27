// ===========================================================================
// Meta WhatsApp Business Cloud API Webhook Handler.
//
// Security:
//   - GET: Constant-time hub.verify_token verification for Meta webhook setup
//   - POST: Strict Web Crypto HMAC-SHA256 verification of X-Hub-Signature-256
//           against WHATSAPP_APP_SECRET (fails closed if secret missing/wrong)
//   - Replies inside Meta's free 24-hour customer service window via Graph API
// ===========================================================================

import { json, failure, RequestError } from './dashboardCore.mjs';
import { processIncomingMessengerTurn } from './messengerAgent.mjs';

const GRAPH_VERSION = 'v21.0';
const MAX_WEBHOOK_BYTES = 131072;

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signMetaWebhookPayload(rawBody, appSecret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hex}`;
}

async function sendWhatsAppReply({ to, text }, env, fetcher = fetch) {
  if (!env?.WHATSAPP_ACCESS_TOKEN || !env?.WHATSAPP_PHONE_NUMBER_ID || !to || !text) return false;
  try {
    const res = await fetcher(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}/messages`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: String(to).replace(/\D/g, ''),
          type: 'text',
          text: { body: text, preview_url: true }
        })
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

function extractWhatsAppText(msg) {
  if (!msg || typeof msg !== 'object') return '';
  if (msg.type === 'text' && typeof msg.text?.body === 'string') return msg.text.body.trim();
  if (msg.type === 'button' && typeof msg.button?.text === 'string') return msg.button.text.trim();
  if (msg.type === 'interactive') {
    return String(msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '').trim();
  }
  return '';
}

export function whatsappWebhookHandlers(env = process.env, fetcher = fetch) {
  return {
    async get(request) {
      try {
        const expected = String(env?.WHATSAPP_VERIFY_TOKEN || '');
        if (expected.length < 8) throw new RequestError(503, 'WhatsApp webhook not configured');
        const url = new URL(request.url);
        const mode = url.searchParams.get('hub.mode') || '';
        const token = url.searchParams.get('hub.verify_token') || '';
        const challenge = url.searchParams.get('hub.challenge') || '';
        if (mode === 'subscribe' && constantTimeEqual(token, expected) && challenge) {
          return new Response(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
          });
        }
        throw new RequestError(403, 'Forbidden');
      } catch (error) {
        return failure(error);
      }
    },

    async post(request) {
      try {
        const appSecret = String(env?.WHATSAPP_APP_SECRET || '');
        if (appSecret.length < 16) throw new RequestError(503, 'WhatsApp webhook not configured');
        const signatureHeader = request.headers.get('x-hub-signature-256') || '';
        const rawBody = await request.text();
        if (!rawBody || rawBody.length > MAX_WEBHOOK_BYTES) throw new RequestError(413, 'Request too large');

        const expectedSig = await signMetaWebhookPayload(rawBody, appSecret);
        if (!constantTimeEqual(signatureHeader.toLowerCase(), expectedSig.toLowerCase())) {
          throw new RequestError(401, 'Invalid signature');
        }

        let payload;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          throw new RequestError(400, 'Invalid JSON');
        }

        const results = [];
        const entries = Array.isArray(payload?.entry) ? payload.entry : [];
        for (const entry of entries) {
          const changes = Array.isArray(entry?.changes) ? entry.changes : [];
          for (const change of changes) {
            const value = change?.value;
            if (!value || !Array.isArray(value.messages)) continue;
            const contacts = new Map(
              (Array.isArray(value.contacts) ? value.contacts : []).map((c) => [String(c.wa_id || ''), c.profile?.name || ''])
            );

            for (const msg of value.messages.slice(0, 5)) {
              const from = String(msg?.from || '').replace(/\D/g, '');
              const text = extractWhatsAppText(msg);
              if (!from || !text) continue;

              const turn = await processIncomingMessengerTurn({
                channel: 'whatsapp',
                externalChatId: from,
                providerMessageId: msg.id ? `wa:${msg.id}` : null,
                customerName: contacts.get(from) || '',
                customerHandle: `+${from}`,
                text,
                isFromBusinessOwner: false,
                env,
                fetcher
              });

              let delivered = false;
              if (turn.replyText) {
                delivered = await sendWhatsAppReply({ to: from, text: turn.replyText }, env, fetcher);
              }
              results.push({ id: msg.id || null, action: turn.action, delivered });
            }
          }
        }

        return json({ ok: true, processed: results.length, results });
      } catch (error) {
        return failure(error);
      }
    }
  };
}
