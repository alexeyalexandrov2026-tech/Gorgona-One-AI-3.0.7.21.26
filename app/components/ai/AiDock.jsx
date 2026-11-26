"use client";
import { LocalizedText, useSavedText } from "../LocalizedText";

import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAiDock } from './AiDockProvider';

const AiConversation = lazy(() =>
  import('./AiConversation').then((m) => ({ default: m.AiConversation }))
);
const AiDockHandoffButtons = lazy(() =>
  import('./AiDockHandoffButtons').then((m) => ({ default: m.AiDockHandoffButtons }))
);
import { useBodyScrollLock } from '../useBodyScrollLock';
import { useLocale } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18nClient';
import {useAI} from './AIProvider';
import {useDialogFocus} from './useDialogFocus';
import { configuredManagerTelegram, configuredManagerWhatsApp, configuredManagerWhatsAppHandoff } from '../../../lib/managerContact.mjs';
import { trackEvent } from '../../../lib/analytics';

const managerTelegramHref = configuredManagerTelegram();
const managerWhatsAppHref = configuredManagerWhatsApp();
const managerWhatsAppHandoffHref = configuredManagerWhatsAppHandoff();

export function AiDock() {
  const msg = useSavedText();
  const { isOpen, close } = useAiDock();
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
  const whatsAppLabel = t.ai?.liveManagerWhatsApp || 'Message a live manager on WhatsApp';
  const telegramLabel = t.ai?.liveManager || 'Message a live manager on Telegram';

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
            {hasOpened ? (
              <Suspense fallback={null}>
                <AiDockHandoffButtons
                  pathname={pathname}
                  locale={locale}
                  managerTelegramHref={managerTelegramHref}
                  managerWhatsAppHref={managerWhatsAppHref}
                  managerWhatsAppHandoffHref={managerWhatsAppHandoffHref}
                  whatsAppLabel={whatsAppLabel}
                  telegramLabel={telegramLabel}
                />
              </Suspense>
            ) : null}
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
