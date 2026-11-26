"use client";

import { useEffect, useState } from 'react';
import { useConciergeChat } from './ChatProvider';
import { extractTripProfile } from '../../../lib/ai/tripProfile.mjs';
import { buildManagerHandoffUrl } from '../../../lib/ai/stage2Core.mjs';

// Lazy-loaded only after the guest opens ELIO+ Guide so the heavy ecosystem
// index and trip-profile parser never ship on initial page load.
export function AiDockHandoffButtons({
  pathname,
  locale,
  managerTelegramHref,
  managerWhatsAppHref,
  managerWhatsAppHandoffHref,
  whatsAppLabel,
  telegramLabel
}) {
  const { messages, listings, plan, savedPrefs } = useConciergeChat();
  const [pageContext, setPageContext] = useState(null);
  useEffect(() => {
    if (!pathname || pathname === '/' || pathname === '/discovery') {
      setPageContext(null);
      return undefined;
    }
    let active = true;
    import('../../../lib/ai/stage2Copy.mjs')
      .then(({ getPageContext }) => {
        if (active) setPageContext(getPageContext(pathname, locale));
      })
      .catch(() => {
        if (active) setPageContext(null);
      });
    return () => { active = false; };
  }, [pathname, locale]);
  const latestAssistant = [...messages].reverse().find((m) => m?.role === 'assistant') || null;
  const handoffPayload = {
    profile: extractTripProfile(messages, new Date(), savedPrefs),
    pageContext,
    messages,
    listings,
    plan,
    handoffSummary: latestAssistant?.handoffSummary || '',
    locale
  };
  const smartTelegramHref = managerTelegramHref
    ? buildManagerHandoffUrl({ baseHref: managerTelegramHref, ...handoffPayload })
    : null;
  const smartWhatsAppHref = managerWhatsAppHref
    ? buildManagerHandoffUrl({
        baseHref: managerWhatsAppHref,
        textBaseHref: managerWhatsAppHandoffHref,
        ...handoffPayload
      })
    : null;

  return (
    <>
      {smartWhatsAppHref && (
        <a
          href={smartWhatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={whatsAppLabel}
          title={whatsAppLabel}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-brand-gold transition hover:border-brand-gold hover:bg-brand-gold/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Z" />
            <path d="M9.4 9.1c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.2.1.5-.1.7l-.5.6c-.1.2-.2.4 0 .6.4.8 1.2 1.5 2 1.9.2.1.5.1.6-.1l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.3.4.5v.5c0 .4-.2.8-.6 1-.5.3-1.2.4-1.9.2-1.9-.5-4.3-2.6-5.1-4.8-.3-.8-.2-1.5.1-2Z" />
          </svg>
        </a>
      )}
      {smartTelegramHref && (
        <a
          href={smartTelegramHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={telegramLabel}
          title={telegramLabel}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-brand-gold transition hover:border-brand-gold hover:bg-brand-gold/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M21.2 3.6 2.9 10.7c-.9.4-.9 1.6 0 1.9l4.6 1.5 1.8 5.4c.3.8 1.3 1 1.9.4l2.6-2.5 4.6 3.4c.7.5 1.7.1 1.9-.7L22.6 4.9c.2-.9-.6-1.6-1.4-1.3Z" />
            <path d="m7.5 14.1 10-7.1-7.6 8.4" />
          </svg>
        </a>
      )}
    </>
  );
}
