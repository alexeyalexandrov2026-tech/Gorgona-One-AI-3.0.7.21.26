"use client";

import Link from 'next/link';
import { AiConversation } from './AiConversation';
import { useConciergeChat } from './ChatProvider';
import { SECTIONS } from '../../../lib/aiSuggestions';

// ===========================================================================
// The Discovery Room — the concierge as a full page.
//
// The third view of the ONE conversation held in ChatProvider: whatever was
// asked on the homepage or in the sphere dock is already here, and anything
// asked here is waiting in the dock afterwards. The chat itself is the same
// AiConversation component the dock renders, so the two surfaces cannot
// drift apart in behaviour - only in the frame around them.
// ===========================================================================

export function ConciergeRoom() {
  const { messages, reset } = useConciergeChat();
  const hasThread = messages.length > 0;

  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <header className="text-center">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-brand-gold">Discovery Room</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Your private concierge
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
          Ask for anything across the GORGONA ONE ecosystem — travel, dining, yachts, villas, cars, events and
          verified offers — and get there in one tap.
        </p>
        <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent" />
      </header>

      <section
        aria-label="Concierge conversation"
        className="mx-auto mt-10 flex h-[min(640px,72vh)] w-full max-w-3xl flex-col rounded-3xl border border-white/10 bg-white/5 p-5 shadow-premium sm:p-7"
      >
        <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3">
          <p className="text-sm font-semibold text-white">GORGONA ONE Concierge</p>
          {hasThread && (
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-brand-gold hover:text-brand-gold"
            >
              New conversation
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1">
          <AiConversation variant="room" />
        </div>
      </section>

      <nav aria-label="Ecosystem sections" className="mx-auto mt-10 w-full max-w-3xl">
        <p className="text-center font-mono text-[0.6rem] uppercase tracking-[0.28em] text-zinc-500">
          Or jump straight in
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-zinc-300 transition hover:border-brand-gold/50 hover:text-white"
            >
              {section.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
