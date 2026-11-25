// ===========================================================================
// Miami Elio — Multilingual TTS Orthoepy & Speech Text Normalizer.
//
// Transforms compact on-screen UI text (abbreviations like "чт.", "нояб.",
// "мин.", "чел.", "и т.д.", "Thu.", "pax", "1h 34m", "$1,300/day", "78°F",
// "$$$$", "24/7", "5★", "ELIO+") into natural, full-word spoken prose before
// sending to ElevenLabs / OpenAI / Google TTS so the voice speaks like a
// real human host instead of spelling out abbreviations literally.
// ===========================================================================

import { normalizeLocale } from './locale.js';

const CYR_LEFT = '(?<![А-Яа-яЁёІіЇїЄєҐґA-Za-z0-9])';
const CYR_RIGHT = '(?![А-Яа-яЁёІіЇїЄєҐґA-Za-z0-9])';
const LAT_LEFT = '(?<![A-Za-zÀ-ÿ0-9])';

const RU_MONTH_LOOKAHEAD = /^(?:\s+(?:янв|февр?|мар|апр|ма[йя]|июн|июл|авг|сент?|окт|нояб?|дек))/i;
const EN_MONTH_LOOKAHEAD = /^(?:\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b)/;

function ruPlural(n, one, few, many) {
  const abs = Math.abs(Math.trunc(Number(n)));
  if (!Number.isFinite(abs)) return many;
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function preserveCase(source, target) {
  if (!source || !target) return target;
  const first = source[0];
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

function stripThousandsCommas(numStr) {
  return String(numStr || '').replace(/,(?=\d{3}(?:\D|$))/g, '');
}

function maybePauseDot(word, hasDot, fullStr, matchEnd, script = 'ru') {
  if (!hasDot) return word;
  const after = fullStr.slice(matchEnd);
  if (/^\s*$/.test(after)) return `${word}.`;
  if (script === 'ru') {
    if (RU_MONTH_LOOKAHEAD.test(after)) return word;
    if (/^\s+[А-ЯЁ]/.test(after)) return `${word}.`;
    return word;
  }
  if (EN_MONTH_LOOKAHEAD.test(after)) return word;
  if (/^\s+[A-ZÀ-Ý]/.test(after)) return `${word}.`;
  return word;
}

const RU_DAYS = {
  пн: { nom: 'понедельник', acc: 'понедельник', gen: 'понедельника' },
  вт: { nom: 'вторник', acc: 'вторник', gen: 'вторника' },
  ср: { nom: 'среда', acc: 'среду', gen: 'среды' },
  чт: { nom: 'четверг', acc: 'четверг', gen: 'четверга' },
  пт: { nom: 'пятница', acc: 'пятницу', gen: 'пятницы' },
  сб: { nom: 'суббота', acc: 'субботу', gen: 'субботы' },
  вс: { nom: 'воскресенье', acc: 'воскресенье', gen: 'воскресенья' }
};
const RU_DAY_GROUP = '(пн|вт|ср|чт|пт|сб|вс)';

function normalizeRussian(text) {
  let out = text;

  // Brand names for natural Russian pronunciation
  out = out.replace(/\bMIAMI\s+ELIO\b/gi, 'Майами Элио');
  out = out.replace(/\bELIO\+\s*Guide\b/gi, 'Элио Плюс Гайд');
  out = out.replace(/\bELIO\+\s*Shield\b/gi, 'Элио Плюс Шилд');
  out = out.replace(/\bELIO\+/gi, 'Элио Плюс');
  out = out.replace(/\bELIO\b/g, 'Элио');

  // Price tiers ($$$$, $$$, $$) before single-dollar rules
  out = out.replace(/\${4}/g, 'ультра-люкс');
  out = out.replace(/\${3}/g, 'премиум-класс');
  out = out.replace(/\${2}/g, 'средний ценовой сегмент');

  // 24/7, approximate markers, numbering, standalone ampersand
  out = out.replace(/(?<!\d)24\s*\/\s*7(?!\d)/g, 'круглосуточно');
  out = out.replace(/[≈~]\s*(\d)/g, 'около $1');
  out = out.replace(/№\s*(\d+)/g, 'номер $1');
  out = out.replace(/\s+&\s+/g, ' и ');

  // 12-hour AM/PM times in Russian -> natural 24-hour or colloquial Russian time
  out = out.replace(/\b(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)\b/gi, (_, hStr, mStr, mer) => {
    let h = Number(hStr);
    const isPm = mer.toUpperCase() === 'PM';
    if (isPm && h !== 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${mStr}`;
  });
  out = out.replace(/\b(1[0-2]|0?[1-9])\s*(AM|PM)\b/gi, (_, hStr, mer) => {
    const h = Number(hStr);
    const isPm = mer.toUpperCase() === 'PM';
    if (isPm) {
      if (h === 12) return '12 дня';
      if (h <= 4) return `${h} ${ruPlural(h, 'час', 'часа', 'часов')} дня`;
      return `${h} вечера`;
    }
    if (h === 12) return 'полночь';
    if (h <= 4) return `${h} ${ruPlural(h, 'час', 'часа', 'часов')} ночи`;
    return `${h} утра`;
  });

  // Prices with periods & US thousands commas ($1,300/day, US$8,000, $250/час)
  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*\/\s*(?:day|days|день|сут(?:ки|ок)?\.?)/gi, (_, n) => {
    const clean = stripThousandsCommas(n);
    return `${clean} ${ruPlural(clean, 'доллар', 'доллара', 'долларов')} в день`;
  });
  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*\/\s*(?:hr|hrs|hour|hours|ч\.?|час(?:а|ов)?)/gi, (_, n) => {
    const clean = stripThousandsCommas(n);
    return `${clean} ${ruPlural(clean, 'доллар', 'доллара', 'долларов')} в час`;
  });
  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*\/\s*(?:night|ночь|ночи)/gi, (_, n) => {
    const clean = stripThousandsCommas(n);
    return `${clean} ${ruPlural(clean, 'доллар', 'доллара', 'долларов')} за ночь`;
  });
  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*\/\s*(?:week|нед(?:елю|еля)?\.?)/gi, (_, n) => {
    const clean = stripThousandsCommas(n);
    return `${clean} ${ruPlural(clean, 'доллар', 'доллара', 'долларов')} в неделю`;
  });
  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)\+/gi, (_, n) => {
    const clean = stripThousandsCommas(n);
    return `от ${clean} ${ruPlural(clean, 'доллар', 'доллара', 'долларов')}`;
  });
  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)/gi, (_, n) => {
    const clean = stripThousandsCommas(n);
    return `${clean} ${ruPlural(clean, 'доллар', 'доллара', 'долларов')}`;
  });
  out = out.replace(/(\d[\d,]*(?:\.\d+)?)\s*USD\b/gi, (_, n) => {
    const clean = stripThousandsCommas(n);
    return `${clean} ${ruPlural(clean, 'доллар', 'доллара', 'долларов')}`;
  });
  out = out.replace(/€\s*(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*EUR\b/gi, (_, a, b) => {
    const clean = stripThousandsCommas(a || b);
    return `${clean} евро`;
  });

  // Stars (5★, 4.9★, 5⭐) — BEFORE emoji cleanup!
  out = out.replace(/(\d+(?:[.,]\d+)?)\s*[★⭐]/g, (_, n) =>
    n.includes('.') || n.includes(',') ? `${n} звезды` : `${n} ${ruPlural(n, 'звезда', 'звезды', 'звёзд')}`
  );

  // Paired weather "26 °C / 78 °F" before individual degree rules
  out = out.replace(/(-?\d+)\s*°\s*C\s*\/\s*(-?\d+)\s*°\s*F\b/gi, (_, c, f) =>
    `${c} ${ruPlural(c, 'градус', 'градуса', 'градусов')} по Цельсию, или ${f} по Фаренгейту`
  );
  out = out.replace(/(-?\d+)\s*°\s*F\b/gi, (_, n) => `${n} ${ruPlural(n, 'градус', 'градуса', 'градусов')} по Фаренгейту`);
  out = out.replace(/(-?\d+)\s*°\s*C\b/gi, (_, n) => `${n} ${ruPlural(n, 'градус', 'градуса', 'градусов')}`);
  out = out.replace(/(-?\d+)\s*°/g, (_, n) => `${n} ${ruPlural(n, 'градус', 'градуса', 'градусов')}`);
  out = out.replace(/(\d+)\s*mph\b/gi, (_, n) => `${n} ${ruPlural(n, 'миля', 'мили', 'миль')} в час`);
  out = out.replace(/(\d+)\s*(?:km\/h|км\/ч)/gi, (_, n) => `${n} ${ruPlural(n, 'километр', 'километра', 'километров')} в час`);

  // Flight / trip durations like "1h 34m", "2h 00m", "1 ч. 20 мин."
  out = out.replace(/(\d+)\s*(?:h|ч\.?)\s*(\d+)\s*(?:m|мин\.?)(?![А-Яа-яЁёA-Za-z])/gi, (match, h, m, offset, full) => {
    const mins = Number(m);
    const hPart = `${Number(h)} ${ruPlural(h, 'час', 'часа', 'часов')}`;
    const combined = !mins ? hPart : `${hPart} ${mins} ${ruPlural(mins, 'минута', 'минуты', 'минут')}`;
    return maybePauseDot(combined, match.endsWith('.'), full, offset + match.length, 'ru');
  });

  // Accusative minutes/seconds after "за / через / на" ("через 1 мин." -> "через 1 минуту")
  out = out.replace(new RegExp(`${CYR_LEFT}(за|через|на)\\s+(\\d+)\\s*мин(\\.?)(?![А-Яа-яЁё])`, 'gi'), (m, prep, n, dot, off, full) => {
    const phrase = `${prep} ${n} ${ruPlural(n, 'минуту', 'минуты', 'минут')}`;
    return maybePauseDot(phrase, Boolean(dot), full, off + m.length, 'ru');
  });
  out = out.replace(new RegExp(`${CYR_LEFT}(за|через|на)\\s+(\\d+)\\s*сек(\\.?)(?![А-Яа-яЁё])`, 'gi'), (m, prep, n, dot, off, full) => {
    const phrase = `${prep} ${n} ${ruPlural(n, 'секунду', 'секунды', 'секунд')}`;
    return maybePauseDot(phrase, Boolean(dot), full, off + m.length, 'ru');
  });

  // Genitive guests after "для / до / от" ("для 4 чел." -> "для 4 человек")
  out = out.replace(new RegExp(`${CYR_LEFT}(для|до|от)\\s+(\\d+)\\s*(?:чел|гост|pax)(\\.?)(?![А-Яа-яЁёA-Za-z])`, 'gi'), (m, prep, n, dot, off, full) => {
    const num = Math.abs(Math.trunc(Number(n)));
    const noun = num % 10 === 1 && num % 100 !== 11 ? 'человека' : 'человек';
    return maybePauseDot(`${prep} ${n} ${noun}`, Boolean(dot), full, off + m.length, 'ru');
  });

  // General numeric units with Russian declensions
  out = out.replace(/(\d+)\s*мин(\.?)(?![А-Яа-яЁё])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'минута', 'минуты', 'минут')}`, Boolean(dot), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*сек(\.?)(?![А-Яа-яЁё])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'секунда', 'секунды', 'секунд')}`, Boolean(dot), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*ч\.(?![А-Яа-яЁё])/gi, (m, n, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'час', 'часа', 'часов')}`, true, full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*(?:чел|гост|pax)(\.?)(?![А-Яа-яЁёA-Za-z])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'человек', 'человека', 'человек')}`, Boolean(dot), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*(?:кв\.?\s*фут\.?|sq\.?\s*ft\.?)(?![А-Яа-яЁёA-Za-z])/gi, (m, n, off, full) =>
    maybePauseDot(`${n} квадратных футов`, m.endsWith('.'), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*(?:фут|ft)(\.?)(?![А-Яа-яЁёA-Za-z])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'фут', 'фута', 'футов')}`, Boolean(dot), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*км(\.?)(?![А-Яа-яЁё])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'километр', 'километра', 'километров')}`, Boolean(dot), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*см(\.?)(?![А-Яа-яЁё])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'сантиметр', 'сантиметра', 'сантиметров')}`, Boolean(dot), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*(?:кв\.?\s*м\.?|м²)(?![А-Яа-яЁё])/gi, (m, n, off, full) =>
    maybePauseDot(`${n} квадратных метров`, m.endsWith('.'), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*шт(\.?)(?![А-Яа-яЁё])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'штука', 'штуки', 'штук')}`, Boolean(dot), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*мес(\.?)(?![А-Яа-яЁё])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'месяц', 'месяца', 'месяцев')}`, Boolean(dot), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*нед(\.?)(?![А-Яа-яЁё])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${ruPlural(n, 'неделя', 'недели', 'недель')}`, Boolean(dot), full, off + m.length, 'ru')
  );
  out = out.replace(/(\d+)\s*сут(\.?)(?![А-Яа-яЁё])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} суток`, Boolean(dot), full, off + m.length, 'ru')
  );

  // Russian weekdays:
  // 1) "с пн по пт" / "со ср. по вс."
  out = out.replace(
    new RegExp(`${CYR_LEFT}(со?)\\s+${RU_DAY_GROUP}\\.?\\s+по\\s+${RU_DAY_GROUP}(\\.?)${CYR_RIGHT}`, 'gi'),
    (m, prep, d1, d2, dot2, off, full) => {
      const a = RU_DAYS[d1.toLowerCase()].gen;
      const b = RU_DAYS[d2.toLowerCase()].acc;
      return maybePauseDot(`${prep} ${a} по ${b}`, Boolean(dot2), full, off + m.length, 'ru');
    }
  );
  // 2) Compound prepositional pair "в ср. и пт." / "в сб. и вс." / "на пт. и сб."
  out = out.replace(
    new RegExp(`${CYR_LEFT}(во?|на)\\s+${RU_DAY_GROUP}\\.?\\s+(и)\\s+${RU_DAY_GROUP}(\\.?)${CYR_RIGHT}`, 'gi'),
    (m, prep, d1, conj, d2, dot2, off, full) => {
      const a = RU_DAYS[d1.toLowerCase()].acc;
      const b = RU_DAYS[d2.toLowerCase()].acc;
      return maybePauseDot(`${prep} ${a} ${conj} ${b}`, Boolean(dot2), full, off + m.length, 'ru');
    }
  );
  // 3) Single accusative preposition "в чт.", "в ср.", "на пт."
  out = out.replace(
    new RegExp(`${CYR_LEFT}(во?|на)\\s+${RU_DAY_GROUP}(\\.?)${CYR_RIGHT}`, 'gi'),
    (m, prep, d, dot, off, full) => {
      const word = `${prep} ${RU_DAYS[d.toLowerCase()].acc}`;
      return maybePauseDot(word, Boolean(dot), full, off + m.length, 'ru');
    }
  );
  // 4) Single genitive preposition "до чт.", "с пт.", "со ср."
  out = out.replace(
    new RegExp(`${CYR_LEFT}(со?|до|от)\\s+${RU_DAY_GROUP}(\\.?)${CYR_RIGHT}`, 'gi'),
    (m, prep, d, dot, off, full) => {
      const word = `${prep} ${RU_DAYS[d.toLowerCase()].gen}`;
      return maybePauseDot(word, Boolean(dot), full, off + m.length, 'ru');
    }
  );
  // 5) Day ranges "пн–пт", "Пн – Вс", "сб-вс"
  out = out.replace(
    new RegExp(`${CYR_LEFT}${RU_DAY_GROUP}\\.?\\s*([–—-])\\s*${RU_DAY_GROUP}(\\.?)${CYR_RIGHT}`, 'gi'),
    (m, d1, dash, d2, dot2, off, full) => {
      const a = preserveCase(d1, RU_DAYS[d1.toLowerCase()].nom);
      const b = RU_DAYS[d2.toLowerCase()].nom;
      return maybePauseDot(`${a}${dash}${b}`, Boolean(dot2), full, off + m.length, 'ru');
    }
  );
  // 6) Standalone weekday with dot ("чт.", "Чт., 27 нояб.")
  out = out.replace(
    new RegExp(`${CYR_LEFT}${RU_DAY_GROUP}\\.(?![А-Яа-яЁё])`, 'gi'),
    (m, d, off, full) => {
      const word = preserveCase(d, RU_DAYS[d.toLowerCase()].nom);
      return maybePauseDot(word, true, full, off + m.length, 'ru');
    }
  );
  // 7) Dotless Intl weekday in date/list/parenthesis context ("чт, 27 нояб.", "(чт)", "чт 27 нояб.", "чт — ...")
  out = out.replace(
    new RegExp(`(?<!\\d\\s*)${CYR_LEFT}${RU_DAY_GROUP}(?=[),;:]|\\s+[–—-]|\\s+\\d{1,2}\\b)`, 'gi'),
    (_, d) => preserveCase(d, RU_DAYS[d.toLowerCase()].nom)
  );

  // Russian abbreviated months (matches both "ноя." and Intl "нояб.", "февр.", "сент.", "мар.")
  const ruMonths = [
    ['янв', 'января', 'январь'],
    ['февр?', 'февраля', 'февраль'],
    ['мар', 'марта', 'март'],
    ['апр', 'апреля', 'апрель'],
    ['июн', 'июня', 'июнь'],
    ['июл', 'июля', 'июль'],
    ['авг', 'августа', 'август'],
    ['сент?', 'сентября', 'сентябрь'],
    ['окт', 'октября', 'октябрь'],
    ['нояб?', 'ноября', 'ноябрь'],
    ['дек', 'декабря', 'декабрь']
  ];
  for (const [abbr, gen, nom] of ruMonths) {
    const reAfterNum = new RegExp(`(?<!\\d)(\\d{1,2})\\s+${abbr}(\\.?)(?![А-Яа-яЁё])`, 'gi');
    out = out.replace(reAfterNum, (m, day, dot, off, full) =>
      maybePauseDot(`${day} ${gen}`, Boolean(dot), full, off + m.length, 'ru')
    );
    const reDot = new RegExp(`${CYR_LEFT}(${abbr})\\.(?![А-Яа-яЁё])`, 'gi');
    out = out.replace(reDot, (m, raw, off, full) =>
      maybePauseDot(preserveCase(raw, nom), true, full, off + m.length, 'ru')
    );
  }

  // Year suffix ("2026 г." -> "2026 года", "2026–2027 гг." -> "2026–2027 годов")
  out = out.replace(/(?<!\d)(20\d{2})\s*г\.(?![А-Яа-яЁё])/gi, (m, y, off, full) =>
    maybePauseDot(`${y} года`, true, full, off + m.length, 'ru')
  );
  out = out.replace(/(?<!\d)(20\d{2})\s*гг\.(?![А-Яа-яЁё])/gi, (m, y, off, full) =>
    maybePauseDot(`${y} годов`, true, full, off + m.length, 'ru')
  );

  // Common Russian abbreviations (preserve sentence pause dot for clause-ending phrases)
  const ruClauseEnd = [
    ['и\\s+т\\.\\s*д\\.?', 'и так далее'],
    ['и\\s+т\\.\\s*п\\.?', 'и тому подобное'],
    ['и\\s+др\\.', 'и другие'],
    ['и\\s+пр\\.', 'и прочее'],
    ['в\\s+т\\.\\s*ч\\.?', 'в том числе']
  ];
  for (const [pattern, replacement] of ruClauseEnd) {
    out = out.replace(new RegExp(`${CYR_LEFT}${pattern}(?![А-Яа-яЁё])`, 'gi'), (m, off, full) =>
      maybePauseDot(replacement, m.endsWith('.'), full, off + m.length, 'ru')
    );
  }

  // Airport abbreviation with genitive case after prepositions ("из а/п Майами" -> "из аэропорта Майами")
  out = out.replace(new RegExp(`${CYR_LEFT}(из|от|до|у)\\s+а\\/п(?![А-Яа-яЁё])`, 'gi'), '$1 аэропорта');
  out = out.replace(new RegExp(`${CYR_LEFT}а\\/п(?![А-Яа-яЁё])`, 'gi'), 'аэропорт');

  // Sports / comparison "vs." in Russian ("Miami Heat vs. Boston Celtics")
  out = out.replace(new RegExp(`${LAT_LEFT}vs\\.(?![A-Za-z])`, 'gi'), 'против');

  const ruCommon = [
    ['т\\.\\s*е\\.?', 'то есть'],
    ['т\\.\\s*к\\.?', 'так как'],
    ['т\\.\\s*н\\.?', 'так называемый'],
    ['напр\\.', 'например'],
    ['прим\\.', 'примерно'],
    ['ок\\.\\s*(?=\\d)', 'около '],
    ['св\\.\\s*(?=\\d)', 'свыше '],
    ['мин\\.\\s*(?=\\d|[а-яё])', 'минимум '],
    ['макс\\.', 'максимум'],
    ['доп\\.', 'дополнительно'],
    ['вкл\\.', 'включая'],
    ['ежедн\\.', 'ежедневно'],
    ['беспл\\.', 'бесплатно'],
    ['тел\\.', 'телефон'],
    ['ул\\.', 'улица'],
    ['пер\\.', 'переулок'],
    ['наб\\.', 'набережная'],
    ['пл\\.', 'площадь'],
    ['б-р\\.?', 'бульвар'],
    ['бул\\.', 'бульвар'],
    ['пр-т\\.?', 'проспект'],
    ['просп\\.', 'проспект'],
    ['р-н(?:а|е|у)?', 'район'],
    ['д\\.\\s*(?=\\d)', 'дом '],
    ['эт\\.', 'этаж'],
    ['оф\\.', 'офис'],
    ['тыс\\.', 'тысяч'],
    ['млн\\.?', 'миллионов'],
    ['млрд\\.?', 'миллиардов'],
    ['руб\\.', 'рублей'],
    ['долл\\.', 'долларов'],
    ['г\\.\\s*(?=[А-ЯЁ])', 'город '],
    ['мес\\.', 'месяцев'],
    ['нед\\.', 'недель']
  ];
  for (const [pattern, replacement] of ruCommon) {
    out = out.replace(new RegExp(`${CYR_LEFT}(${pattern})(?![А-Яа-яЁё])`, 'gi'), (_, raw) =>
      preserveCase(raw, replacement)
    );
  }

  // Also expand English weekday/month abbreviations that can appear in mixed-language Miami cards
  out = normalizeEnglishDaysAndMonths(out, 'ru');

  // Strip leftover US thousands commas in plain numbers ("1,500" -> "1500")
  out = out.replace(/\b(\d{1,3}),(\d{3})\b/g, '$1$2');

  return out;
}

