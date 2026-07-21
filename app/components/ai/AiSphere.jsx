"use client";

import { memo } from 'react';
import { useAiDock } from './AiDockProvider';

// Pure CSS orb - no canvas, no WebGL, no requestAnimationFrame loop. Every
// moving layer (float, rotating sheen, pulsing glow) animates only
// `transform`/`opacity`, so the browser compositor runs it off the main
// thread at a flat cost regardless of page complexity, and it freezes
// automatically under prefers-reduced-motion (see globals.css). This is
// what keeps the sphere smooth site-wide instead of dragging FPS down.
function AiSphereBase({ size = 60, label = 'Open the Discovery Room concierge', className = '' }) {
  const { toggle, isOpen } = useAiDock();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-expanded={isOpen}
      className={`group fixed bottom-6 right-5 z-50 flex items-center justify-center rounded-full transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:bottom-8 sm:right-8 ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="ai-sphere__glow" aria-hidden="true" />
      <span className="ai-sphere h-full w-full" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export const AiSphere = memo(AiSphereBase);
