// Live-manager contact for the floating Telegram button.
//
// Set MANAGER_TELEGRAM to the manager's public Telegram username (for example
// '@miamielio_concierge') or link ('https://t.me/miamielio_concierge'). While it
// is empty, the button is not rendered at all. NEXT_PUBLIC_MANAGER_TELEGRAM, if
// set at build time, takes precedence.
export const MANAGER_TELEGRAM = '@Avo_ale';

// Telegram usernames: 5-32 characters, letters, digits and underscores.
const USERNAME = /^[A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9]$/;

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

export function configuredManagerTelegram() {
  const fromBuild = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MANAGER_TELEGRAM : undefined;
  return managerTelegramUrl(fromBuild || MANAGER_TELEGRAM);
}
