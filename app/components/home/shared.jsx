"use client";

import { useCallback } from 'react';
import Link from 'next/link';
import { useAiDock } from '../ai/AiDockProvider';
import { useConciergeChat } from '../ai/ChatProvider';
import Icon from './icons';

// Opens the concierge dock and sends the question, so everything asked on
// the homepage continues in the same conversation as the dock and /discovery.
export function useAskConcierge() {
  const { open } = useAiDock();
  const { send } = useConciergeChat();
  return useCallback((text) => {
    open();
    if (text && text.trim()) send(text.trim());
  }, [open, send]);
}

export function SectionHead({ title, sub, href, cta, id }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3.5 sm:mb-9">
      <div className="grid max-w-[62ch] gap-3">
        <h2 id={id} className="g1-display font-g1display text-[clamp(2rem,2.4vw+1rem,3.3rem)] font-medium leading-[1.04] tracking-[-0.015em] text-g1-ink [text-wrap:balance]">
          {title}
        </h2>
        {sub && <p className="max-w-[58ch] text-[clamp(1.02rem,0.3vw+0.95rem,1.15rem)] text-g1-soft [text-wrap:pretty]">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-2 border-b border-g1-rule pb-0.5 font-medium text-g1-ink transition-colors hover:border-g1-accent hover:text-g1-accent">
          {cta} <Icon name="arrow" className="g1-flip h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export const btn = {
  base: 'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-transparent px-5 font-medium leading-none transition active:translate-y-px',
  primary: 'bg-g1-accent text-g1-on-accent hover:brightness-110',
  ink: 'bg-g1-ink text-g1-paper hover:opacity-90',
  ghost: 'border-g1-rule text-g1-ink hover:border-g1-ink',
  sm: 'min-h-[38px] px-4 text-[0.92rem]'
};

export const chipClass =
  'inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-full border border-g1-rule bg-g1-card px-4 text-[0.9rem] font-medium text-g1-ink transition hover:border-g1-ink aria-pressed:border-g1-ink aria-pressed:bg-g1-ink aria-pressed:text-g1-paper';
