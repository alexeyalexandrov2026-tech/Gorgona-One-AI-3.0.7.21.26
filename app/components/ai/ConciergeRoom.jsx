"use client";
import { LocalizedText } from "../LocalizedText";

import { useSavedText } from "../LocalizedText";

import Link from 'next/link';
import { AiConversation } from './AiConversation';
import { MiamiRouteMap } from './MiamiRouteMap';
import { useConciergeChat } from './ChatProvider';
import { SECTIONS,displayName } from '../../../lib/aiSuggestions';
import { useLocale } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18n';
import {useAiDock} from './AiDockProvider';
import {useAI} from './AIProvider';

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
  const msg = useSavedText();
  const { messages, reset, isLoading } = useConciergeChat();
  const {isOpen:dockOpen}=useAiDock(),{roomOpen}=useAI();
  const hasThread = messages.length > 0;
  const latestAssistant = [...messages].reverse().find((m) => m.role === 'assistant') || null;
  // Same source of truth as the dock and the homepage bar: the global
  // language switcher drives the page chrome and the concierge alike.
  const locale = useLocale();
  const t = getTranslation(locale);

  return (
    <main className="flex flex-1 flex-col py-10 sm:py-14">
      <header className="text-center">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-brand-gold">
          {t.ai?.discoveryRoom || <LocalizedText source={"Discovery Room"} />}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {t.ai?.conciergeTitle || <LocalizedText source={"ELIO+ Guide"} />}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
          {t.ai?.conciergeSubtitle ||
            <LocalizedText source={"Ask for anything across the MIAMI ELIO ecosystem — travel, dining, yachts, villas, cars, events and verified offers — and get there in one tap."} />}
        </p>
        <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent" />
      </header>

      <div className="mx-auto mt-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start xl:grid-cols-[minmax(0,1fr)_490px]">
        <section
          aria-label={msg("ELIO+ Guide conversation")}
          className="flex h-[min(640px,74vh)] w-full min-w-0 flex-col rounded-3xl border border-white/10 bg-white/5 p-5 shadow-premium sm:p-7"
        >
          <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3">
            <p className="text-sm font-semibold text-white">{msg("ELIO+ Guide")}</p>
            {hasThread && (
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-brand-gold hover:text-brand-gold"
              >
                {t.ai?.newConversation || <LocalizedText source={"New conversation"} />}
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1">
            <AiConversation variant="room" active={!dockOpen&&!roomOpen} />
          </div>
        </section>

        <MiamiRouteMap
          messages={messages}
          plan={latestAssistant?.plan || null}
          listings={latestAssistant?.listings || []}
          locale={locale}
          streaming={Boolean(isLoading)}
        />
      </div>

      <nav aria-label={msg("Ecosystem sections")} className="mx-auto mt-10 w-full max-w-5xl">
        <p className="text-center font-mono text-[0.6rem] uppercase tracking-[0.28em] text-zinc-500">
          {t.ai?.jumpIn || <LocalizedText source={"Or jump straight in"} />}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-zinc-300 transition hover:border-brand-gold/50 hover:text-white"
            >
              {displayName(section.href,locale)||msg(section.label)}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
