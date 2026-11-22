// A plan is a set of real catalogue items for two or more sections the guest
// named in one message ("a yacht on Saturday, dinner and a car"). Items are
// picked from the catalogue, never from model text, so a plan cannot contain
// a yacht or a restaurant that does not exist. Pure: the caller supplies the catalogue.
import { matchActionCards } from '../aiSuggestions.js';
import { followup } from './conversation.mjs';
import { PLAN_SECTIONS, PLAN_LIMITS } from '../planRules.mjs';

const STOP = new Set(['the','and','for','with','want','need','find','show','please','looking','some','this','that','from','miami','plan','weekend','day','days','night','nights','also','then','our','your']);
const norm = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/ё/g, 'е');

// Spelled-out numerals across supported languages (1..20) for partySize().
const NUMBER_WORDS = Object.freeze({
  // English
  one: 1, two: 2, couple: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  // Russian & Ukrainian (cardinals, genitive, collective, adverbial)
  один: 1, одного: 1, одной: 1, одна: 1,
  два: 2, две: 2, двух: 2, двох: 2, двое: 2, двоих: 2, двоє: 2, вдвоем: 2,
  три: 3, трех: 3, трьох: 3, трое: 3, троих: 3, троє: 3, втроем: 3,
  четыре: 4, чотири: 4, четырех: 4, чотирьох: 4, четверо: 4, четверых: 4, вчетвером: 4,
  пять: 5, пятьох: 5, пяти: 5, пятеро: 5, пятерых: 5, впятером: 5,
  шесть: 6, шість: 6, шести: 6, шестеро: 6, шестерых: 6, вшестером: 6,
  семь: 7, сім: 7, семи: 7, семеро: 7, семерых: 7,
  восемь: 8, вісім: 8, восьми: 8, восьмеро: 8, восьмерых: 8,
  девять: 9, дев: 9, девяти: 9, девятеро: 9, девятерых: 9,
  десять: 10, десяти: 10, десятеро: 10, десятерых: 10,
  одиннадцать: 11, одиннадцати: 11, двенадцать: 12, двенадцати: 12,
  тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16,
  семнадцать: 17, восемнадцать: 18, девятнадцать: 19, двадцать: 20, двадцати: 20,
  // Spanish
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  // Portuguese
  um: 1, uma: 1, dois: 2, duas: 2, quatro: 4, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  // French
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12,
  // German
  eins: 1, ein: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, zwolf: 12,
  // Italian
  due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, dieci: 10, undici: 11, dodici: 12,
  // Polish
  jeden: 1, dwoje: 2, trzech: 3, troje: 3, cztery: 4, czterech: 4, czworo: 4, pięć: 5, piec: 5, pięciu: 5, sześć: 6, szesc: 6, sześciu: 6, siedem: 7, siedmiu: 7, osiem: 8, ośmiu: 8, dziewięć: 9, dziesięć: 10,
  // Turkish
  bir: 1, iki: 2, üç: 3, uc: 3, dört: 4, dort: 4, beş: 5, bes: 5, altı: 6, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10,
  // Hebrew
  אחד: 1, שניים: 2, שתיים: 2, שלושה: 3, ארבעה: 4, חמישה: 5, שישה: 6, שבעה: 7, שמונה: 8, תשעה: 9, עשרה: 10,
  // Arabic
  واحد: 1, اثنان: 2, اثنين: 2, ثلاثة: 3, أربعة: 4, اربعة: 4, خمسة: 5, ستة: 6, سبعة: 7, ثمانية: 8, تسعة: 9, عشرة: 10,
  // Persian
  یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, هفت: 7, هشت: 8, نه: 9, ده: 10,
  // Chinese / Japanese / Korean
  一: 1, 二: 2, 两: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10
});

const WORD_NUM_LIST = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join('|');
const NUM_ATOM = `(?:\\d{1,2}|${WORD_NUM_LIST})`;
const NON_PARTY_UNIT = `(?:days?|nights?|hours?|weeks?|months?|years?|tickets?|cars?|yachts?|boats?|rooms?|bedrooms?|doors?|bags?|suitcases?|stars?|words?|дн(?:я|ей)?|день|ноч(?:и|ей)?|час(?:а|ов)?|недел(?:ю|и|ь)?|месяц(?:а|ев)?|билет(?:а|ов)?|квитк(?:а|ів)?|машин(?:ы|у)?|яхт(?:ы|у)?|комнат|спал(?:ен|ьни)|двер|чемодан|d[ií]as?|noches?|horas?|semanas?|entradas?|jours?|nuits?|heures?|tage|stunden|giorni|notti|dni|g[üu]n|saat)`;

