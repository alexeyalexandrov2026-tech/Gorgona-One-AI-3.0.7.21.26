// ===========================================================================
// One chat transport for every AI surface (homepage GorgonaOneAI + AiDock).
//
// postChat() talks to /api/chat and transparently supports both server
// response modes:
//   - JSON (streaming disabled server-side): resolves with the payload.
//   - SSE:  invokes onDelta(chunkText) per token, onDelta(null) when the
//           server retracts already-sent tokens (an integrity guard fired -
//           reset any draft bubble), and resolves with the `final` payload,
//           whose shape is identical to JSON mode.
//
// Consumers therefore need exactly one code path and get streaming for free
// when the platform enables it.
// ===========================================================================

export async function postChat({ messages, locale, onDelta, signal }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json'
    },
    body: JSON.stringify({ messages, locale }),
    signal
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    return res.json();
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';
  let final = null;

  const handle = (name, dataText) => {
    let data;
    try {
      data = JSON.parse(dataText);
    } catch {
      return;
    }
    if (name === 'delta' && typeof data?.text === 'string') onDelta?.(data.text);
    else if (name === 'retract') onDelta?.(null);
    else if (name === 'final') final = data;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    // SSE frames are separated by a blank line.
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      eventName = '';
      let dataText = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataText += line.slice(5).trim();
      }
      if (eventName && dataText) handle(eventName, dataText);
    }
  }

  if (!final) throw new Error('chat stream ended without a final payload');
  return final;
}
