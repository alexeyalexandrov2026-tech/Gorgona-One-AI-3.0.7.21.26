// Live-manager chat contacts for the floating Telegram & WhatsApp chips.
// Public surface is chat-only; direct phone line unlocks only after booking confirmation.
//
// Set MANAGER_TELEGRAM to the manager's public Telegram username (for example
// '@miamielio_concierge') or link ('https://t.me/miamielio_concierge'). While it
// is empty, the button is not rendered at all. NEXT_PUBLIC_MANAGER_TELEGRAM, if
// set at build time, takes precedence.
export const MANAGER_TELEGRAM = '@Avo_ale';

// Optional public WhatsApp chat number (E.164 digits or https://wa.me/<digits>).
// Remains hidden until configured via NEXT_PUBLIC_MANAGER_WHATSAPP or MANAGER_WHATSAPP.
export const MANAGER_WHATSAPP = '';

// Telegram usernames: 5-32 characters, letters, digits and underscores.
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9]$/;
// E.164 digits without leading zero: 7-15 digits.
const WHATSAPP_DIGITS = /^[1-9]\d{6,14}$/;

// Returns a safe https://t.me/<username> URL, or null when the value is empty
// or anything other than a plain public username.
export function managerTelegramUrl(value) {
  if (typeof value !== 'string') return null;
  let name = value.trim();
  if (!name) return null;
  if (name.startsWith('@')) name = name.slice(1);
  else {
    const match = name.match(/^(?:https:\/\/)?(?:t\.me|telegram\.me)\/([^/?#\s]+)\/?$/i);
    if (!match) return USERNAME.test(name) ? 'https://t.me/' + name : null;
    name = match[1];
  }
  return USERNAME.test(name) ? 'https://t.me/' + name : null;
}

// Returns a safe https://wa.me/<digits> URL, or null when empty or malformed.
export function managerWhatsAppUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  let digits = raw;
  if (/^(?:https:\/\/)?wa\.me\//i.test(raw)) {
    const match = raw.match(/^(?:https:\/\/)?wa\.me\/([0-9]+)\/?$/i);
    if (!match) return null;
    digits = match[1];
  } else if (/^https?:\/\//i.test(raw)) {
    return null;
  } else {
    digits = raw.replace(/[\s().-]+/g, '').replace(/^\+/, '');
  }
  return WHATSAPP_DIGITS.test(digits) ? 'https://wa.me/' + digits : null;
}

export function configuredManagerTelegram() {
  const fromBuild = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MANAGER_TELEGRAM : undefined;
  return managerTelegramUrl(fromBuild || MANAGER_TELEGRAM);
}

export function configuredManagerWhatsApp() {
  const fromBuild = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MANAGER_WHATSAPP : undefined;
  return managerWhatsAppUrl(fromBuild || MANAGER_WHATSAPP);
}
