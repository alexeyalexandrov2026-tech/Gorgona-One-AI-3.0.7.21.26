"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DEFAULT_LANGUAGE, getLanguageDir, isSupportedLanguage } from '../../lib/languages';
import { canRefreshForLocale } from '../../lib/localePolicy';
import { loadSavedLocale } from '../../lib/savedCopy';

const LOCALE_STORAGE_KEY = 'gorgona-locale';
const LOCALE_COOKIE_KEY = 'gorgona-locale';

const LocaleContext = createContext(DEFAULT_LANGUAGE);
const LocaleControllerContext = createContext(null);

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  try { return match ? decodeURIComponent(match[1]) : null; }
  catch { return null; }
}

function writeCookie(name, value) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function applyDocumentLocale(code) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
  document.documentElement.dir = getLanguageDir(code);
}

export function readSavedLocale() {
  if (typeof window === 'undefined') return null;
  let stored;
  try { stored = window.localStorage.getItem(LOCALE_STORAGE_KEY); }
  catch { /* Cookie selection still works when browser storage is disabled. */ }
  const saved = isSupportedLanguage(stored) ? stored : readCookie(LOCALE_COOKIE_KEY);
  return saved && isSupportedLanguage(saved) ? saved : null;
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LANGUAGE);
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useRef(DEFAULT_LANGUAGE);
  const restored = useRef(false);
  const selection = useRef(0);
  const currentPathname = useRef(pathname);
  const clientLocaleRoutes = useRef(new Map());
  currentPathname.current = pathname;

  const registerClientLocaleRoute = useCallback((path) => {
    const routes = clientLocaleRoutes.current;
    routes.set(path, (routes.get(path) || 0) + 1);
    return () => {
      const remaining = (routes.get(path) || 1) - 1;
      if (remaining) routes.set(path, remaining);
      else routes.delete(path);
    };
  }, []);

  const setLocale = useCallback(async (code) => {
    const next = isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
    const request = ++selection.current;
    // Fetch only the selected, saved language bundle. Concurrent selections
    // resolve in the visitor's order of intent, never network arrival order.
    try { await loadSavedLocale(next); }
    catch { return; }
    if (request !== selection.current) return;
    const changed = next !== currentLocale.current;
    currentLocale.current = next;
    setLocaleState(next);
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, next); }
    catch { /* Persist the cookie and keep the current session usable. */ }
    writeCookie(LOCALE_COOKIE_KEY, next);
    applyDocumentLocale(next);
    // Refresh merges RSC text while preserving unaffected client state.
    // Protected embed pages render our text from this context instead.
    const activePath = window.location.pathname || currentPathname.current;
    if (changed && canRefreshForLocale(activePath) && !clientLocaleRoutes.current.has(activePath)) router.refresh();
  }, [router]);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = readSavedLocale();
    if (saved) setLocale(saved);
    else applyDocumentLocale(DEFAULT_LANGUAGE);
  }, [setLocale]);

  const localeValue = useMemo(() => locale, [locale]);
  const controllerValue = useMemo(() => ({ locale, setLocale, registerClientLocaleRoute }), [locale, setLocale, registerClientLocaleRoute]);

  return (
    <LocaleContext.Provider value={localeValue}>
      <LocaleControllerContext.Provider value={controllerValue}>{children}</LocaleControllerContext.Provider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useLocaleController() {
  return useContext(LocaleControllerContext);
}

// Client-only route text (such as 404) needs no RSC refresh. Keep the
// registration scoped to its mounted page, including during locale changes.
export function useClientLocaleRoute() {
  const register = useLocaleController()?.registerClientLocaleRoute;
  useEffect(() => register?.(window.location.pathname), [register]);
}
