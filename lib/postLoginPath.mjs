// Where a verified sign-in lands. The role comes from the protected database
// profile (readVerifiedSession), never from what the browser claims.
const HOME = { partner: '/partner', admin: '/admin' };

// Only same-site paths are honoured: "/x" but never "//host", "/\host" or a URL.
export function safeNextPath(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.length > 512) return null;
  if (next.startsWith('//') || next.startsWith('/\\') || /[\u0000-\u001f\\]/.test(next)) return null;
  try {
    const url = new URL(next, 'https://miami-elio.invalid');
    if (url.origin !== 'https://miami-elio.invalid') return null;
    if (url.pathname === '/login') return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function postLoginPath(role, next) {
  return safeNextPath(next) || HOME[role] || '/profile';
}
