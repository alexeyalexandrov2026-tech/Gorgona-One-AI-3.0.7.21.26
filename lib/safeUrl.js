// Returns `value` normalized when it is an absolute https: URL, otherwise null.
//
// Used wherever a URL typed by someone outside the team is rendered as a link
// or image source (partner listing images in the admin console): React 18
// still renders `javascript:` and `data:` hrefs, so they must be dropped here.
export function safeHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
