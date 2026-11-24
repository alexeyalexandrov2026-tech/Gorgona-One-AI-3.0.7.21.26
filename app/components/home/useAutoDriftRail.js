"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

// Smooth, continuous horizontal marquee drift modeled on HomeSectionRail:
// measures whether the primary set overflows its scroll container (via
// ResizeObserver, never forcing reflow inside rAF), renders a seamless clone
// track only when looping, supports LTR and RTL, respects prefers-reduced-motion,
// and pauses automatically on hover, keyboard focus, wheel, or touch swipe so
// every button remains effortless to tap.
export function useAutoDriftRail({ speedPxPerSec = 24, enabled = true, holdMs = 5000, depsKey = '' } = {}) {
  const railRef = useRef(null);
  const primaryRef = useRef(null);
  const cloneRef = useRef(null);
  const holdUntil = useRef(0);
  const metricsRef = useRef({
    loopSpan: 0,
    isRtl: false,
    inView: true,
    hovered: false,
    focused: false
  });
  const [looping, setLooping] = useState(false);

  const holdMotion = useCallback(() => {
    holdUntil.current = Date.now() + holdMs;
  }, [holdMs]);

  useEffect(() => {
    const rail = railRef.current;
    const primary = primaryRef.current;
    if (!rail || !primary) return undefined;

    const measure = () => {
      const style = window.getComputedStyle(rail);
      const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      const primaryWidth = primary.scrollWidth;
      const containerWidth = rail.clientWidth;
      const overflows = enabled && primaryWidth > containerWidth + 2;
      metricsRef.current.isRtl = style.direction === 'rtl';
      if (cloneRef.current && primary) {
        const span = Math.abs(cloneRef.current.offsetLeft - primary.offsetLeft);
        metricsRef.current.loopSpan = span > 0 ? span : primaryWidth + gap;
      } else {
        metricsRef.current.loopSpan = primaryWidth + gap;
      }
      setLooping(overflows);
    };

    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(rail);
    ro?.observe(primary);

    let io = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(([entry]) => {
        if (entry) metricsRef.current.inView = entry.isIntersecting;
      });
      io.observe(rail);
    }

    measure();
    const rafId = window.requestAnimationFrame(measure);
    return () => {
      window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      io?.disconnect();
    };
  }, [enabled, depsKey]);

  // Re-measure loopSpan right after clone mounts so wrap point is exact.
  useEffect(() => {
    if (!looping) return undefined;
    const rail = railRef.current;
    const primary = primaryRef.current;
    const clone = cloneRef.current;
    if (!rail || !primary || !clone) return undefined;
    const span = Math.abs(clone.offsetLeft - primary.offsetLeft);
    if (span > 0) metricsRef.current.loopSpan = span;
    return undefined;
  }, [looping, depsKey]);

  useEffect(() => {
    if (!enabled || !looping) return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hoverCapable = window.matchMedia('(hover: hover)');
    let frame = 0;
    let last = 0;
    let pos = null;

    const tick = (now) => {
      frame = window.requestAnimationFrame(tick);
      const dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      const rail = railRef.current;
      const m = metricsRef.current;
      if (
        !rail ||
        !m.inView ||
        !m.loopSpan ||
        reducedMotion.matches ||
        document.hidden ||
        Date.now() < holdUntil.current ||
        m.focused ||
        (hoverCapable.matches && m.hovered)
      ) {
        pos = null;
        return;
      }
      const currentScroll = rail.scrollLeft;
      const sign = m.isRtl && currentScroll <= 0 ? -1 : 1;
      const actual = currentScroll * sign;
      if (pos === null || Math.abs(actual - pos) > 2) pos = actual;
      pos += speedPxPerSec * dt;
      if (pos >= m.loopSpan) pos -= m.loopSpan;
      rail.scrollLeft = pos * sign;
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, looping, speedPxPerSec]);

  const railHandlers = {
    onPointerEnter: () => { metricsRef.current.hovered = true; },
    onPointerLeave: () => { metricsRef.current.hovered = false; },
    onFocusCapture: () => { metricsRef.current.focused = true; },
    onBlurCapture: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        metricsRef.current.focused = false;
      }
    },
    onPointerDown: holdMotion,
    onPointerUp: holdMotion,
    onPointerCancel: holdMotion,
    onTouchStart: holdMotion,
    onWheel: holdMotion
  };

  return { railRef, primaryRef, cloneRef, looping, railHandlers };
}
