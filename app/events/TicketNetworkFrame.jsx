'use client';

import { useEffect, useRef, useState } from 'react';

export function TicketNetworkFrame({ category, document }) {
  const frame = useRef(null);
  const [height, setHeight] = useState(220);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    function receive(event) {
      const data = event.data;
      // Sandboxed srcDoc has an opaque origin; authenticate the sender by its
      // window instead of trusting an arbitrary message with a matching type.
      if (event.source !== frame.current?.contentWindow || data?.category !== category) return;
      if (data.type === 'gorgona-ticketnetwork-retry') {
        setHeight(220);
        setRevision(value => value + 1);
        return;
      }
      if (data.type !== 'gorgona-ticketnetwork') return;
      if (Number.isFinite(data.height) && data.height >= 100 && data.height <= 30000) setHeight(Math.ceil(data.height));
    }
    window.addEventListener('message', receive);
    frame.current?.contentWindow?.postMessage({ type: 'gorgona-ticketnetwork-measure' }, '*');
    return () => window.removeEventListener('message', receive);
  }, [category]);

  return (
    <iframe
      key={`${category}:${revision}`}
      ref={frame}
      title={`TicketNetwork ${category} events`}
      srcDoc={document}
      onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'gorgona-ticketnetwork-measure' }, '*')}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="strict-origin-when-cross-origin"
      loading="lazy"
      className="mt-8 block w-full border-0"
      style={{ height }}
    />
  );
}
