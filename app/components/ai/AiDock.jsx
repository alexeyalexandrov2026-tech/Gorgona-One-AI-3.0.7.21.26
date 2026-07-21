"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useAiDock } from './AiDockProvider';
import { AiConversation } from './AiConversation';
import { useBodyScrollLock } from '../useBodyScrollLock';

export function AiDock() {
  const { isOpen, close } = useAiDock();

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
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="GORGONA ONE AI Dock"
        className={`fixed bottom-0 right-0 z-50 flex h-[min(640px,88vh)] w-full flex-col border-t border-white/10 bg-[#0a0a0a]/[0.97] p-5 shadow-premium backdrop-blur-xl transition-transform duration-300 sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[400px] sm:rounded-[1.75rem] sm:border ${
          isOpen ? 'translate-y-0' : 'translate-y-[110%]'
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-brand-gold">AI Dock</p>
            <p className="mt-1 text-sm font-semibold text-white">GORGONA ONE Concierge</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/discovery"
              onClick={close}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-brand-gold hover:text-brand-gold"
            >
              Discovery Room
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Close AI Dock"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-brand-gold hover:text-brand-gold"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <AiConversation variant="dock" />
        </div>
      </aside>
    </>
  );
}
