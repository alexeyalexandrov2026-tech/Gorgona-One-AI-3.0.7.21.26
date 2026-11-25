// ===========================================================================
// Miami Elio — Russian Orthoepic Numeral-to-Words & Declension Engine.
//
// Converts Arabic numerals (0..999,999), ordinal dates (1..31), years
// (2000..2099), decimals, and 24-hour times into stressed, TTS-optimized
// Russian orthoepic forms (e.g. 79 -> "се́мдисят де́вять", 84 -> "во́семдисят
// четы́ре", 540 -> "пятсо́т со́рок") so ElevenLabs multilingual v2 articulates
// every syllable crisply without swallowing "-десят" or "-сот" after "ь".
// ===========================================================================

const A = '\u0301'; // Combining acute accent — natively respected by ElevenLabs for Russian stress

const UNITS_NOM_M = ['ноль', `оди${A}н`, 'два', 'три', `четы${A}ре`, 'пять', 'шесть', 'семь', `во${A}семь`, `де${A}вять`];
const UNITS_NOM_F = ['ноль', `одна${A}`, 'две', 'три', `четы${A}ре`, 'пять', 'шесть', 'семь', `во${A}семь`, `де${A}вять`];
const UNITS_ACC_F = ['ноль', `одну${A}`, 'две', 'три', `четы${A}ре`, 'пять', 'шесть', 'семь', `во${A}семь`, `де${A}вять`];
const UNITS_GEN_M = [`нуля${A}`, `одного${A}`, 'двух', 'трёх', 'четырёх', `пяти${A}`, `шести${A}`, `семи${A}`, `восьми${A}`, `девяти${A}`];
const UNITS_GEN_F = [`нуля${A}`, `одно${A}й`, 'двух', 'трёх', 'четырёх', `пяти${A}`, `шести${A}`, `семи${A}`, `восьми${A}`, `девяти${A}`];

const TEENS_NOM = [
  `де${A}сять`, `оди${A}ннадцать`, `двена${A}дцать`, `трина${A}дцать`, `четы${A}рнадцать`,
  `пятна${A}дцать`, `шестна${A}дцать`, `семна${A}дцать`, `восемна${A}дцать`, `девятна${A}дцать`
];
const TEENS_GEN = [
  `десяти${A}`, `оди${A}ннадцати`, `двена${A}дцати`, `трина${A}дцати`, `четы${A}рнадцати`,
  `пятна${A}дцати`, `шестна${A}дцати`, `семна${A}дцати`, `восемна${A}дцати`, `девятна${A}дцати`
];

// Acoustic-tested orthoepic forms for 50/60/70/80: removing the internal soft sign
// prevents ElevenLabs multilingual v2 from swallowing "-десят" (e.g. "79" -> "семь девять").
const TENS_NOM = [
  '', '', `два${A}дцать`, `три${A}дцать`, `со${A}рок`,
  `пятдеся${A}т`, `шестдеся${A}т`, `се${A}мдисят`, `во${A}семдисят`, `девяно${A}сто`
];
const TENS_GEN = [
  '', '', `двадцати${A}`, `тридцати${A}`, `сорока${A}`,
  `пяти${A}десяти`, `шести${A}десяти`, `семи${A}десяти`, `восьми${A}десяти`, `девяно${A}ста`
];

const HUNDREDS_NOM = [
  '', 'сто', `две${A}сти`, `три${A}ста`, `четы${A}реста`,
  `пятсо${A}т`, `шестсо${A}т`, `семсо${A}т`, `восемсо${A}т`, `девятсо${A}т`
];
const HUNDREDS_GEN = [
  '', 'ста', `двухсо${A}т`, `трёхсо${A}т`, `четырёхсо${A}т`,
  `пятисо${A}т`, `шестисо${A}т`, `семисо${A}т`, `восьмисо${A}т`, `девятисо${A}т`
];

const ORD_GEN_1_19 = [
  '', `пе${A}рвого`, `второ${A}го`, `тре${A}тьего`, 'четвёртого', `пя${A}того`, `шесто${A}го`, `седьмо${A}го`, `восьмо${A}го`, `девя${A}того`,
  `деся${A}того`, `оди${A}ннадцатого`, `двена${A}дцатого`, `трина${A}дцатого`, `четы${A}рнадцатого`, `пятна${A}дцатого`,
  `шестна${A}дцатого`, `семна${A}дцатого`, `восемна${A}дцатого`, `девятна${A}дцатого`
];
const ORD_GEN_TENS = [
  '', '', `двадца${A}того`, `тридца${A}того`, `сороково${A}го`,
  `пятидеся${A}того`, `шестидеся${A}того`, `семидеся${A}того`, `восьмидеся${A}того`, `девяно${A}стого`
];

