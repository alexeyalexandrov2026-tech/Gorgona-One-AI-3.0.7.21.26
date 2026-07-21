import { cookies } from 'next/headers';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './languages';
import { getTranslation } from './i18n';

// Best-effort locale read for Server Components that need localized SEO
// metadata (generateMetadata runs before any client-side LocaleProvider
// state exists). Falls back to English when no cookie has been set yet.
export function getServerLocale() {
  const saved = cookies().get('gorgona-locale')?.value;
  return saved && isSupportedLanguage(saved) ? saved : DEFAULT_LANGUAGE;
}

export function getServerTranslation() {
  const locale = getServerLocale();
  return { locale, t: getTranslation(locale) };
}

// Alias kept for event pages ported from the tickets-events-marketplace
// branch, which call `await getServerTranslations()` - awaiting a
// synchronous return value is valid JS, so no call sites needed changes.
export const getServerTranslations = getServerTranslation;
