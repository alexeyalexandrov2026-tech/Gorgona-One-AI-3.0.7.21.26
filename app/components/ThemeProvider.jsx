"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// ===========================================================================
// Theme layer for the Gorgona One AI ecosystem.
//
// Phase 1 scope: this provider is mounted app-wide (so the architecture is ready
// for full-site theming later) but is currently CONSUMED ONLY by the Gorgona One
// AI surfaces (the sphere + the future Discovery Room). The rest of the website
// keeps its existing dark styling untouched — nothing outside the AI components
// reads this context yet.
//
//   Light  -> V1 visual language (ivory / champagne / pearl)
//   Dark   -> V2 visual language (graphite / black / warm gold glow)
//
// The V2 technology (particles, motion, interactions, ecosystem behavior) is
// identical in both modes; only color, lighting and atmosphere change.
// ===========================================================================

const ThemeContext = createContext(null);
const STORAGE_KEY = 'gorgona-ai-theme';

export function ThemeProvider({ children, defaultTheme = 'dark' }) {
  const [theme, setThemeState] = useState(defaultTheme);
  const [ready, setReady] = useState(false);

  // Resolve the initial theme once on the client. A stored choice always wins.
  // We intentionally default to dark (V2) rather than following the OS
  // light/dark preference: in Phase 1 only the AI surface is themed, so
  // auto-switching to light would clash with the surrounding (still dark) site.
  // When full-site theming lands, OS-preference following can be reintroduced.
  useEffect(() => {
    let initial = defaultTheme;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') initial = stored;
    } catch {
      /* localStorage unavailable — keep default */
    }
    setThemeState(initial);
    setReady(true);
  }, [defaultTheme]);

  const setTheme = (next) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore persistence failures */
    }
  };

  const value = useMemo(
    () => ({
      theme,
      ready,
      isDark: theme === 'dark',
      setTheme,
      toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark')
    }),
    [theme, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Consume the AI theme. Safe to call outside a provider (returns a dark default)
// so individual AI components never crash if mounted standalone.
export function useAITheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: 'dark', ready: true, isDark: true, setTheme: () => {}, toggle: () => {} };
  }
  return ctx;
}
