"use client";

import { useEffect } from 'react';

// Locks page scroll while a full-screen dialog (the AI Dock, the Discovery
// Room drawer) is open, and restores the exact scroll position when it closes.
//
// Root cause this fixes: both of those dialogs are `position: fixed` panels
// declaring `aria-modal="true"` but had no actual scroll lock behind them.
// Each also contains a focusable text input. On mobile Safari/Chrome,
// focusing an input inside a `position: fixed` panel while the underlying
// page is still a long, freely-scrollable document confuses the browser's
// "scroll the focused element into view" heuristic, and the whole page can
// jump - most visibly, straight to the top, which is exactly what made the
// header's Home link hard to hit. Actually fixing the body in place (not
// merely `overflow: hidden`) removes the long scrollable document the
// heuristic was jumping around in.
//
// Shared by every full-screen dialog rather than reimplemented per-component,
// so both AI surfaces get the same, single, testable fix.
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previous = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width
    };

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';

    return () => {
      style.position = previous.position;
      style.top = previous.top;
      style.left = previous.left;
      style.right = previous.right;
      style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
