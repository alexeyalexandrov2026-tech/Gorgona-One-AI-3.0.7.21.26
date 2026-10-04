// HTML-escapes a value for interpolation into an email body. Everything that
// reaches an admin email (guest booking fields, partner names) is typed by
// someone outside the team, so nothing interpolated is trusted.
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
