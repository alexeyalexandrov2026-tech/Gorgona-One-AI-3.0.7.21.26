"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DEFAULT_LANGUAGE, getLanguageDir, isSupportedLanguage } from '../../lib/languages';
import { canRefreshForLocale } from '../../lib/localePolicy';
import { loadSavedLocale } from '../../lib/savedCopy';
import {useHydratedValue} from './useHydratedValue';

const LOCALE_STORAGE_KEY = 'gorgona-locale';
const LOCALE_COOKIE_KEY = 'gorgona-locale';

const LocaleContext = createContext(DEFAULT_LANGUAGE);
const LocaleControllerContext = createContext(null);
const INITIAL_CONTROLLER={locale:DEFAULT_LANGUAGE,ready:false,setLocale(){},registerClientLocaleRoute(){return()=>{};}};

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
  const root = document.documentElement;
  const dir = getLanguageDir(code);
  if (root.lang !== code) root.lang = code;
  if (root.dir !== dir) root.dir = dir;
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
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useRef(DEFAULT_LANGUAGE);
  const restored = useRef(false);
  const selection = useRef(0);
  const currentPathname = useRef(pathname);
  const clientLocaleRoutes = useRef(new Map());
  currentPathname.current = pathname;

  useEffect(() => {
    // Root attributes can be reconciled independently of this provider's
    // render. Keep them aligned with the last completed language selection.
    const sync = () => applyDocumentLocale(currentLocale.current);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
    sync();
    return () => observer.disconnect();
  }, []);

  const registerClientLocaleRoute = useCallback((path) => {
    const routes = clientLocaleRoutes.current;
    routes.set(path, (routes.get(path) || 0) + 1);
    return () => {
      const remaining = (routes.get(path) || 1) - 1;
      if (remaining) routes.set(path, remaining);
      else routes.delete(path);
    };
  }, []);

  const setLocale = useCallback(async (code, {refresh=true}={}) => {
    const next = isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
    const request = ++selection.current;
    setReady(false);
    // Fetch only the selected, saved language bundle. Concurrent selections
    // resolve in the visitor's order of intent, never network arrival order.
    try { await loadSavedLocale(next); }
    catch { if(request===selection.current)setReady(true);return; }
    if (request !== selection.current) return;
    const changed = next !== currentLocale.current;
    currentLocale.current = next;
    setLocaleState(next);
    setReady(true);
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, next); }
    catch { /* Persist the cookie and keep the current session usable. */ }
    writeCookie(LOCALE_COOKIE_KEY, next);
    applyDocumentLocale(next);
    // Refresh merges RSC text while preserving unaffected client state.
    // Protected embed pages render our text from this context instead.
    const activePath = window.location.pathname || currentPathname.current;
    if (refresh && changed && canRefreshForLocale(activePath) && !clientLocaleRoutes.current.has(activePath)) router.refresh();
  }, [router]);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = readSavedLocale();
    // Server text already used this cookie. Refresh only when storage disagrees.
    const cookie=readCookie(LOCALE_COOKIE_KEY);
    const serverLocale=isSupportedLanguage(cookie)?cookie:DEFAULT_LANGUAGE;
    if (saved) setLocale(saved,{refresh:saved!==serverLocale});
    else {applyDocumentLocale(DEFAULT_LANGUAGE);setReady(true);}
  }, [setLocale]);

  const localeValue = useMemo(() => locale, [locale]);
  const controllerValue = useMemo(() => ({ locale, ready, setLocale, registerClientLocaleRoute }), [locale, ready, setLocale, registerClientLocaleRoute]);

  return (
    <LocaleContext.Provider value={localeValue}>
      <LocaleControllerContext.Provider value={controllerValue}>{children}</LocaleControllerContext.Provider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useHydratedValue(useContext(LocaleContext),DEFAULT_LANGUAGE);
}

export function useLocaleController() {
  const value=useContext(LocaleControllerContext);
  return useHydratedValue(value,value?INITIAL_CONTROLLER:null);
}

// Session storage can restore before the saved language bundle has loaded.
// Language-sensitive interactions wait for both instead of using English briefly.
export function useLocaleReady() {
  return useLocaleController()?.ready ?? true;
}

// Client-only route text (such as 404) needs no RSC refresh. Keep the
// registration scoped to its mounted page, including during locale changes.
export function useClientLocaleRoute() {
  const register = useLocaleController()?.registerClientLocaleRoute;
  useEffect(() => register?.(window.location.pathname), [register]);
}
