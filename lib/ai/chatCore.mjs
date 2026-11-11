// ===========================================================================
// Miami Elio — concierge chat core (pure, dependency-free).
//
// Everything /api/chat needs that is not network I/O: making guest input safe
// to hand to a model, tidying what a model hands back, and keeping one guest
// from spending everybody's quota. Kept as plain functions with no imports so
// the tests can exercise them directly, without Next.js or a Cloudflare
// runtime.
// ===========================================================================

export const MAX_MESSAGES = 12;
export const MAX_MESSAGE_CHARS = 2000;
export const MAX_REPLY_CHARS = 2400;
// A chat request is a short transcript. Anything this large is not a guest.
export const MAX_BODY_BYTES = 64 * 1024;

const ROLES = new Set(['user', 'assistant']);

/**
 * Reduce whatever the client sent to a transcript a model can take.
 *
 * The body is untrusted: entries may be null, carry a forged `system` role, or
 * hold non-string content. Only user/assistant turns with real text survive,
 * each clipped, and the transcript always ends on the guest's own turn - the
 * turn being answered. Never throws.
 *
 * @returns {Array<{role: 'user'|'assistant', content: string}>}
 */
export function sanitizeMessages(raw, { maxMessages = MAX_MESSAGES, maxChars = MAX_MESSAGE_CHARS } = {}) {
  if (!Array.isArray(raw)) return [];

  const turns = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    if (!ROLES.has(entry.role) || typeof entry.content !== 'string') continue;
    const content = entry.content.trim().slice(0, maxChars);
    if (content) turns.push({ role: entry.role, content });
  }

  while (turns.length && turns[turns.length - 1].role !== 'user') turns.pop();
  return turns.slice(-maxMessages);
}

/** The guest's newest message - what cards and suggestions are matched on. */
export function latestUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

/**
 * Turn a model's reply into the plain text the chat bubble renders.
 *
 * The bubble shows text verbatim, so markdown arrives as literal asterisks and
 * pound signs. The prompt asks for plain text; this is the guarantee for the
 * models that ignore it.
 */
export function cleanReply(text) {
  let out = String(text ?? '').replace(/\r\n?/g, '\n');

  // Code fences and inline code: keep the words, drop the punctuation.
  out = out.replace(/```[a-z]*\n?/gi, '').replace(/`([^`\n]+)`/g, '$1');
  // [Yacht Rentals](/yachts) -> Yacht Rentals (/yachts); a bare autolink stays a URL.
  out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, label, url) => (label === url ? url : `${label} (${url})`));
  // Headings and block quotes.
  out = out.replace(/^[ \t]*#{1,6}[ \t]+/gm, '').replace(/^[ \t]*>[ \t]?/gm, '');
  // Bullets become a real bullet before the emphasis pass eats their asterisk.
  out = out.replace(/^[ \t]*[*+-][ \t]+/gm, '• ');
  // **bold**, __bold__, *italic*.
  out = out.replace(/(\*\*|__)(.+?)\1/g, '$2').replace(/(?<![\p{L}\p{N}*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![\p{L}\p{N}*])/gu, '$1');
  out = out.replace(/\*\*/g, '');

  out = out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (out.length > MAX_REPLY_CHARS) out = `${out.slice(0, MAX_REPLY_CHARS).trimEnd()}…`;
  return out;
}

// Placeholders that leak when an upstream redacts the prompt ("[ADDRESS] Villa"
// where a venue name belongs) and the one-word verdicts of a classifier model
// answering a question it was never meant to see.
const REDACTION_MARKER = /\[(?:[A-Z]{2,}_)*(?:ADDRESS|LOCATION|EMAIL|PHONE|NAME|PERSON|CITY)(?:_[A-Z]{2,})*\]/;

/** Whether a (cleaned) reply is something a guest should be shown. */
export function isUsableReply(text) {
  const reply = String(text ?? '').trim();
  if (reply.length < 2) return false;
  if (/^(safe|unsafe|harmful|harmless)[.!\s]*$/i.test(reply)) return false;
  return !REDACTION_MARKER.test(reply);
}

/** localhost / 127.x / ::1 - an address a Cloudflare Worker can never reach. */
export function isLoopbackUrl(url) {
  try {
    const host = new URL(String(url)).hostname.replace(/^\[|\]$/g, '').toLowerCase();
    return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0' || /^127\./.test(host);
  } catch {
    return false;
  }
}

/**
 * The address a request came from, or null when nothing trustworthy says.
 * Cloudflare sets cf-connecting-ip itself and a client cannot forge it there.
 */
export function clientAddress(headers) {
  const read = (name) => String(headers?.get?.(name) || '').split(',')[0].trim();
  return read('cf-connecting-ip') || read('x-real-ip') || read('x-forwarded-for') || null;
}

/**
 * Fixed-window request counter, per key.
 *
 * State lives in this isolate only, so it is a brake on a single noisy client
 * rather than an exact global quota - which is all a guest-facing chat needs to
 * stop one tab from draining the model allowance.
 */
export function createRateLimiter({ limit = 20, windowMs = 60_000, maxKeys = 5000, now = Date.now } = {}) {
  const windows = new Map(); // key -> { startedAt, count }

  return function allow(key) {
    if (!key) return true;
    const at = now();
    const current = windows.get(key);

    if (!current || at - current.startedAt >= windowMs) {
      if (windows.size >= maxKeys) {
        for (const [k, w] of windows) if (at - w.startedAt >= windowMs) windows.delete(k);
        // Still full of live windows: drop the oldest rather than grow forever.
        if (windows.size >= maxKeys) windows.delete(windows.keys().next().value);
      }
      windows.set(key, { startedAt: at, count: 1 });
      return true;
    }

    current.count += 1;
    return current.count <= limit;
  };
}
