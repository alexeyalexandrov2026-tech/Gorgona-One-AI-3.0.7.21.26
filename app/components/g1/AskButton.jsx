"use client";

import { useAskConcierge } from '../home/shared';
import { btn } from './ui';

// A button that opens the concierge with a prepared request.
export default function AskButton({ prompt, children, className = '' }) {
  const ask = useAskConcierge();
  return (
    <button type="button" onClick={() => ask(prompt)} className={`${btn.base} ${btn.primary} ${className}`}>
      {children}
    </button>
  );
}
