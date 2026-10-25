import './savedServerCatalog.js';
import { cookies } from 'next/headers';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './languages';
import { getTranslation } from './i18n';

// Best-effort locale read for Server Components that need localized SEO
// metadata (generateMetadata runs before any client-side LocaleProvider
// state exists). Falls back to English when no cookie has been set yet.
export async function getServerLocale() {
  const saved = (await cookies()).get('gorgona-locale')?.value;
  return saved && isSupportedLanguage(saved) ? saved : DEFAULT_LANGUAGE;
}

export async function getServerTranslation() {
  const locale = await getServerLocale();
  return { locale, t: getTranslation(locale) };
}

// Alias kept for event pages ported from the tickets-events-marketplace
// branch. Both names now resolve the asynchronous request cookie store.
export const getServerTranslations = getServerTranslation;
