"use client";
import { LocalizedText } from "../LocalizedText";

import { useSavedText } from "../LocalizedText";

import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAiDock } from './AiDockProvider';
import { useConciergeChat } from './ChatProvider';

const AiConversation = lazy(() =>
  import('./AiConversation').then((m) => ({ default: m.AiConversation }))
);
import { useBodyScrollLock } from '../useBodyScrollLock';
import { useLocale } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18n';
import {useAI} from './AIProvider';
import {useDialogFocus} from './useDialogFocus';
import { configuredManagerTelegram, configuredManagerWhatsApp, configuredManagerWhatsAppHandoff } from '../../../lib/managerContact.mjs';
import { extractTripProfile } from '../../../lib/ai/tripProfile.mjs';
import { buildManagerHandoffUrl, getPageContext } from '../../../lib/ai/stage2Copy.mjs';
import { trackEvent } from '../../../lib/analytics';

const managerTelegramHref = configuredManagerTelegram();
const managerWhatsAppHref = configuredManagerWhatsApp();
const managerWhatsAppHandoffHref = configuredManagerWhatsAppHandoff();

export function AiDock() {
  const msg = useSavedText();
  const { isOpen, close } = useAiDock();
  const { messages, listings, plan, savedPrefs } = useConciergeChat();
  const pathname = usePathname() || '';
  const {closeRoom}=useAI(),panel=useRef(null);
  const [hasOpened, setHasOpened] = useState(false);
  useDialogFocus(isOpen,panel);
  useEffect(()=>{
    if(isOpen){
      setHasOpened(true);
      closeRoom();
      trackEvent('elio_open', { pagePath: pathname || '/' });
    }
  },[isOpen,closeRoom,pathname]);
  // The dock chrome follows the global switcher too - the transcript inside
  // it was already localized, so an English header was the odd one out.
  const locale = useLocale();
  const t = getTranslation(locale);
  const latestAssistant = [...messages].reverse().find((m) => m?.role === 'assistant') || null;
  const handoffPayload = {
    profile: extractTripProfile(messages, new Date(), savedPrefs),
    pageContext: getPageContext(pathname, locale),
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

  // Prevents the mobile scroll-jump this dialog's own text input used to
  // trigger - see useBodyScrollLock for the root cause.
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={msg("MIAMI ELIO AI Dock")}
        // The dock stays mounted when closed (it slides out on a transform,
        // and unmounting would throw away the scroll position). Closed, it is
        // only visually gone, so without `inert` its text input and buttons
        // stay tabbable and visible to screen readers - and on /discovery,
        // which renders its own copy of this conversation, that surfaced as
        // two identical "Ask the concierge" inputs on one page.
        inert={isOpen ? undefined : true}
        aria-hidden={!isOpen}
        className={`fixed bottom-0 right-0 z-50 flex h-[min(660px,90dvh)] w-full flex-col rounded-t-[1.75rem] border-t border-brand-gold/25 bg-[#07151e]/[0.97] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-xl transition-transform duration-300 sm:bottom-6 sm:right-6 sm:h-[min(600px,calc(100dvh-3rem))] sm:w-[420px] sm:rounded-[1.75rem] sm:border sm:p-5 ${
          isOpen ? "translate-y-0" : "translate-y-[110%]"
        }`}
      >
        <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]" aria-hidden="true" />
            <p className="truncate text-sm font-semibold tracking-wide text-white">{msg("ELIO+ Guide")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {smartWhatsAppHref && (
              <a
                href={smartWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.ai?.liveManagerWhatsApp || 'Message a live manager on WhatsApp'}
                title={t.ai?.liveManagerWhatsApp || 'Message a live manager on WhatsApp'}
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
                aria-label={t.ai?.liveManager || 'Message a live manager on Telegram'}
                title={t.ai?.liveManager || 'Message a live manager on Telegram'}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-brand-gold transition hover:border-brand-gold hover:bg-brand-gold/10"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M21.2 3.6 2.9 10.7c-.9.4-.9 1.6 0 1.9l4.6 1.5 1.8 5.4c.3.8 1.3 1 1.9.4l2.6-2.5 4.6 3.4c.7.5 1.7.1 1.9-.7L22.6 4.9c.2-.9-.6-1.6-1.4-1.3Z" />
                  <path d="m7.5 14.1 10-7.1-7.6 8.4" />
                </svg>
              </a>
            )}
            <Link
              href="/discovery"
              onClick={close}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-brand-gold hover:text-brand-gold"
            >
              {t.ai?.discoveryRoom || <LocalizedText source={"Discovery Room"} />}
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label={t.ai?.closeAI || 'Close AI Dock'}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-zinc-200 transition hover:border-brand-gold hover:text-brand-gold"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {/* Following a card navigates the page underneath, so the dock gets
              out of the way. The thread lives in ChatProvider and is waiting
              when the guest reopens it. Lazy-mounted on first open to keep the
              initial JS bundle light on every route. */}
          {hasOpened ? (
            <Suspense fallback={null}>
              <AiConversation variant="dock" active={isOpen} onNavigate={close} />
            </Suspense>
          ) : null}
        </div>
      </aside>
    </>
  );
}
