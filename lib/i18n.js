import { getHeadoutCopy } from './headoutCopy.mjs';
import { getPrivateJetsCopy } from './privateJetsCopy.mjs';
import en from './i18n/en.mjs';
import ru from './i18n/locales/ru.mjs';
import es from './i18n/locales/es.mjs';
import he from './i18n/locales/he.mjs';
import zh from './i18n/locales/zh.mjs';
import pt from './i18n/locales/pt.mjs';
import uk from './i18n/locales/uk.mjs';
import ja from './i18n/locales/ja.mjs';
import ko from './i18n/locales/ko.mjs';
import de from './i18n/locales/de.mjs';
import ar from './i18n/locales/ar.mjs';
import tr from './i18n/locales/tr.mjs';
import fa from './i18n/locales/fa.mjs';
import it from './i18n/locales/it.mjs';
import fr from './i18n/locales/fr.mjs';
import pl from './i18n/locales/pl.mjs';

// Full 16-locale UI dictionary for Server Components, Node tests, and CI checks.
// Browser client components import lib/i18nClient.js so only the active language loads.
export const translations = {
  en,
  ru, es, he, zh, pt, uk, ja, ko, de, ar, tr, fa, it, fr, pl
};

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override || {})) {
    const value = override[key];
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(base[key] || {}, value)
      : value;
  }
  return result;
}

export function getTranslation(locale) {
  const override = translations[locale];
  const result = !override || locale === 'en' ? deepMerge(translations.en, {}) : deepMerge(translations.en, override);
  const copy = getHeadoutCopy(locale);
  return {
    ...result,
    nav: { ...result.nav, experiences: copy.nav, privateJets: getPrivateJetsCopy(locale).nav },
    discovery: { ...result.discovery, experiences: copy.nav }
  };
}
