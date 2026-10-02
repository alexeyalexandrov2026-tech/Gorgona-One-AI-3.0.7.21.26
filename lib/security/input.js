// Helpers for values that arrive from the browser and end up in emails or
// the database. Server-only; nothing here trusts the caller.

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Trimmed, length-capped text. Returns '' for missing values.
export function cleanText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

// For email subjects and other header values: no line breaks.
export function singleLine(value, maxLength) {
  return cleanText(value, maxLength).replace(/[\r\n]+/g, ' ');
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? ''));
}
