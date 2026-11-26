// Validate and normalize an internal site pathname (zero query/hash/external URLs).
// Kept standalone so lightweight client modules never pull server RAG helpers.
export function normalizePagePath(raw) {
  if (typeof raw !== 'string') return '';
  const clean = raw.split(/[?#]/)[0].trim();
  if (!clean || clean.length > 160) return '';
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(clean) || clean.includes('..') || clean.includes('//')) return '';
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
}