function normalizeUkrainian(text) {
  let out = text;
  out = out.replace(/\bMIAMI\s+ELIO\b/gi, 'Маямі Еліо');
  out = out.replace(/\bELIO\+/gi, 'Еліо Плюс');
  out = out.replace(/(?<!\d)24\s*\/\s*7(?!\d)/g, 'цілодобово');
  out = out.replace(/\${4}/g, 'ультра-люкс');
  out = out.replace(/\${3}/g, 'преміум-клас');
  out = out.replace(/(\d+(?:[.,]\d+)?)\s*[★⭐]/g, '$1 зірок');
  out = out.replace(/(-?\d+)\s*°\s*F\b/gi, '$1 градусів за Фаренгейтом');
  out = out.replace(/(-?\d+)\s*°\s*C\b/gi, '$1 градусів');

  const ukDays = [
    ['пн', 'понеділок'],
    ['вт', 'вівторок'],
    ['ср', 'середа'],
    ['чт', 'четвер'],
    ['пт', 'пʼятниця'],
    ['сб', 'субота'],
    ['нд', 'неділя']
  ];
  for (const [abbr, full] of ukDays) {
    out = out.replace(new RegExp(`${CYR_LEFT}${abbr}\\.(?![А-Яа-яЁёІіЇїЄєҐґ])`, 'gi'), full);
    out = out.replace(new RegExp(`${CYR_LEFT}${abbr}(?=[),;:–—-]|\\s+\\d)`, 'gi'), full);
  }
  const ukMonths = [
    ['січ', 'січня'], ['лют', 'лютого'], ['бер', 'березня'], ['квіт', 'квітня'],
    ['трав', 'травня'], ['черв', 'червня'], ['лип', 'липня'], ['серп', 'серпня'],
    ['вер', 'вересня'], ['жовт', 'жовтня'], ['лист', 'листопада'], ['груд', 'грудня']
  ];
  for (const [abbr, gen] of ukMonths) {
    out = out.replace(new RegExp(`(?<!\\d)(\\d{1,2})\\s+${abbr}\\.?(?![А-Яа-яЁёІіЇїЄєҐґ])`, 'gi'), `$1 ${gen}`);
  }
  out = out.replace(new RegExp(`${CYR_LEFT}хв\\.(?![А-Яа-яЁёІіЇїЄєҐґ])`, 'gi'), 'хвилин');
  out = out.replace(new RegExp(`${CYR_LEFT}год\\.(?![А-Яа-яЁёІіЇїЄєҐґ])`, 'gi'), 'годин');
  out = out.replace(new RegExp(`${CYR_LEFT}тис\\.(?![А-Яа-яЁёІіЇїЄєҐґ])`, 'gi'), 'тисяч');
  out = out.replace(new RegExp(`${CYR_LEFT}і\\s+т\\.\\s*д\\.?(?![А-Яа-яЁёІіЇїЄєҐґ])`, 'gi'), 'і так далі');
  return out;
}

