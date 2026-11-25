// Live-manager direct contact channels for Miami Elio (Telegram Business,
// WhatsApp Business, and official Miami business phone line).
//
// NEXT_PUBLIC_MANAGER_TELEGRAM, NEXT_PUBLIC_MANAGER_WHATSAPP, and
// NEXT_PUBLIC_MANAGER_PHONE override defaults at build/runtime when set.
export const MANAGER_TELEGRAM = '@MIAMI_ELIO';

// Official Miami Elio WhatsApp Business shortlink (or E.164 digits / https://wa.me/<digits>).
export const MANAGER_WHATSAPP = 'https://wa.me/message/VO7GCPZCDKRZO1';

// Official Miami Elio US business phone line (+1 786-492-8880).
export const MANAGER_PHONE = '+1 786-492-8880';

// Telegram usernames: 5-32 characters, letters, digits and underscores.
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9]$/;
// E.164 digits without leading zero: 7-15 digits.
const WHATSAPP_DIGITS = /^[1-9]\d{6,14}$/;
// WhatsApp Business official shortlink code: https://wa.me/message/<CODE>.
const WHATSAPP_MESSAGE_LINK = /^(?:https:\/\/)?wa\.me\/message\/([A-Za-z0-9_-]{6,32})\/?$/i;

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

// Returns a safe https://wa.me/message/<CODE> or https://wa.me/<digits> URL,
// or null when empty or malformed.
export function managerWhatsAppUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const messageMatch = raw.match(WHATSAPP_MESSAGE_LINK);
  if (messageMatch) return 'https://wa.me/message/' + messageMatch[1];
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

// Normalizes a public phone string into { display, e164, href }, or null if invalid.
export function managerPhoneInfo(value) {
  if (typeof value !== 'string') return null;
  const display = value.trim();
  if (!display) return null;
  const digits = display.replace(/[\s().-]+/g, '').replace(/^\+/, '');
  if (!WHATSAPP_DIGITS.test(digits)) return null;
  const e164 = '+' + digits;
  return { display, e164, href: 'tel:' + e164 };
}

export function configuredManagerTelegram() {
  const fromBuild = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MANAGER_TELEGRAM : undefined;
  return managerTelegramUrl(fromBuild || MANAGER_TELEGRAM);
}

export function configuredManagerWhatsApp() {
  const fromBuild = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MANAGER_WHATSAPP : undefined;
  return managerWhatsAppUrl(fromBuild || MANAGER_WHATSAPP);
}

export function configuredManagerPhone() {
  const fromBuild = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MANAGER_PHONE : undefined;
  return managerPhoneInfo(fromBuild || MANAGER_PHONE);
}

// Returns a numeric https://wa.me/<digits> endpoint suitable for prefilled
// `?text=...` AI handoff messages (falls back to configuredManagerWhatsApp()).
export function configuredManagerWhatsAppHandoff() {
  const phone = configuredManagerPhone();
  if (phone) return managerWhatsAppUrl(phone.e164);
  return configuredManagerWhatsApp();
}
