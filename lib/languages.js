// Order here is the one required order used everywhere a language list is
// rendered (selector, hreflang tags, etc.) - do not resort alphabetically.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English (US)', nativeLabel: 'English (US)', flag: '🇺🇸', dir: 'ltr' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'he', label: 'Hebrew (Israel)', nativeLabel: 'עברית', flag: '🇮🇱', dir: 'rtl' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇵🇹', dir: 'ltr' },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська', flag: '🇺🇦', dir: 'ltr' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'fa', label: 'Persian', nativeLabel: 'فارسی', flag: '🇮🇷', dir: 'rtl' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski', flag: '🇵🇱', dir: 'ltr' }
];

export const DEFAULT_LANGUAGE = 'en';

export const RTL_LANGUAGES = SUPPORTED_LANGUAGES.filter((language) => language.dir === 'rtl').map((language) => language.code);

export function isSupportedLanguage(code) {
  return SUPPORTED_LANGUAGES.some((language) => language.code === code);
}

export function getLanguageDir(code) {
  return RTL_LANGUAGES.includes(code) ? 'rtl' : 'ltr';
}

export function getLanguageMeta(code) {
  return SUPPORTED_LANGUAGES.find((language) => language.code === code);
}