const PARTY_WITH_NOUN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${NUM_ATOM})\\s*(?:people|guests?|pax|persons?|adults?|friends?|passengers?|personas?|personnes?|personen|persone|pessoas|os[oó]b|osoby|ki[şs]i(?:lik)?|человек(?:а)?|гостей|гостя|гості|гостей|осіб|пассажир(?:а|ов)?|персон|друзей|взрослых|אורחים|אנשים|نفر|أشخاص|اشخاص|人|位|名|명|분)(?![\\p{L}\\p{N}])`,
  'iu'
);
const PARTY_WITH_PREP = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:for|party\\s+of|table\\s+for|для|на|нас|para|pour|f[üu]r|per|dla)\\s+(${NUM_ATOM})(?![\\p{L}\\p{N}])(?!\\s*${NON_PARTY_UNIT}(?![\\p{L}\\p{N}]))`,
  'iu'
);
const PARTY_COLLECTIVE = /(?<![\p{L}\p{N}])(вдвоем|втроем|вчетвером|впятером|вшестером|двоих|троих|четверых|пятерых|шестерых|семерых|восьмерых|девятерых|десятерых|двое|трое|четверо|пятеро|шестеро|семеро|восьмеро|девятеро|десятеро|לשמונה|לארבעה|לשישה|לשלושה|לשניים|لثمانية|لأربعة|لستة|لثلاثة)(?![\p{L}\p{N}])/iu;
const PARTY_CJK = /([1-9]\d?|[一二两兩三四五六七八九十]|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*(?:人|位|名|명|분)/u;
const HE_AR_PREF_MAP = { לשמונה: 8, לארבעה: 4, לשישה: 6, לשלושה: 3, לשניים: 2, لثمانية: 8, لأربعة: 4, لستة: 6, لثلاثة: 3 };

/** Parse an Arabic digit string or spelled-out numeral word (1..99), or null. */
export function parseNumberWord(raw) {
  const token = norm(raw).trim();
  if (!token) return null;
  if (/^\d{1,2}$/.test(token)) {
    const n = Number(token);
    return n >= 1 && n <= 99 ? n : null;
  }
  return NUMBER_WORDS[token] || HE_AR_PREF_MAP[token] || null;
}

const ORDER = Object.keys(PLAN_SECTIONS);
/** Sections of a message that can join a plan, in one fixed order: yacht, villa, car, restaurant. */
export function planSections(text, locale) {
  return matchActionCards(String(text || ''), { limit:8, locale }).filter(card => PLAN_SECTIONS[card.href])
    .sort((a, b) => ORDER.indexOf(a.href) - ORDER.indexOf(b.href)).slice(0, PLAN_LIMITS.sections);
}

/**
 * The text a plan is built from: the newest message when it names two or
 * more plan sections, or a short follow-up ("for 6 people") joined to the
 * most recent message that did. Otherwise there is no plan.
 */
export function planQuery(messages) {
  const turns = (Array.isArray(messages) ? messages : []).filter(m => m?.role === 'user' && typeof m.content === 'string');
  const latest = turns.at(-1)?.content || '';
  if (planSections(latest).length >= 2) return latest;
  if (!latest || latest.length > 300 || !followup.test(latest)) return null;
  for (let i = turns.length - 2; i >= 0; i--) if (planSections(turns[i].content).length >= 2) return turns[i].content + ' ' + latest;
  return null;
}

export function partySize(text) {
  const normalized = norm(text);
  const direct = normalized.match(PARTY_WITH_NOUN);
  if (direct) {
    const value = parseNumberWord(direct[1]);
    if (value) return value;
  }
  const prep = normalized.match(PARTY_WITH_PREP);
  if (prep) {
    const value = parseNumberWord(prep[1]);
    if (value) return value;
  }
  const collective = normalized.match(PARTY_COLLECTIVE);
  if (collective) {
    const value = parseNumberWord(collective[1]);
    if (value) return value;
  }
  const cjk = normalized.match(PARTY_CJK);
  if (cjk) {
    const value = parseNumberWord(cjk[1]);
    if (value) return value;
  }
  return null;
}

function rank(items, query, guests) {
  const tokens = [...new Set(norm(query).split(/[^\p{L}\p{N}]+/u).filter(token => token.length >= 3 && !STOP.has(token)))];
  return items
    .map((item, order) => {
      if (guests && Number.isInteger(item.capacity) && item.capacity < guests) return null;
      const title = norm(item.title), text = norm(item.text);
      let score = 0;
      for (const token of tokens) { if (title.includes(token)) score += 4; if (text.includes(token)) score += 2; }
      if (item.featured) score += 1;
      if (item.image) score += 0.5;
      return { item, score, order };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(entry => entry.item);
}

/**
 * @param {Array<{role:string,content:string}>} messages
 * @param {{catalog:Record<string,Array<object>>, locale?:string, requestable?:boolean}} options
 *   catalog keys: yacht, stay, car, dining (restaurants and nightlife, already
 *   limited to items that can be requested on the site).
 */
export function buildPlan(messages, { catalog, locale = 'en', requestable = false } = {}) {
  const query = planQuery(messages);
  if (!query || !catalog) return null;
  const guests = partySize(query);
  const sections = [];
  for (const section of planSections(query, locale)) {
    const kind = PLAN_SECTIONS[section.href];
    const candidates = rank(Array.isArray(catalog[kind]) ? catalog[kind] : [], query, guests).slice(0, PLAN_LIMITS.candidates);
    if (!candidates.length) continue;
    sections.push({
      href: section.href,
      label: section.label || section.title,
      candidates: candidates.map(item => ({
        kind: item.kind || kind, slug: item.slug, title: item.title,
        ...(item.subtitle ? { subtitle: item.subtitle } : {}), ...(item.image ? { image: item.image } : {}),
        ...(item.price ? { price: item.price } : {}),
        href: section.href + '/' + item.slug
      }))
    });
  }
  return sections.length >= 2 ? { version:1, guests, sections, requestable:Boolean(requestable) } : null;
}