function normalizeEnglishDaysAndMonths(text, targetLang = 'en') {
  let out = text;
  const days = targetLang === 'ru'
    ? [
        ['Mon', 'понедельник'], ['Tue(?:s)?', 'вторник'], ['Wed', 'среда'],
        ['Thu(?:rs?)?', 'четверг'], ['Fri', 'пятница'], ['Sat', 'суббота'], ['Sun', 'воскресенье']
      ]
    : [
        ['Mon', 'Monday'], ['Tue(?:s)?', 'Tuesday'], ['Wed', 'Wednesday'],
        ['Thu(?:rs?)?', 'Thursday'], ['Fri', 'Friday'], ['Sat', 'Saturday'], ['Sun', 'Sunday']
      ];
  for (const [abbr, full] of days) {
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}\\.(?![A-Za-z])`, 'g'), (m, off, str) =>
      maybePauseDot(full, true, str, off + m.length, targetLang)
    );
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}(?=[),;:]|\\s*[–—-]|\\s+\\d)`, 'g'), full);
  }
  const months = targetLang === 'ru'
    ? [
        ['Jan', 'января'], ['Feb', 'февраля'], ['Mar', 'марта'], ['Apr', 'апреля'],
        ['Jun', 'июня'], ['Jul', 'июля'], ['Aug', 'августа'], ['Sept?', 'сентября'],
        ['Oct', 'октября'], ['Nov', 'ноября'], ['Dec', 'декабря']
      ]
    : [
        ['Jan', 'January'], ['Feb', 'February'], ['Mar', 'March'], ['Apr', 'April'],
        ['Jun', 'June'], ['Jul', 'July'], ['Aug', 'August'], ['Sept?', 'September'],
        ['Oct', 'October'], ['Nov', 'November'], ['Dec', 'December']
      ];
  for (const [abbr, full] of months) {
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}\\.(?![A-Za-z])`, 'g'), full);
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}(?=\\s+\\d{1,2}\\b)`, 'g'), full);
  }
  return out;
}

