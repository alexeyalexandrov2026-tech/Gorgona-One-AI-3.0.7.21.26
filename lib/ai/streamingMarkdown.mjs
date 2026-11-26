// Strip stray markdown markers cleanly during live streaming (handles partial bold/heading syntax).
// Kept standalone so ChatProvider does not bundle server-side FactGuard regex tables on initial page load.
export function stripStreamingMarkdown(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\*\*([^*\n]{1,180})\*\*/g, '$1')
    .replace(/__([^_\n]{1,180})__/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/^[ \t]*#{1,4}[ \t]+/gm, '')
    .replace(/^[ \t]*\*[ \t]+/gm, '• ');
}
