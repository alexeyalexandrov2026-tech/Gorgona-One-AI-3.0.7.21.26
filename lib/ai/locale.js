// ===========================================================================
// Miami Elio — language configuration for the AI concierge.
//
// One place where "the site is currently in Russian" turns into everything
// the AI layer needs:
//   * a BCP-47 tag for the speech-recognition API   -> speechLocale()
//   * an English language name for the model        -> languageDirective()
//   * concierge copy the guest reads when no model  -> conciergeCopy()
//     answered at all
//
// Shared by all three surfaces (homepage bar, sphere dock, Discovery Room) so
// none of them can drift into a different language than the UI. Deliberately
// import-free and client-safe: the browser needs it for the mic and for the
// offline fallback line, the server needs it to instruct the model.
// ===========================================================================

// Locale code (lib/languages.js) -> BCP-47 tag. SpeechRecognition wants a
// region: bare "ru" is accepted by Chrome but "ru-RU" is what actually
// selects the right acoustic model, and "zh" alone is ambiguous.
const SPEECH_LOCALES = {
  en: 'en-US',
  ru: 'ru-RU',
  es: 'es-ES',
  he: 'he-IL',
  zh: 'zh-CN',
  pt: 'pt-BR',
  uk: 'uk-UA',
  ja: 'ja-JP',
  ko: 'ko-KR',
  de: 'de-DE',
  ar: 'ar-SA',
  tr: 'tr-TR',
  fa: 'fa-IR',
  it: 'it-IT',
  fr: 'fr-FR',
  pl: 'pl-PL'
};

// Named in English on purpose: models follow "Reply in Russian." far more
// reliably than an instruction written in the target language.
const LANGUAGE_NAMES = {
  en: 'English',
  ru: 'Russian',
  es: 'Spanish',
  he: 'Hebrew',
  zh: 'Chinese (Simplified)',
  pt: 'Portuguese',
  uk: 'Ukrainian',
  ja: 'Japanese',
  ko: 'Korean',
  de: 'German',
  ar: 'Arabic',
  tr: 'Turkish',
  fa: 'Persian (Farsi)',
  it: 'Italian',
  fr: 'French',
  pl: 'Polish'
};

// What the guest reads when every engine is unavailable. A guest browsing in
// Japanese must not be answered in English by the failure path.
const UNAVAILABLE = {
  en: 'The concierge is temporarily unavailable. Please try again shortly.',
  ru: 'Консьерж временно недоступен. Пожалуйста, попробуйте ещё раз чуть позже.',
  es: 'El conserje no está disponible en este momento. Vuelve a intentarlo en unos instantes.',
  he: 'הקונסיירז׳ אינו זמין כרגע. אנא נסו שוב בעוד רגע.',
  zh: '礼宾服务暂时不可用，请稍后再试。',
  pt: 'O concierge está temporariamente indisponível. Tente novamente em instantes.',
  uk: 'Консьєрж тимчасово недоступний. Будь ласка, спробуйте ще раз трохи згодом.',
  ja: 'コンシェルジュは一時的にご利用いただけません。しばらくしてからもう一度お試しください。',
  ko: '컨시어지를 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  de: 'Der Concierge ist vorübergehend nicht erreichbar. Bitte versuchen Sie es in Kürze erneut.',
  ar: 'خدمة الكونسيرج غير متاحة مؤقتًا. يُرجى المحاولة مرة أخرى بعد قليل.',
  tr: 'Konsiyerj şu anda kullanılamıyor. Lütfen birazdan tekrar deneyin.',
  fa: 'کنسیرژ موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.',
  it: 'Il concierge non è momentaneamente disponibile. Riprova tra poco.',
  fr: 'Le concierge est momentanément indisponible. Merci de réessayer dans un instant.',
  pl: 'Konsjerż jest chwilowo niedostępny. Spróbuj ponownie za chwilę.'
};

// What the guest reads when no engine answered but the request still matched a
// section: the navigation cards under the line are the answer, so the line
// introduces them instead of apologising.
const START_HERE = {
  en: 'Here is the best place to start — open it below.',
  ru: 'Вот с чего лучше начать — откройте раздел ниже.',
  es: 'Este es el mejor punto de partida: ábrelo aquí abajo.',
  he: 'זה המקום הטוב ביותר להתחיל בו — פתחו אותו למטה.',
  zh: '这是最合适的起点，请在下方打开。',
  pt: 'Este é o melhor ponto de partida — abra-o logo abaixo.',
  uk: 'Ось із чого найкраще почати — відкрийте розділ нижче.',
  ja: 'まずはこちらからどうぞ。下のカードを開いてください。',
  ko: '여기서 시작하시는 것이 가장 좋습니다. 아래에서 열어 보세요.',
  de: 'Hier ist der beste Einstieg – öffnen Sie ihn gleich unten.',
  ar: 'هذه أفضل نقطة للبدء — افتحها من الأسفل.',
  tr: 'Başlamak için en iyi yer burası — aşağıdan açabilirsiniz.',
  fa: 'بهترین نقطهٔ شروع همین‌جاست — از پایین آن را باز کنید.',
  it: 'Ecco il punto migliore da cui partire: aprilo qui sotto.',
  fr: 'Voici le meilleur point de départ — ouvrez-le ci-dessous.',
  pl: 'Oto najlepsze miejsce na początek — otwórz je poniżej.'
};

const FALLBACK = 'en';

/** Normalize anything the caller hands us ("ru-RU", "RU", null) to a code we know. */
export function normalizeLocale(locale) {
  const code = String(locale || '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
  return LANGUAGE_NAMES[code] ? code : FALLBACK;
}

/** BCP-47 tag for the Web Speech API. */
export function speechLocale(locale) {
  return SPEECH_LOCALES[normalizeLocale(locale)] || SPEECH_LOCALES[FALLBACK];
}

/** English name of the language, for prompting. */
export function languageName(locale) {
  return LANGUAGE_NAMES[normalizeLocale(locale)] || LANGUAGE_NAMES[FALLBACK];
}

/** The "temporarily unavailable" line, in the guest's language. */
export function unavailableReply(locale) {
  return UNAVAILABLE[normalizeLocale(locale)] || UNAVAILABLE[FALLBACK];
}

/**
 * The concierge's own line for a turn no model answered. Every message gets a
 * reply: with navigation cards to show it points at them, without any it says
 * plainly that the concierge is unavailable.
 */
export function fallbackReply(locale, hasCards = false) {
  const code = normalizeLocale(locale);
  if (hasCards) return START_HERE[code] || START_HERE[FALLBACK];
  return unavailableReply(code);
}

/**
 * Instruction appended to the system prompt so the model answers in the UI
 * language. Empty for English, which is the prompt's own language - adding a
 * redundant "Reply in English" only spends tokens.
 */
export function languageDirective(locale) {
  const code = normalizeLocale(locale);
  if (code === FALLBACK) return '';
  return `\n\nALWAYS reply in ${LANGUAGE_NAMES[code]}, naturally and idiomatically, regardless of the language this prompt is written in. Keep MIAMI ELIO section names and URL paths exactly as given.`;
}

/**
 * Compact directive for backends that expose no system-prompt hook - the
 * local Miami Elio AI Brain injects its own persona and reads only the newest
 * user turn, so the language instruction has to ride along with that turn.
 */
export function inlineLanguageDirective(locale) {
  const code = normalizeLocale(locale);
  if (code === FALLBACK) return '';
  return `\n\n(Reply in ${LANGUAGE_NAMES[code]}.)`;
}