function normalizeEnglish(text) {
  let out = text;
  out = out.replace(/\bELIO\+/gi, 'Elio Plus');
  out = out.replace(/\${4}/g, 'ultra-luxury');
  out = out.replace(/\${3}/g, 'upscale');
  out = out.replace(/\${2}/g, 'mid-range');
  out = out.replace(/(?<!\d)24\s*\/\s*7(?!\d)/g, 'twenty-four seven');
  out = out.replace(/[≈~]\s*(\d)/g, 'about $1');

  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*\/\s*(?:day|days)\b/gi, '$1 dollars per day');
  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*\/\s*(?:hr|hrs|hour|hours)\b/gi, '$1 dollars per hour');
  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*\/\s*night\b/gi, '$1 dollars per night');
  out = out.replace(/(?:US)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*\/\s*week\b/gi, '$1 dollars per week');
  out = out.replace(/(\d+(?:\.\d+)?)\s*[★⭐](?=\s+[A-Za-z])/g, '$1-star');
  out = out.replace(/(\d+(?:\.\d+)?)\s*[★⭐]/g, '$1 stars');

  out = out.replace(/(-?\d+)\s*°\s*C\s*\/\s*(-?\d+)\s*°\s*F\b/gi, '$1 degrees Celsius, or $2 degrees Fahrenheit');
  out = out.replace(/(-?\d+)\s*°\s*F\b/gi, '$1 degrees Fahrenheit');
  out = out.replace(/(-?\d+)\s*°\s*C\b/gi, '$1 degrees Celsius');
  out = out.replace(/(-?\d+)\s*°/g, '$1 degrees');
  out = out.replace(/(\d+)\s*mph\b/gi, '$1 miles per hour');
  out = out.replace(/(\d+)\s*km\/h\b/gi, '$1 kilometers per hour');

  out = out.replace(/(\d+)\s*h\s*(\d+)\s*m\b/gi, (_, h, m) => {
    const hrs = Number(h);
    const mins = Number(m);
    const hPart = `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
    if (!mins) return hPart;
    return `${hPart} ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  });
  out = out.replace(/(\d+)\s*mins?(\.?)(?![A-Za-z])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${Number(n) === 1 ? 'minute' : 'minutes'}`, Boolean(dot), full, off + m.length, 'en')
  );
  out = out.replace(/(\d+)\s*hrs?(\.?)(?![A-Za-z])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} ${Number(n) === 1 ? 'hour' : 'hours'}`, Boolean(dot), full, off + m.length, 'en')
  );
  out = out.replace(/(\d+)\s*pax(?![A-Za-z])/gi, '$1 guests');
  out = out.replace(/(\d+)\s*sq\.?\s*ft(\.?)(?![A-Za-z])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} square feet`, Boolean(dot), full, off + m.length, 'en')
  );
  out = out.replace(/(\d+)\s*ft(\.?)(?![A-Za-z])/gi, (m, n, dot, off, full) =>
    maybePauseDot(`${n} feet`, Boolean(dot), full, off + m.length, 'en')
  );

  out = normalizeEnglishDaysAndMonths(out, 'en');

  out = out.replace(new RegExp(`${LAT_LEFT}etc\\.`, 'gi'), (m, off, full) =>
    maybePauseDot('and so on', true, full, off + m.length, 'en')
  );

  // Ordinal street suffix ("44th St." -> "44th Street") without corrupting "St. Regis"
  out = out.replace(/\b(\d+(?:st|nd|rd|th))\s+St\.(?![A-Za-z])/gi, (m, ord, off, full) =>
    maybePauseDot(`${ord} Street`, true, full, off + m.length, 'en')
  );

  const enCommon = [
    ['e\\.g\\.', 'for example'],
    ['i\\.e\\.', 'that is'],
    ['approx\\.', 'approximately'],
    ['incl\\.', 'including'],
    ['est\\.', 'estimated'],
    ['vs\\.', 'versus'],
    ['w\\/', 'with '],
    ['Blvd\\.', 'Boulevard'],
    ['Ave\\.', 'Avenue']
  ];
  for (const [pattern, replacement] of enCommon) {
    out = out.replace(new RegExp(`${LAT_LEFT}${pattern}`, 'gi'), replacement);
  }
  out = out.replace(/\s+&\s+/g, ' and ');
  return out;
}

function normalizeSpanish(text) {
  let out = text;
  out = out.replace(/\bELIO\+/gi, 'Elio Plus');
  out = out.replace(/(?<!\d)24\s*\/\s*7(?!\d)/g, 'las veinticuatro horas');
  out = out.replace(/\${4}/g, 'ultra lujo');
  out = out.replace(/\${3}/g, 'alta gama');
  out = out.replace(/(\d+(?:[.,]\d+)?)\s*[★⭐]/g, '$1 estrellas');
  const esDays = [
    ['lun', 'lunes'], ['mar', 'martes'], ['mié', 'miércoles'], ['mie', 'miércoles'],
    ['jue', 'jueves'], ['vie', 'viernes'], ['sáb', 'sábado'], ['sab', 'sábado'], ['dom', 'domingo']
  ];
  for (const [abbr, full] of esDays) {
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}\\.(?![A-Za-zÀ-ÿ])`, 'gi'), full);
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}(?=[),;:]|\\s*[–—-]|\\s+\\d)`, 'gi'), full);
  }
  const esMonths = [
    ['ene', 'enero'], ['feb', 'febrero'], ['abr', 'abril'], ['ago', 'agosto'],
    ['sept?', 'septiembre'], ['oct', 'octubre'], ['nov', 'noviembre'], ['dic', 'diciembre']
  ];
  for (const [abbr, full] of esMonths) {
    out = out.replace(new RegExp(`(?<!\\d)(\\d{1,2})\\s+(?:de\\s+)?${abbr}\\.?(?![A-Za-zÀ-ÿ])`, 'gi'), `$1 de ${full}`);
  }
  out = out.replace(/(\d+)\s*min\.?(?![A-Za-zÀ-ÿ])/gi, '$1 minutos');
  out = out.replace(/(\d+)\s*hrs?\.?(?![A-Za-zÀ-ÿ])/gi, '$1 horas');
  out = out.replace(/(\d+)\s*pax\b/gi, '$1 personas');
  out = out.replace(/(-?\d+)\s*°\s*F\b/gi, '$1 grados Fahrenheit');
  out = out.replace(/(-?\d+)\s*°\s*C\b/gi, '$1 grados');
  out = out.replace(new RegExp(`${LAT_LEFT}etc\\.`, 'gi'), 'etcétera');
  return out;
}

function normalizePortuguese(text) {
  let out = text;
  out = out.replace(/\bELIO\+/gi, 'Elio Plus');
  out = out.replace(/(?<!\d)24\s*\/\s*7(?!\d)/g, 'vinte e quatro horas');
  out = out.replace(/(\d+(?:[.,]\d+)?)\s*[★⭐]/g, '$1 estrelas');
  const ptDays = [
    ['seg', 'segunda-feira'], ['ter', 'terça-feira'], ['qua', 'quarta-feira'],
    ['qui', 'quinta-feira'], ['sex', 'sexta-feira'], ['sáb', 'sábado'], ['dom', 'domingo']
  ];
  for (const [abbr, full] of ptDays) {
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}\\.(?![A-Za-zÀ-ÿ])`, 'gi'), full);
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}(?=[),;:]|\\s*[–—-])`, 'gi'), full);
  }
  const ptMonths = [
    ['jan', 'janeiro'], ['fev', 'fevereiro'], ['abr', 'abril'], ['mai', 'maio'],
    ['jun', 'junho'], ['jul', 'julho'], ['ago', 'agosto'], ['set', 'setembro'],
    ['out', 'outubro'], ['nov', 'novembro'], ['dez', 'dezembro']
  ];
  for (const [abbr, full] of ptMonths) {
    out = out.replace(new RegExp(`(?<!\\d)(\\d{1,2})\\s+de\\s+${abbr}\\.?(?![A-Za-zÀ-ÿ])`, 'gi'), `$1 de ${full}`);
  }
  out = out.replace(/(\d+)\s*min\.?(?![A-Za-zÀ-ÿ])/gi, '$1 minutos');
  out = out.replace(/(\d+)\s*hrs?\.?(?![A-Za-zÀ-ÿ])/gi, '$1 horas');
  out = out.replace(/(\d+)\s*pax\b/gi, '$1 pessoas');
  return out;
}

function normalizeFrench(text) {
  let out = text;
  out = out.replace(/\bELIO\+/gi, 'Elio Plus');
  out = out.replace(/(?<!\d)24\s*\/\s*7(?!\d)/g, 'vingt-quatre heures sur vingt-quatre');
  out = out.replace(/(\d+(?:[.,]\d+)?)\s*[★⭐]/g, '$1 étoiles');
  const frDays = [
    ['lun', 'lundi'], ['mar', 'mardi'], ['mer', 'mercredi'], ['jeu', 'jeudi'],
    ['ven', 'vendredi'], ['sam', 'samedi'], ['dim', 'dimanche']
  ];
  for (const [abbr, full] of frDays) {
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}\\.(?![A-Za-zÀ-ÿ])`, 'gi'), full);
  }
  const frMonths = [
    ['janv', 'janvier'], ['févr', 'février'], ['avr', 'avril'], ['juil', 'juillet'],
    ['sept', 'septembre'], ['oct', 'octobre'], ['nov', 'novembre'], ['déc', 'décembre']
  ];
  for (const [abbr, full] of frMonths) {
    out = out.replace(new RegExp(`(?<!\\d)(\\d{1,2})\\s+${abbr}\\.(?![A-Za-zÀ-ÿ])`, 'gi'), `$1 ${full}`);
  }
  out = out.replace(/(\d+)\s*min\.?(?![A-Za-zÀ-ÿ])/gi, '$1 minutes');
  return out;
}

