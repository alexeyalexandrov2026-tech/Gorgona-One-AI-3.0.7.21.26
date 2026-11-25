// ===========================================================================
// Miami Elio — Russian Numeral-to-Words & Grammatical Declension Engine.
//
// Converts Arabic numerals (0..999,999), ordinal dates (1..31), years
// (2000..2099), decimals, and 24-hour times into exact, grammatically
// declined Russian words so ElevenLabs / neural TTS pronounces every digit
// crisply without guessing cases or swallowing syllables (e.g. "78" ->
// "семьдесят восемь", "для 4 человек" -> "для четырёх человек",
// "от 1300 долларов" -> "от тысячи трёхсот долларов").
// ===========================================================================

const UNITS_NOM_M = ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const UNITS_NOM_F = ['ноль', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const UNITS_ACC_F = ['ноль', 'одну', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const UNITS_GEN_M = ['нуля', 'одного', 'двух', 'трёх', 'четырёх', 'пяти', 'шести', 'семи', 'восьми', 'девяти'];
const UNITS_GEN_F = ['нуля', 'одной', 'двух', 'трёх', 'четырёх', 'пяти', 'шести', 'семи', 'восьми', 'девяти'];

const TEENS_NOM = [
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
  'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'
];
const TEENS_GEN = [
  'десяти', 'одиннадцати', 'двенадцати', 'тринадцати', 'четырнадцати',
  'пятнадцати', 'шестнадцати', 'семнадцати', 'восемнадцати', 'девятнадцати'
];

const TENS_NOM = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const TENS_GEN = ['', '', 'двадцати', 'тридцати', 'сорока', 'пятидесяти', 'шестидесяти', 'семидесяти', 'восьмидесяти', 'девяноста'];

const HUNDREDS_NOM = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
const HUNDREDS_GEN = ['', 'ста', 'двухсот', 'трёхсот', 'четырёхсот', 'пятисот', 'шестисот', 'семисот', 'восьмисот', 'девятисот'];

const ORD_GEN_1_19 = [
  '', 'первого', 'второго', 'третьего', 'четвёртого', 'пятого', 'шестого', 'седьмого', 'восьмого', 'девятого',
  'десятого', 'одиннадцатого', 'двенадцатого', 'тринадцатого', 'четырнадцатого', 'пятнадцатого',
  'шестнадцатого', 'семнадцатого', 'восемнадцатого', 'девятнадцатого'
];
const ORD_GEN_TENS = ['', '', 'двадцатого', 'тридцатого', 'сорокового', 'пятидесятого', 'шестидесятого', 'семидесятого', 'восьмидесятого', 'девяностого'];

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
 * Converts an integer (up to 999,999, negative supported) into Russian words.
 * @param {number|string} raw
 * @param {{ gender?: 'masc'|'fem', gramCase?: 'nom'|'acc'|'gen' }} [opts]
 */
export function ruNumberWords(raw, { gender = 'masc', gramCase = 'nom' } = {}) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return String(raw);
  if (Math.abs(n) > 999999) return String(n);

  const negative = n < 0;
  const abs = Math.abs(n);
  if (abs === 0) return gramCase === 'gen' ? 'нуля' : 'ноль';

  const parts = [];
  if (negative) parts.push('минус');

  const thousands = Math.floor(abs / 1000);
  const rest = abs % 1000;

  if (thousands > 0) {
    if (thousands === 1) {
      // Natural conversational Russian omits "одна" before "тысяча" ("тысяча триста", "от тысячи трёхсот")
      if (gramCase === 'gen') parts.push('тысячи');
      else if (gramCase === 'acc') parts.push('тысячу');
      else parts.push('тысяча');
    } else {
      parts.push(triadWords(thousands, 'fem', gramCase === 'gen' ? 'gen' : 'nom'));
      if (gramCase === 'gen') {
        parts.push(ruPluralGen(thousands, 'тысячи', 'тысяч'));
      } else {
        parts.push(ruPluralNom(thousands, 'тысяча', 'тысячи', 'тысяч'));
      }
    }
  }

  if (rest > 0) {
    parts.push(triadWords(rest, gender, gramCase));
  }

  return parts.join(' ');
}

/** Ordinal genitive for calendar day (1..31) or 2-digit year tail (1..99), e.g. 27 -> "двадцать седьмого". */
export function ruOrdinalGenitive(raw) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n < 1 || n > 99) return ruNumberWords(n, { gramCase: 'gen' });
  if (n < 20) return ORD_GEN_1_19[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return ORD_GEN_TENS[t];
  return `${TENS_NOM[t]} ${ORD_GEN_1_19[u]}`;
}

/** Ordinal genitive for year 2000..2099 ("2026" -> "две тысячи двадцать шестого"). */
export function ruYearGenitive(raw) {
  const y = Math.trunc(Number(raw));
  if (y === 2000) return 'двухтысячного';
  if (y > 2000 && y < 2100) return `две тысячи ${ruOrdinalGenitive(y - 2000)}`;
  return ruNumberWords(y, { gramCase: 'gen' });
}

/** Conversational decimal in Russian ("4.9" -> "четыре и девять"). */
export function ruDecimalWords(numStr) {
  const cleaned = String(numStr).replace(',', '.');
  const [intPart, fracPart] = cleaned.split('.');
  if (!fracPart) return ruNumberWords(intPart);
  const cleanFrac = fracPart.replace(/0+$/, '');
  if (!cleanFrac) return ruNumberWords(intPart);
  return `${ruNumberWords(intPart)} и ${ruNumberWords(cleanFrac)}`;
}

/** 24-hour time in crisp Russian ("20:30" -> "двадцать часов тридцать минут", "19:00" -> "девятнадцать часов"). */
export function ruTimeWords(hRaw, mRaw) {
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return `${hRaw}:${mRaw}`;
  const hWords = `${ruNumberWords(h, { gender: 'masc' })} ${ruPluralNom(h, 'час', 'часа', 'часов')}`;
  if (m === 0) return hWords;
  const mWords = `${ruNumberWords(m, { gender: 'fem' })} ${ruPluralNom(m, 'минута', 'минуты', 'минут')}`;
  return `${hWords} ${mWords}`;
}
