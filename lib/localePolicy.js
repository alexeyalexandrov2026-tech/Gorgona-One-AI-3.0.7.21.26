// These pages contain live supplier documents. A locale change must update
// our client-side text without refreshing the route or replacing an iframe.
export const EMBED_LOCALE_PATHS = ['/yachts', '/vacation-rentals'];

export function canRefreshForLocale(pathname) {
  if (typeof pathname !== 'string' || !pathname) return false;
  const path = pathname.replace(/\/+$/, '') || '/';
  return !EMBED_LOCALE_PATHS.includes(path);
}