function normalizeGerman(text) {
  let out = text;
  out = out.replace(/\bELIO\+/gi, 'Elio Plus');
  out = out.replace(/(?<!\d)24\s*\/\s*7(?!\d)/g, 'rund um die Uhr');
  out = out.replace(/(\d+(?:[.,]\d+)?)\s*[★⭐]/g, '$1 Sterne');
  const deDays = [
    ['Mo', 'Montag'], ['Di', 'Dienstag'], ['Mi', 'Mittwoch'], ['Do', 'Donnerstag'],
    ['Fr', 'Freitag'], ['Sa', 'Samstag'], ['So', 'Sonntag']
  ];
  for (const [abbr, full] of deDays) {
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}\\.(?![A-Za-zÄÖÜäöüß])`, 'g'), full);
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}(?=[),;:]|\\s*[–—-])`, 'g'), full);
  }
  const deMonths = [
    ['Jan', 'Januar'], ['Feb', 'Februar'], ['Apr', 'April'], ['Aug', 'August'],
    ['Sept?', 'September'], ['Okt', 'Oktober'], ['Nov', 'November'], ['Dez', 'Dezember']
  ];
  for (const [abbr, full] of deMonths) {
    out = out.replace(new RegExp(`(?<!\\d)(\\d{1,2}\\.)\\s+${abbr}\\.(?![A-Za-zÄÖÜäöüß])`, 'g'), `$1 ${full}`);
  }
  out = out.replace(/(\d+)\s*Min\.?(?![A-Za-zÄÖÜäöüß])/g, '$1 Minuten');
  out = out.replace(/(\d+)\s*Std\.?(?![A-Za-zÄÖÜäöüß])/g, '$1 Stunden');
  return out;
}

