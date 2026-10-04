"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, getLanguageDir, isSupportedLanguage } from '../../lib/languages';

const LOCALE_STORAGE_KEY = 'gorgona-locale';
const LOCALE_COOKIE_KEY = 'gorgona-locale';

const LocaleContext = createContext(DEFAULT_LANGUAGE);
const LocaleControllerContext = createContext(null);

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
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

// localStorage throws in some privacy modes (Safari with all cookies blocked,
// sandboxed iframes). This provider wraps the whole app, so a throw here would
// take every page down - fall back to the cookie, then to the default.
function readStoredLocale() {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readSavedLocale() {
  if (typeof window === 'undefined') return null;
  const saved = readStoredLocale() || readCookie(LOCALE_COOKIE_KEY);
  return saved && isSupportedLanguage(saved) ? saved : null;
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    const saved = readSavedLocale();
    if (saved) {
      setLocaleState(saved);
      applyDocumentLocale(saved);
    }
  }, []);

  const setLocale = (code) => {
    const next = isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* storage blocked - the cookie below still remembers the choice */
    }
    writeCookie(LOCALE_COOKIE_KEY, next);
    applyDocumentLocale(next);
  };

  const localeValue = useMemo(() => locale, [locale]);
  const controllerValue = useMemo(() => ({ locale, setLocale }), [locale]);

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