const ORD_NOM_M_1_10 = [
  '', `пе${A}рвый`, `второ${A}й`, `тре${A}тий`, 'четвёртый', `пя${A}тый`, `шесто${A}й`, `седьмо${A}й`, `восьмо${A}й`, `девя${A}тый`, `деся${A}тый`
];
const ORD_NOM_F_1_10 = [
  '', `пе${A}рвая`, `втора${A}я`, `тре${A}тья`, 'четвёртая', `пя${A}тая`, `шеста${A}я`, `седьма${A}я`, `восьма${A}я`, `девя${A}тая`, `деся${A}тая`
];

export function ruPluralNom(n, one, few, many) {
  const abs = Math.abs(Math.trunc(Number(n)));
  if (!Number.isFinite(abs)) return many;
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function ruPluralGen(n, oneGen, manyGen) {
  const abs = Math.abs(Math.trunc(Number(n)));
  if (!Number.isFinite(abs)) return manyGen;
  return (abs % 10 === 1 && abs % 100 !== 11) ? oneGen : manyGen;
}

function triadWords(num, gender, gramCase) {
  const h = Math.floor(num / 100);
  const rem = num % 100;
  const t = Math.floor(rem / 10);
  const u = rem % 10;
  const isGen = gramCase === 'gen';
  const parts = [];

  if (h > 0) parts.push(isGen ? HUNDREDS_GEN[h] : HUNDREDS_NOM[h]);

  if (rem >= 10 && rem <= 19) {
    parts.push(isGen ? TEENS_GEN[rem - 10] : TEENS_NOM[rem - 10]);
  } else {
    if (t >= 2) parts.push(isGen ? TENS_GEN[t] : TENS_NOM[t]);
    if (u > 0) {
      if (isGen) {
        parts.push(gender === 'fem' ? UNITS_GEN_F[u] : UNITS_GEN_M[u]);
      } else if (gramCase === 'acc' && gender === 'fem') {
        parts.push(UNITS_ACC_F[u]);
      } else {
        parts.push(gender === 'fem' ? UNITS_NOM_F[u] : UNITS_NOM_M[u]);
      }
    }
  }
  return parts.join(' ');
}

/**
 * Converts an integer (up to 999,999, negative supported) into orthoepic Russian words.
 * @param {number|string} raw
 * @param {{ gender?: 'masc'|'fem', gramCase?: 'nom'|'acc'|'gen' }} [opts]
 */
export function ruNumberWords(raw, { gender = 'masc', gramCase = 'nom' } = {}) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return String(raw);
  if (Math.abs(n) > 999999) return String(n);

  const negative = n < 0;
  const abs = Math.abs(n);
  if (abs === 0) return gramCase === 'gen' ? `нуля${A}` : 'ноль';

  const parts = [];
  if (negative) parts.push(`ми${A}нус`);

  const thousands = Math.floor(abs / 1000);
  const rest = abs % 1000;

  if (thousands > 0) {
    if (thousands === 1) {
      if (gramCase === 'gen') parts.push(`ты${A}сячи`);
      else if (gramCase === 'acc') parts.push(`ты${A}сячу`);
      else parts.push(`ты${A}сяча`);
    } else {
      parts.push(triadWords(thousands, 'fem', gramCase === 'gen' ? 'gen' : 'nom'));
      if (gramCase === 'gen') {
        parts.push(ruPluralGen(thousands, `ты${A}сячи`, `ты${A}сяч`));
      } else {
        parts.push(ruPluralNom(thousands, `ты${A}сяча`, `ты${A}сячи`, `ты${A}сяч`));
      }
    }
  }

  if (rest > 0) {
    parts.push(triadWords(rest, gender, gramCase));
  }

  return parts.join(' ');
}

/** Ordinal genitive for calendar day (1..31) or 2-digit year tail (1..99), e.g. 27 -> "два́дцать седьмо́го". */
export function ruOrdinalGenitive(raw) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n < 1 || n > 99) return ruNumberWords(n, { gramCase: 'gen' });
  if (n < 20) return ORD_GEN_1_19[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return ORD_GEN_TENS[t];
  return `${TENS_NOM[t]} ${ORD_GEN_1_19[u]}`;
}

