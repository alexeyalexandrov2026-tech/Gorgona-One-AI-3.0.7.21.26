"use client";

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'gorgona-install-dismissed-at';
const DISMISS_DAYS = 14;

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
}

function isIOS() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

function wasRecentlyDismissed() {
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < DISMISS_DAYS;
}

function ShareIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

// "Add to Home Screen" for the AI concierge. Android/desktop Chrome fires
// beforeinstallprompt and can be installed with one tap; iOS Safari has no
// such API, so guests there get explicit Share-sheet instructions instead.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return undefined;
    setDismissed(wasRecentlyDismissed());

    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    if (isIOS()) setShowIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl border border-brand-gold/30 bg-[#0a0a0a]/95 p-4 shadow-premium backdrop-blur-xl sm:left-8 sm:right-auto sm:bottom-8">
      <div className="flex items-start gap-3">
        <div className="relative h-9 w-9 shrink-0">
          <span className="ai-sphere__glow" aria-hidden="true" />
          <span className="ai-sphere h-full w-full" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Add GORGONA ONE to your Home Screen</p>
          {deferredPrompt ? (
            <>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Install the app for a focused, standalone concierge experience.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="rounded-full bg-brand-gold px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110"
                >
                  Install
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 transition hover:text-white"
                >
                  Not now
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 flex flex-wrap items-center gap-1 text-xs leading-relaxed text-zinc-400">
                Tap <ShareIcon className="inline h-3.5 w-3.5 text-brand-gold" /> Share, then
                <span className="text-white">&ldquo;Add to Home Screen&rdquo;</span>.
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="mt-3 rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 transition hover:text-white"
              >
                Got it
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
