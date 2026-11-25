"use client";

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import { useAiDock } from './AiDockProvider';

export function AiSphereArtwork() {
  return (
    <>
      <span className="ai-sphere__glow" aria-hidden="true" />
      <span className="ai-sphere h-full w-full" aria-hidden="true" />
    </>
  );
}

// Pure CSS orb - no canvas, no WebGL, no requestAnimationFrame loop. Every
// moving layer (float, rotating sheen, pulsing glow) animates only
// `transform`/`opacity`, so the browser compositor runs it off the main
// thread at a flat cost regardless of page complexity, and it freezes
// automatically under prefers-reduced-motion (see globals.css). This is
// what keeps the sphere smooth site-wide instead of dragging FPS down.
function AiSphereBase({ size = 60, label = 'Open ELIO+ Guide', className = '' }) {
  const { toggle, isOpen } = useAiDock();
  const pathname = usePathname() || '';
  if (pathname === '/discovery' || pathname === '/concierge') return null;

  return (
    <button
      type="button"
      onClick={(event)=>{event.currentTarget.focus({preventScroll:true});toggle();}}
      aria-label={label}
      aria-expanded={isOpen}
      data-floating-launcher
      className={`group fixed bottom-6 right-5 z-50 flex items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:bottom-8 sm:right-8 ${
        isOpen ? 'pointer-events-none scale-90 opacity-0' : 'hover:scale-105'
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <AiSphereArtwork />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export const AiSphere = memo(AiSphereBase);