/** Ordinal nominative for common compact Russian forms ("1-й" -> "пе́рвый", "2-я" -> "втора́я"). */
export function ruOrdinalShort(numRaw, suffix) {
  const n = Math.trunc(Number(numRaw));
  const suf = String(suffix || '').toLowerCase();
  if (suf === 'го' || suf === 'ого') return ruOrdinalGenitive(n);
  if (n >= 1 && n <= 10) {
    if (suf === 'я' || suf === 'ая' || suf === 'ья') return ORD_NOM_F_1_10[n];
    return ORD_NOM_M_1_10[n];
  }
  return ruNumberWords(n);
}

/** Ordinal genitive for year 2000..2099 ("2026" -> "две ты́сячи два́дцать шесто́го"). */
export function ruYearGenitive(raw) {
  const y = Math.trunc(Number(raw));
  if (y === 2000) return `двухты${A}сячного`;
  if (y > 2000 && y < 2100) return `две ты${A}сячи ${ruOrdinalGenitive(y - 2000)}`;
  return ruNumberWords(y, { gramCase: 'gen' });
}

/** Conversational decimal in Russian ("4.9" -> "четы́ре и де́вять"). */
export function ruDecimalWords(numStr) {
  const cleaned = String(numStr).replace(',', '.');
  const [intPart, fracPart] = cleaned.split('.');
  if (!fracPart) return ruNumberWords(intPart);
  const cleanFrac = fracPart.replace(/0+$/, '');
  if (!cleanFrac) return ruNumberWords(intPart);
  return `${ruNumberWords(intPart)} и ${ruNumberWords(cleanFrac)}`;
}

/** 24-hour time in crisp Russian ("20:30" -> "два́дцать часо́в три́дцать мину́т"). */
export function ruTimeWords(hRaw, mRaw) {
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return `${hRaw}:${mRaw}`;
  const hWords = `${ruNumberWords(h, { gender: 'masc' })} ${ruPluralNom(h, 'час', `часа${A}`, `часо${A}в`)}`;
  if (m === 0) return hWords;
  const mWords = `${ruNumberWords(m, { gender: 'fem' })} ${ruPluralNom(m, `мину${A}та`, `мину${A}ты`, `мину${A}т`)}`;
  return `${hWords} ${mWords}`;
}

/**
 * Post-pass orthoepy normalizer for already-spelled Russian words in AI replies
 * (e.g. if the LLM writes "семьдесят девять" as words instead of "79").
 */
export function applyRussianOrthoepy(text) {
  const CYR_L = '(?<![А-Яа-яЁё])';
  const CYR_R = '(?![А-Яа-яЁё])';
  const replacements = [
    ['пятьдесят', `пятдеся${A}т`],
    ['шестьдесят', `шестдеся${A}т`],
    ['семьдесят', `се${A}мдисят`],
    ['восемьдесят', `во${A}семдисят`],
    ['пятидесяти', `пяти${A}десяти`],
    ['шестидесяти', `шести${A}десяти`],
    ['семидесяти', `семи${A}десяти`],
    ['восьмидесяти', `восьми${A}десяти`],
    ['пятьсот', `пятсо${A}т`],
    ['шестьсот', `шестсо${A}т`],
    ['семьсот', `семсо${A}т`],
    ['восемьсот', `восемсо${A}т`],
    ['девятьсот', `девятсо${A}т`],
    ['четыре', `четы${A}ре`],
    ['восемь', `во${A}семь`],
    ['девять', `де${A}вять`],
    ['фаренгейту', `Фаренге${A}йту`],
    ['цельсию', `Це${A}льсию`],
    ['градусов', `гра${A}дусов`],
    ['градуса', `гра${A}дуса`],
    ['градус', `гра${A}дус`],
    ['долларов', `до${A}лларов`],
    ['доллара', `до${A}ллара`],
    ['доллар', `до${A}ллар`],
    ['круглосуточно', `круглосу${A}точно`]
  ];
  let out = text;
  for (const [word, spoken] of replacements) {
    out = out.replace(new RegExp(`${CYR_L}${word}${CYR_R}`, 'gi'), (m) => {
      const first = m[0];
      if (first === first.toUpperCase() && first !== first.toLowerCase()) {
        return spoken[0].toUpperCase() + spoken.slice(1);
      }
      return spoken;
    });
  }
  return out;
}
