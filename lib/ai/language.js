// ===========================================================================
// Language layer for Gorgona One AI.
//
// Detects the language of a typed/spoken request and greets the user in it. The
// supported set mirrors the site's i18n locales. Detection is script-first with
// a light Latin-stopword pass — a transparent client-side heuristic for Phase 2.
// A real model can supersede detectLanguage() later via the provider seam
// without changing the UI or the greeting map.
// ===========================================================================

export const SUPPORTED_LANGS = [
  'en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'
];

// One warm, on-brand greeting per supported language.
const GREETINGS = {
  en: 'Welcome. Tell me what you are looking for.',
  ru: 'Добро пожаловать. Расскажите, что вы ищете.',
  es: 'Bienvenido. Dime qué estás buscando.',
  he: 'ברוך הבא. ספר לי מה אתה מחפש.',
  zh: '欢迎。告诉我您在寻找什么。',
  pt: 'Bem-vindo. Diga-me o que procura.',
  uk: 'Ласкаво просимо. Скажіть, що ви шукаєте.',
  ja: 'ようこそ。何をお探しかお聞かせください。',
  ko: '환영합니다. 무엇을 찾고 계신지 말씀해 주세요.',
  de: 'Willkommen. Sagen Sie mir, wonach Sie suchen.',
  ar: 'مرحبًا. أخبرني بما تبحث عنه.',
  tr: 'Hoş geldiniz. Ne aradığınızı söyleyin.',
  fa: 'خوش آمدید. بگویید دنبال چه هستید.',
  it: 'Benvenuto. Dimmi cosa stai cercando.',
  fr: 'Bienvenue. Dites-moi ce que vous cherchez.',
  pl: 'Witamy. Powiedz mi, czego szukasz.'
};

export function greeting(locale) {
  return GREETINGS[locale] || GREETINGS.en;
}

// Latin-script stopword fingerprints for the languages that share the alphabet.
const LATIN_HINTS = {
  es: ['hola', 'quiero', 'busco', 'necesito', 'para', 'una', 'reserva', 'donde', 'mejor'],
  pt: ['ola', 'olá', 'quero', 'procuro', 'preciso', 'uma', 'onde', 'melhor', 'reserva'],
  fr: ['bonjour', 'je', 'cherche', 'veux', 'besoin', 'une', 'reservation', 'où', 'meilleur'],
  de: ['hallo', 'ich', 'suche', 'brauche', 'möchte', 'eine', 'wo', 'beste', 'buchung'],
  it: ['ciao', 'cerco', 'voglio', 'vorrei', 'una', 'dove', 'prenotazione', 'migliore'],
  pl: ['szukam', 'chcę', 'potrzebuję', 'gdzie', 'najlepszy', 'rezerwacja'],
  tr: ['merhaba', 'istiyorum', 'arıyorum', 'nerede', 'en', 'iyi', 'rezervasyon', 'bir']
};

// Detect a language from text. Returns a supported-language code, or `fallback`
// (typically the current app locale) when nothing is confidently detected.
export function detectLanguage(text, fallback = 'en') {
  const s = (text || '').trim();
  if (!s) return SUPPORTED_LANGS.includes(fallback) ? fallback : 'en';

  // Script-based detection first (unambiguous blocks).
  if (/[぀-ヿ]/.test(s)) return 'ja'; // hiragana / katakana
  if (/[가-힯]/.test(s)) return 'ko'; // hangul
  if (/[一-鿿]/.test(s)) return 'zh'; // han (kana checked above)
  if (/[֐-׿]/.test(s)) return 'he'; // hebrew
  if (/[؀-ۿ]/.test(s)) return /[پچژگ]/.test(s) ? 'fa' : 'ar'; // persian letters vs arabic
  if (/[Ѐ-ӿ]/.test(s)) return /[іїєґ]/i.test(s) ? 'uk' : 'ru'; // ukrainian letters vs russian

  // Latin script — score against stopword fingerprints.
  const words = s.toLowerCase().split(/[^a-zà-ÿğışöçü]+/i).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const [lang, hints] of Object.entries(LATIN_HINTS)) {
    let score = 0;
    for (const w of words) if (hints.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  if (best && bestScore > 0) return best;

  return SUPPORTED_LANGS.includes(fallback) ? fallback : 'en';
}
