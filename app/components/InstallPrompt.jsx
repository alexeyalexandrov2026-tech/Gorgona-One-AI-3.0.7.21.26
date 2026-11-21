"use client";
import { LocalizedText, useSavedText } from "./LocalizedText";

import { useEffect, useState } from 'react';
import { APP_ICON, GOOGLE_PLAY_URL } from '../../lib/appLinks';
import { isMiamiElioApp } from './AnalyticsBeacon';

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

function isAndroid() {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
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

// "Add to Home Screen" for the AI concierge. Android phones have the real
// Miami Elio app, so guests there are sent to it on Google Play instead.
// Desktop Chrome fires beforeinstallprompt and can be installed with one tap;
// iOS Safari has no such API, so guests there get Share-sheet instructions.
export function InstallPrompt() {
  const msg = useSavedText();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showPlay, setShowPlay] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return undefined;
    // Inside the app itself there is nothing to install.
    if (isMiamiElioApp(window.navigator.userAgent, document.documentElement.dataset.app)) return undefined;
    setDismissed(wasRecentlyDismissed());
    const android = isAndroid();

    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      if (!android) setDeferredPrompt(event);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    if (android) setShowPlay(true);
    else if (isIOS()) setShowIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  // On phones the hint sits at the height of the AI pill and the concierge
  // sphere. While it is open the floating launchers step aside (CSS keyed on
  // this attribute) so nothing overlaps; they return as soon as it closes.
  const visible = !dismissed && Boolean(showPlay || deferredPrompt || showIosHint);
  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.dataset.installPrompt = 'open';
    else delete root.dataset.installPrompt;
    return () => { delete root.dataset.installPrompt; };
  }, [visible]);

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

  if (!visible) return null;

  if (showPlay) {
    return (
      <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl border border-brand-gold/30 bg-[#0a0a0a]/95 p-4 shadow-premium backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <img src={APP_ICON} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{msg("Miami Elio for Android")}</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{msg("Yachts, villas, cars, events and the AI concierge in one app.")}</p>
            <div className="mt-3 flex gap-2">
              <a
                href={GOOGLE_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismiss}
                className="rounded-full bg-brand-gold px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110"
              >{msg("Open in Google Play")}</a>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 transition hover:text-white"
              >{msg("Not now")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl border border-brand-gold/30 bg-[#0a0a0a]/95 p-4 shadow-premium backdrop-blur-xl sm:left-8 sm:right-auto sm:bottom-8">
      <div className="flex items-start gap-3">
        <div className="relative h-9 w-9 shrink-0">
          <span className="ai-sphere__glow" aria-hidden="true" />
          <span className="ai-sphere h-full w-full" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{msg("Add MIAMI ELIO to your Home Screen")}</p>
          {deferredPrompt ? (
            <>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{msg("Install the app for a focused, standalone concierge experience.")}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="rounded-full bg-brand-gold px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110"
                >{msg("Install")}</button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 transition hover:text-white"
                >{msg("Not now")}</button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 flex flex-wrap items-center gap-1 text-xs leading-relaxed text-zinc-400"><LocalizedText source="Tap {share}, then {install}." values={{ share: <><ShareIcon className="inline h-3.5 w-3.5 text-brand-gold" />{msg("Share")}</>, install: <span className="text-white">{msg("“Add to Home Screen”")}</span> }} />
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="mt-3 rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 transition hover:text-white"
              >{msg("Got it")}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