function normalizeItalian(text) {
  let out = text;
  out = out.replace(/\bELIO\+/gi, 'Elio Plus');
  out = out.replace(/(?<!\d)24\s*\/\s*7(?!\d)/g, 'ventiquattro ore su ventiquattro');
  out = out.replace(/(\d+(?:[.,]\d+)?)\s*[★⭐]/g, '$1 stelle');
  const itDays = [
    ['lun', 'lunedì'], ['mar', 'martedì'], ['mer', 'mercoledì'], ['gio', 'giovedì'],
    ['ven', 'venerdì'], ['sab', 'sabato'], ['dom', 'domenica']
  ];
  for (const [abbr, full] of itDays) {
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}\\.(?![A-Za-zÀ-ÿ])`, 'gi'), full);
    out = out.replace(new RegExp(`${LAT_LEFT}${abbr}(?=[),;:]|\\s+\\d)`, 'gi'), full);
  }
  const itMonths = [
    ['gen', 'gennaio'], ['feb', 'febbraio'], ['apr', 'aprile'], ['mag', 'maggio'],
    ['giu', 'giugno'], ['lug', 'luglio'], ['ago', 'agosto'], ['set', 'settembre'],
    ['ott', 'ottobre'], ['nov', 'novembre'], ['dic', 'dicembre']
  ];
  for (const [abbr, full] of itMonths) {
    out = out.replace(new RegExp(`(?<!\\d)(\\d{1,2})\\s+${abbr}\\.?(?![A-Za-zÀ-ÿ])`, 'gi'), `$1 ${full}`);
  }
  out = out.replace(/(\d+)\s*min\.?(?![A-Za-zÀ-ÿ])/gi, '$1 minuti');
  return out;
}

export function normalizeSpeechText(raw, locale = 'en', maxChars = 1200) {
  let out = String(raw || '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s*[→↔]\s*/g, ' — ')
    .replace(/\r?\n\s*[•*\-]\s+/g, '. ')
    .replace(/\r?\n+/g, '. ')
    .replace(/[•·|]+/g, ', ')
    .replace(/[*#_`~]+/g, ' ');

  const code = normalizeLocale(locale);
  if (code === 'ru') out = normalizeRussian(out);
  else if (code === 'uk') out = normalizeUkrainian(out);
  else if (code === 'es') out = normalizeSpanish(out);
  else if (code === 'pt') out = normalizePortuguese(out);
  else if (code === 'fr') out = normalizeFrench(out);
  else if (code === 'de') out = normalizeGerman(out);
  else if (code === 'it') out = normalizeItalian(out);
  else out = normalizeEnglish(out);

  return out
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u2B50\uFE0F\u200D]/gu, '')
    .replace(/([.!?…:;])\s*\./g, '$1')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*,/g, ',')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/^[.,;:\s]+/, '')
    .trim()
    .slice(0, maxChars);
}
