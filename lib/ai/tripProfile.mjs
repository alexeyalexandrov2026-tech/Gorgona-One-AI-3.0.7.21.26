// ===========================================================================
// Session-wide VIP Trip Profile extractor & Miami geographic proximity model.
//
// Pure, deterministic, zero external I/O. Scans the guest's conversation turns
// to retain trip context (party size, Miami neighborhood, budget ceiling,
// relative dates, price preference) across turns so the concierge never asks
// redundant questions and always ranks listings with real Miami geography and
// numeric budget awareness.
// ===========================================================================

const norm = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/ё/g, 'е');

// Spelled-out numerals across all 16 supported languages (1..20) for partySize().
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
  `(?<![\\p{L}\\p{N}])(${NUM_ATOM})\\s*(?:people|guests?|pax|persons?|adults?|friends?|passengers?|personas?|personnes?|personen|persone|pessoas|os[oó]b|osoby|ki[şs]i(?:lik)?|человек(?:а)?|гостей|гостя|гості|осіб|пассажир(?:а|ов)?|персон|друзей|взрослых|אורחים|אנשים|نفر|أشخاص|اشخاص|人|位|名|명|분)(?![\\p{L}\\p{N}])`,
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

/** Extract party/group size from text across 16 languages without confusing durations/tickets. */
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

/** Parse a formatted daily price like "$1,200", "$495/day", or "850" -> positive integer or null. */
export function parseDailyPrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  if (typeof value !== 'string') return null;
  const match = value.match(/\$?\s*(\d{1,3}(?:,\d{3})+|\d{2,6})/);
  if (!match) return null;
  const num = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(num) && num >= 50 && num <= 100000 ? num : null;
}

function parseAmount(raw) {
  if (!raw) return null;
  const num = Number(String(raw).replace(/[\s,]/g, ''));
  return Number.isFinite(num) && num >= 50 && num <= 50000 ? num : null;
}

const BUDGET_RANGE = /[$€£]\s*(\d{2,5}(?:,\d{3})?)\s*[-–—]\s*[$€£]?\s*(\d{2,5}(?:,\d{3})?)|(\d{2,5})\s*[-–—]\s*(\d{2,5})\s*(?:[$€£]|usd|dollars?|доллар\p{L}*|\/day|per\s+day|в\s+день)/iu;
const BUDGET_MAX = /(?:under|below|less\s+than|up\s+to|max(?:imum)?|within|budget(?:\s+of)?|around|до|не\s+дороже|менее|бюджет(?:ом)?(?:\s+до)?|menos\s+de|hasta|presupuesto(?:\s+de)?|unter|bis|moins\s+de|jusqu['’]à|fino\s+a|poniżej|do)\s*[$€£]?\s*(\d{2,5}(?:,\d{3})?)(?!\s*(?:days?|nights?|hours?|people|guests?|дн|ноч|час|человек|гост|билет))/iu;
const BUDGET_CURRENCY = /[$€£]\s*(\d{2,5}(?:,\d{3})?)|(\d{2,5}(?:,\d{3})?)\s*(?:[$€£]|usd|dollars?|доллар\p{L}*|баксов)(?:\s*(?:\/|per\s+|в\s+)(?:day|день|сутки))?|(\d{2,5}(?:,\d{3})?)\s*(?:\/day|per\s+day|в\s+день|в\s+сутки)/iu;
const CHEAPEST_RE = /(?<![\p{L}\p{N}])(?:cheapest|lowest\s+price|most\s+affordable|budget[\s-]?friendly|inexpensive|affordable|самы\p{L}*\s+дешев\p{L}*|подешевле|недорог\p{L}*|бюджетн\p{L}*|más\s+barat\p{L}*|barat\p{L}*|günstigst\p{L}*|moins\s+cher|più\s+economico|najtańsz\p{L}*|en\s+ucuz|הכי\s+זול|الأرخص|ارزان)(?![\p{L}\p{N}])|最便宜|最安|가장\s*저렴/iu;

/**
 * Extract daily price constraints from natural guest wording across languages.
 * Never treats guest counts, days, years, or car model numbers (911, 720S) as budgets.
 */
export function extractBudget(text) {
  const raw = norm(text);
  let maxDaily = null;
  let minDaily = null;

  const range = raw.match(BUDGET_RANGE);
  if (range) {
    const a = parseAmount(range[1] || range[3]);
    const b = parseAmount(range[2] || range[4]);
    if (a && b) {
      minDaily = Math.min(a, b);
      maxDaily = Math.max(a, b);
    }
  }
  if (!maxDaily) {
    const maxMatch = raw.match(BUDGET_MAX);
    if (maxMatch) {
      const amount = parseAmount(maxMatch[1]);
      if (amount) maxDaily = amount;
    }
  }
  if (!maxDaily) {
    const curMatch = raw.match(BUDGET_CURRENCY);
    if (curMatch) {
      const amount = parseAmount(curMatch[1] || curMatch[2] || curMatch[3]);
      if (amount) maxDaily = amount;
    }
  }

  const cheapest = CHEAPEST_RE.test(raw);
  if (!maxDaily && !minDaily && !cheapest) return null;
  return { maxDaily, minDaily, cheapest };
}

// Canonical 22 Miami neighborhoods matching lib/dining/bookingSheet.mjs
const NEIGHBORHOOD_PATTERNS = [
  ['Brickell Key', /(?<![\p{L}\p{N}])(?:brickell\s+key|брикелл\s+ки)(?![\p{L}\p{N}])/iu],
  ['Brickell', /(?<![\p{L}\p{N}])(?:brickell|брикелл\p{L}*)(?![\p{L}\p{N}])/iu],
  ['South Beach', /(?<![\p{L}\p{N}])(?:south\s+beach|sobe|саус\s*бич\p{L}*|южн\p{L}*\s+пляж\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Miami Beach', /(?<![\p{L}\p{N}])(?:miami\s+beach|mid[\s-]?beach|майами\s*бич\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Design District', /(?<![\p{L}\p{N}])(?:design\s+district|дизайн[\s-]*дистрикт\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Wynwood', /(?<![\p{L}\p{N}])(?:wynwood|винвуд\p{L}*|уинвуд\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Downtown Miami', /(?<![\p{L}\p{N}])(?:downtown(?:\s+miami)?|даунтаун\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Coconut Grove', /(?<![\p{L}\p{N}])(?:coconut\s+grove|коконат[\s-]*гроув\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Coral Gables', /(?<![\p{L}\p{N}])(?:coral\s+gables|корал[\s-]*гейблс\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Sunny Isles Beach', /(?<![\p{L}\p{N}])(?:sunny\s+isles(?:\s+beach)?|санни[\s-]*айлс\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Bal Harbour', /(?<![\p{L}\p{N}])(?:bal\s+harbour|бал[\s-]*харбор\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Surfside', /(?<![\p{L}\p{N}])(?:surfside|серфсайд\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Key Biscayne', /(?<![\p{L}\p{N}])(?:key\s+biscayne|ки[\s-]*бискейн\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Little Havana', /(?<![\p{L}\p{N}])(?:little\s+havana|calle\s+ocho|литл[\s-]*гаван\p{L}*|маленьк\p{L}*\s+гаван\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Edgewater', /(?<![\p{L}\p{N}])(?:edgewater|эджвотер\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Little River', /(?<![\p{L}\p{N}])(?:little\s+river|литл[\s-]*ривер\p{L}*)(?![\p{L}\p{N}])/iu],
  ['Little Haiti / Lemon City', /(?<![\p{L}\p{N}])(?:little\s+haiti|lemon\s+city|литл[\s-]*гаити)(?![\p{L}\p{N}])/iu],
  ['MiMo / Upper Eastside', /(?<![\p{L}\p{N}])(?:mimo|upper\s+eastside)(?![\p{L}\p{N}])/iu],
  ['North Miami Beach', /(?<![\p{L}\p{N}])(?:north\s+miami\s+beach|норт\s+майами\s+бич)(?![\p{L}\p{N}])/iu],
  ['North Miami', /(?<![\p{L}\p{N}])(?:north\s+miami|норт\s+майами)(?![\p{L}\p{N}])/iu],
  ['South Miami', /(?<![\p{L}\p{N}])(?:south\s+miami|саус\s+майами)(?![\p{L}\p{N}])/iu],
  ['Kendall', /(?<![\p{L}\p{N}])(?:kendall|кендалл\p{L}*)(?![\p{L}\p{N}])/iu]
];

// Real Miami geographic proximity weights (driving/walking closeness).
const NEIGHBORHOOD_ADJACENCY = Object.freeze({
  Brickell: { 'Brickell Key': 0.95, 'Downtown Miami': 0.9, Edgewater: 0.7, 'Coconut Grove': 0.65, 'Key Biscayne': 0.6, Wynwood: 0.55, 'Little Havana': 0.55, 'Design District': 0.45, 'South Beach': 0.4 },
  'Brickell Key': { Brickell: 0.95, 'Downtown Miami': 0.85, Edgewater: 0.65, 'Coconut Grove': 0.6, 'Key Biscayne': 0.6 },
  'Downtown Miami': { Brickell: 0.9, 'Brickell Key': 0.85, Edgewater: 0.8, Wynwood: 0.75, 'Design District': 0.6, 'South Beach': 0.5, 'Little Havana': 0.6 },
  Edgewater: { Wynwood: 0.85, 'Downtown Miami': 0.8, 'Design District': 0.8, Brickell: 0.7, 'MiMo / Upper Eastside': 0.65, 'Miami Beach': 0.55 },
  Wynwood: { 'Design District': 0.9, Edgewater: 0.85, 'Downtown Miami': 0.75, 'Little Haiti / Lemon City': 0.65, Brickell: 0.55 },
  'Design District': { Wynwood: 0.9, Edgewater: 0.8, 'Little Haiti / Lemon City': 0.75, 'MiMo / Upper Eastside': 0.75, 'Little River': 0.7, 'Downtown Miami': 0.6 },
  'South Beach': { 'Miami Beach': 0.9, 'Downtown Miami': 0.5, Brickell: 0.45, Surfside: 0.4 },
  'Miami Beach': { 'South Beach': 0.9, Surfside: 0.75, 'Bal Harbour': 0.65, 'MiMo / Upper Eastside': 0.55, Edgewater: 0.55 },
  Surfside: { 'Bal Harbour': 0.95, 'Sunny Isles Beach': 0.85, 'Miami Beach': 0.75, 'North Miami Beach': 0.65, 'North Miami': 0.6 },
  'Bal Harbour': { Surfside: 0.95, 'Sunny Isles Beach': 0.9, 'North Miami Beach': 0.7, 'Miami Beach': 0.65, 'North Miami': 0.6 },
  'Sunny Isles Beach': { 'Bal Harbour': 0.9, Surfside: 0.85, 'North Miami Beach': 0.8, 'North Miami': 0.65 },
  'North Miami Beach': { 'Sunny Isles Beach': 0.8, 'North Miami': 0.85, 'Bal Harbour': 0.7, Surfside: 0.65 },
  'North Miami': { 'North Miami Beach': 0.85, 'Little River': 0.7, 'MiMo / Upper Eastside': 0.7, 'Sunny Isles Beach': 0.65, Surfside: 0.6 },
  'Coconut Grove': { 'Coral Gables': 0.85, Brickell: 0.65, 'Key Biscayne': 0.65, 'South Miami': 0.65, 'Little Havana': 0.55 },
  'Coral Gables': { 'Coconut Grove': 0.85, 'South Miami': 0.85, 'Little Havana': 0.65, Brickell: 0.5 },
  'Key Biscayne': { Brickell: 0.6, 'Coconut Grove': 0.65, 'Downtown Miami': 0.55 },
  'Little Havana': { Brickell: 0.55, 'Downtown Miami': 0.6, 'Coral Gables': 0.65, 'Coconut Grove': 0.55 },
  'Little River': { 'Little Haiti / Lemon City': 0.9, 'MiMo / Upper Eastside': 0.85, 'Design District': 0.7, 'North Miami': 0.7 },
  'Little Haiti / Lemon City': { 'Little River': 0.9, 'Design District': 0.75, 'MiMo / Upper Eastside': 0.75, Wynwood: 0.65 },
  'MiMo / Upper Eastside': { 'Little River': 0.85, 'Design District': 0.75, 'Little Haiti / Lemon City': 0.75, Edgewater: 0.65, 'North Miami': 0.7 },
  'South Miami': { 'Coral Gables': 0.85, 'Coconut Grove': 0.65, Kendall: 0.75 },
  Kendall: { 'South Miami': 0.75, 'Coral Gables': 0.5 }
});

/** Extract canonical Miami neighborhood name from guest text, or null. */
export function extractNeighborhood(text) {
  const input = String(text || '');
  for (const [canonical, pattern] of NEIGHBORHOOD_PATTERNS) {
    if (pattern.test(input)) return canonical;
  }
  return null;
}

/** Return geographic proximity score in [0..1] between two canonical Miami neighborhoods. */
export function neighborhoodProximity(target, candidate) {
  if (!target || !candidate) return 0;
  if (target === candidate) return 1;
  return NEIGHBORHOOD_ADJACENCY[target]?.[candidate] || NEIGHBORHOOD_ADJACENCY[candidate]?.[target] || 0;
}

function miamiIsoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
}

const WEEKDAY_PATTERNS = [
  [0, /(?<![\p{L}\p{N}])(?:sunday|воскресень\p{L}*|domingo|dimanche|sonntag|domenica|niedziel\p{L}*|pazar)(?![\p{L}\p{N}])/iu],
  [1, /(?<![\p{L}\p{N}])(?:monday|понедельник\p{L}*|lunes|lundi|montag|luned[ìi]|poniedział\p{L}*|pazartesi)(?![\p{L}\p{N}])/iu],
  [2, /(?<![\p{L}\p{N}])(?:tuesday|вторник\p{L}*|martes|mardi|dienstag|marted[ìi]|wtorek|salı)(?![\p{L}\p{N}])/iu],
  [3, /(?<![\p{L}\p{N}])(?:wednesday|сред[ауеы]|mi[eé]rcoles|mercredi|mittwoch|mercoled[ìi]|środ\p{L}*|çarşamba)(?![\p{L}\p{N}])/iu],
  [4, /(?<![\p{L}\p{N}])(?:thursday|четверг\p{L}*|jueves|jeudi|donnerstag|gioved[ìi]|czwart\p{L}*|perşembe)(?![\p{L}\p{N}])/iu],
  [5, /(?<![\p{L}\p{N}])(?:friday|пятниц\p{L}*|viernes|vendredi|freitag|venerd[ìi]|piąt\p{L}*|cuma)(?![\p{L}\p{N}])/iu],
  [6, /(?<![\p{L}\p{N}])(?:saturday|суббот\p{L}*|s[aá]bado|samedi|samstag|sabato|sobot\p{L}*|cumartesi)(?![\p{L}\p{N}])/iu]
];

const MONTH_WORDS = [
  [1, 'january|jan|январ\\p{L}*|січн\\p{L}*|enero|janeiro|janvier|januar|gennaio|stycz\\p{L}*|ocak'],
  [2, 'february|feb|феврал\\p{L}*|лют\\p{L}*|febrero|fevereiro|f[ée]vrier|februar|febbraio|lut\\p{L}*|şubat'],
  [3, 'march|mar|март\\p{L}*|березн\\p{L}*|marzo|março|mars|märz|marzec|mart'],
  [4, 'april|apr|апрел\\p{L}*|квітн\\p{L}*|abril|avril|aprile|kwiet\\p{L}*|nisan'],
  [5, 'may|ма[йяею]|травн\\p{L}*|mayo|maio|mai|maggio|maj\\p{L}*|mayıs'],
  [6, 'june|jun|июн\\p{L}*|червн\\p{L}*|junio|junho|juin|juni|giugno|czerw\\p{L}*|haziran'],
  [7, 'july|jul|июл\\p{L}*|липн\\p{L}*|julio|julho|juillet|juli|luglio|lipc\\p{L}*|temmuz'],
  [8, 'august|aug|август\\p{L}*|серпн\\p{L}*|agosto|ao[ûu]t|sierp\\p{L}*|ağustos'],
  [9, 'september|sep|sept|сентябр\\p{L}*|вересн\\p{L}*|septiembre|setembro|septembre|settembre|wrześ\\p{L}*|wrzes\\p{L}*|eylül'],
  [10, 'october|oct|октябр\\p{L}*|жовтн\\p{L}*|octubre|outubro|octobre|oktober|ottobre|paździer\\p{L}*|ekim'],
  [11, 'november|nov|ноябр\\p{L}*|листопад\\p{L}*|noviembre|novembro|novembre|listopad\\p{L}*|kasım'],
  [12, 'december|dec|декабр\\p{L}*|грудн\\p{L}*|diciembre|dezembro|d[ée]cembre|dezember|dicembre|grud\\p{L}*|aralık']
];

function validIsoDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dt = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(dt.getTime()) || dt.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

function resolveFutureIso(month, day, explicitYear, today) {
  const baseYear = explicitYear || Number(today.slice(0, 4));
  let iso = validIsoDate(baseYear, month, day);
  if (!iso) return null;
  if (!explicitYear && iso < today) {
    iso = validIsoDate(baseYear + 1, month, day);
  }
  return iso && iso >= today ? iso : null;
}

function parseCalendarDateRange(input, today) {
  for (const [monthNum, words] of MONTH_WORDS) {
    // 1. Day (or Day-Day range) before Month: "5 декабря", "5-7 декабря", "с 5 по 7 декабря", "5 de diciembre"
    const dayFirst = new RegExp(
      `(?<![\\p{L}\\p{N}$])(\\d{1,2})(?:(?:\\s*[-–—]\\s*|\\s+(?:по|to|a|au|до)\\s+)(\\d{1,2}))?(?:st|nd|rd|th|-го|-е)?\\s+(?:de\\s+|d['’]\\s*)?(?:${words})(?:\\s+(20\\d{2}))?(?![\\p{L}\\p{N}])`,
      'iu'
    );
    const m1 = input.match(dayFirst);
    if (m1) {
      const d1 = Number(m1[1]);
      const d2 = m1[2] ? Number(m1[2]) : d1;
      const yr = m1[3] ? Number(m1[3]) : null;
      const from = resolveFutureIso(monthNum, d1, yr, today);
      const to = resolveFutureIso(monthNum, d2, yr, today);
      if (from && to && to >= from) return { from, to };
    }

    // 2. Month before Day (or Day-Day range): "December 5", "Dec 5-7, 2026"
    const monthFirst = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${words})\\s+(\\d{1,2})(?:(?:\\s*[-–—]\\s*|\\s+to\\s+)(\\d{1,2}))?(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?(?![\\p{L}\\p{N}])`,
      'iu'
    );
    const m2 = input.match(monthFirst);
    if (m2) {
      const d1 = Number(m2[1]);
      const d2 = m2[2] ? Number(m2[2]) : d1;
      const yr = m2[3] ? Number(m2[3]) : null;
      const from = resolveFutureIso(monthNum, d1, yr, today);
      const to = resolveFutureIso(monthNum, d2, yr, today);
      if (from && to && to >= from) return { from, to };
    }
  }

  // 3. Numeric DD.MM or DD.MM.YYYY (e.g. "05.12" or "05.12.2026")
  const dotMatch = input.match(/(?<![\p{L}\p{N}.])(\d{1,2})\.(\d{1,2})(?:\.(20\d{2}))?(?![\p{L}\p{N}.])/u);
  if (dotMatch) {
    const day = Number(dotMatch[1]);
    const month = Number(dotMatch[2]);
    const yr = dotMatch[3] ? Number(dotMatch[3]) : null;
    const iso = resolveFutureIso(month, day, yr, today);
    if (iso) return { from: iso, to: iso };
  }

  // 4. Whole-month queries: "в декабре", "in December", "en diciembre"
  for (const [monthNum, words] of MONTH_WORDS) {
    const monthOnly = new RegExp(`(?<![\\p{L}\\p{N}])(?:в|во|на|in|during|for|en|au|im)\\s+(?:${words})(?:\\s+(20\\d{2}))?(?![\\p{L}\\p{N}])`, 'iu');
    const m3 = input.match(monthOnly);
    if (m3) {
      const todayYear = Number(today.slice(0, 4));
      const todayMonth = Number(today.slice(5, 7));
      const yr = m3[1] ? Number(m3[1]) : (monthNum < todayMonth ? todayYear + 1 : todayYear);
      const monthStr = String(monthNum).padStart(2, '0');
      const firstDay = `${yr}-${monthStr}-01`;
      const lastDate = new Date(Date.UTC(yr, monthNum, 0, 12, 0, 0)).toISOString().slice(0, 10);
      const from = firstDay < today ? today : firstDay;
      if (lastDate >= from) return { from, to: lastDate };
    }
  }

  return null;
}

/**
 * Resolve explicit or relative Miami dates ("today", "tomorrow", "this weekend",
 * "Friday", "в воскресенье", "5 декабря", "December 5", "2026-12-04") into an ISO { from, to } window.
 */
export function extractDateRange(text, now = new Date()) {
  const input = String(text || '');
  const today = miamiIsoDate(now);

  const isoMatches = input.match(/\b20\d{2}-\d{2}-\d{2}\b/g);
  if (isoMatches?.length) {
    const valid = isoMatches.filter((d) => Number.isFinite(Date.parse(d)) && d >= today).sort();
    if (valid.length) return { from: valid[0], to: valid.at(-1) };
  }

  const calRange = parseCalendarDateRange(input, today);
  if (calRange) return calRange;

  if (/(?<![\p{L}\p{N}])(?:day\s+after\s+tomorrow|послезавтра|післязавтра|pasado\s+mañana|après[\s-]?demain|übermorgen|dopodomani)(?![\p{L}\p{N}])/iu.test(input)) {
    const dat = addDays(today, 2);
    return { from: dat, to: dat };
  }

  if (/(?<![\p{L}\p{N}])(?:today|tonight|сегодня|вечером|hoy|aujourd['’]?hui|heute|oggi|dzisiaj|bugün|היום|اليوم|امروز)(?![\p{L}\p{N}])|今天|今晚|今日|오늘/iu.test(input)) {
    return { from: today, to: today };
  }

  if (/(?<![\p{L}\p{N}])(?:tomorrow|завтра|mañana|amanhã|demain|morgen|domani|jutro|yarın|מחר|غدا|فردا)(?![\p{L}\p{N}])|明天|明日|내일/iu.test(input)) {
    const tom = addDays(today, 1);
    return { from: tom, to: tom };
  }

  if (/(?<![\p{L}\p{N}])(?:weekend|выходн\p{L}*|вихідн\p{L}*|fin\s+de\s+semana|wochenende|week[\s-]?end|fine\s+settimana|hafta\s+sonu)(?![\p{L}\p{N}])|周末|週末|주말/iu.test(input)) {
    const dow = weekdayOf(today);
    if (dow === 0) return { from: today, to: today };
    if (dow === 6) return { from: today, to: addDays(today, 1) };
    const friOffset = 5 - dow;
    return { from: addDays(today, friOffset), to: addDays(today, friOffset + 2) };
  }

  if (/(?<![\p{L}\p{N}])(?:next\s+week|следующ\p{L}*\s+недел\p{L}*|próxima\s+semana|semaine\s+prochaine|nächste\s+woche)(?![\p{L}\p{N}])/iu.test(input)) {
    const dow = weekdayOf(today);
    const nextMon = dow === 0 ? 1 : 8 - dow;
    return { from: addDays(today, nextMon), to: addDays(today, nextMon + 6) };
  }

  for (const [targetDow, pattern] of WEEKDAY_PATTERNS) {
    if (pattern.test(input)) {
      const dow = weekdayOf(today);
      const delta = (targetDow - dow + 7) % 7;
      const day = addDays(today, delta);
      return { from: day, to: day };
    }
  }

  return null;
}

const OCCASION_PATTERNS = [
  ['proposal', /(?<![\p{L}\p{N}])(?:proposal|propose|engagement|предложени\p{L}*\s+рук|помолвк|propuesta|pedida|demande\s+en\s+mariage|heiratsantrag)(?![\p{L}\p{N}])/iu],
  ['anniversary', /(?<![\p{L}\p{N}])(?:anniversary|годовщин\p{L}*|річниц\p{L}*|aniversario|aniversário|jahrestag|yıldönümü|יום\s+נישואין|ذكرى\s+زواج|سالگرد)(?![\p{L}\p{N}])|纪念日|記念日|기념일/iu],
  ['birthday', /(?<![\p{L}\p{N}])(?:birthday|bday|день\s+рождения|днюх\p{L}*|день\s+народження|cumpleaños|geburtstag|compleanno|urodzin\p{L}*|doğum\s+günü|יום\s+הולדת|عيد\s+ميلاد|تولد)(?![\p{L}\p{N}])|生日|誕生日|생일/iu],
  ['family-kids', /(?<![\p{L}\p{N}])(?:with\s+kids|with\s+children|family\s+trip|kids|children|toddlers?|с\s+детьми|с\s+реб[её]нк\p{L}*|з\s+дітьми|con\s+niños|mit\s+kindern|avec\s+enfants|con\s+bambini|z\s+dziećmi|çocukl\p{L}*|עם\s+ילדים|مع\s+أطفال)(?![\p{L}\p{N}])|带孩子|子連れ|아이\s*동반/iu],
  ['business', /(?<![\p{L}\p{N}])(?:business\s+trip|client\s+dinner|corporate|conference|делов\p{L}*|бизнес[\s-]*(?:поездк|ужин|встреч)|командировк|negocios|geschäftsreise|affaires)(?![\p{L}\p{N}])/iu],
  ['party', /(?<![\p{L}\p{N}])(?:bachelor(?:ette)?|stag|hen\s+do|мальчишник|девичник|вечеринк\p{L}*|despedida|party\s+night)(?![\p{L}\p{N}])/iu],
  ['romantic', /(?<![\p{L}\p{N}])(?:romantic|date\s+night|honeymoon|романт\p{L}*|свидани\p{L}*|медов\p{L}*\s+месяц|romántic\p{L}*|romantique|romantisch)(?![\p{L}\p{N}])/iu]
];

const CUISINE_PATTERNS = [
  ['no-seafood', /(?<![\p{L}\p{N}])(?:no\s+seafood|don['’]?t\s+eat\s+(?:seafood|fish)|allergic\s+to\s+(?:seafood|shellfish)|не\s+е(?:ст|м|дят)\s+(?:морепродукт\p{L}*|рыб\p{L}*)|без\s+(?:морепродукт\p{L}*|рыб\p{L}*)|sin\s+mariscos|sans\s+fruits\s+de\s+mer)(?![\p{L}\p{N}])/iu],
  ['halal', /(?<![\p{L}\p{N}])(?:halal|халял\p{L}*|חלאל|حلال)(?![\p{L}\p{N}])/iu],
  ['kosher', /(?<![\p{L}\p{N}])(?:kosher|кошер\p{L}*|כשר|كوشير)(?![\p{L}\p{N}])/iu],
  ['vegan', /(?<![\p{L}\p{N}])(?:vegan|vegetarian|веган\p{L}*|вегетариан\p{L}*|vegano|végan|טבעוני|نباتي)(?![\p{L}\p{N}])/iu],
  ['sushi', /(?<![\p{L}\p{N}])(?:sushi|omakase|japanese|суши|омакасе|японск\p{L}*|سوشي|סושי)(?![\p{L}\p{N}])|寿司|스시/iu],
  ['steakhouse', /(?<![\p{L}\p{N}])(?:steak(?:house)?|meat|wagyu|стейк\p{L}*|мясн\p{L}*|вагю|ستيك|סטייק)(?![\p{L}\p{N}])/iu],
  ['italian', /(?<![\p{L}\p{N}])(?:italian|pasta|итальянск\p{L}*|паста|italiana|italiano)(?![\p{L}\p{N}])/iu],
  ['seafood', /(?<![\p{L}\p{N}])(?:seafood|oysters?|lobster|морепродукт\p{L}*|устриц\p{L}*|лобстер\p{L}*|mariscos)(?![\p{L}\p{N}])/iu],
  ['mediterranean', /(?<![\p{L}\p{N}])(?:mediterranean|greek|средиземноморск\p{L}*|греческ\p{L}*)(?![\p{L}\p{N}])/iu]
];

const AIRPORT_MIA = /(?<![\p{L}\p{N}])(?:mia|miami\s+international(?:\s+airport)?|аэропорт\p{L}*\s+майами)(?![\p{L}\p{N}])/iu;
const AIRPORT_FLL = /(?<![\p{L}\p{N}])(?:fll|fort\s+lauderdale\s+airport|форт[\s-]*лодердейл\p{L}*\s+аэропорт)(?![\p{L}\p{N}])/iu;

/** Extract occasion tag from guest text across languages, or null. */
export function extractOccasion(text) {
  const input = String(text || '');
  for (const [tag, pattern] of OCCASION_PATTERNS) {
    if (pattern.test(input)) return tag;
  }
  return null;
}

/** Extract cuisine / dietary preferences from guest text (up to 3). */
export function extractCuisinePreferences(text) {
  const input = String(text || '');
  const found = [];
  for (const [tag, pattern] of CUISINE_PATTERNS) {
    if (pattern.test(input)) {
      if (tag === 'seafood' && found.includes('no-seafood')) continue;
      found.push(tag);
      if (found.length >= 3) break;
    }
  }
  return found;
}

/** Extract Miami arrival/departure airport code ('MIA' | 'FLL' | null). */
export function extractAirport(text) {
  const input = String(text || '');
  if (AIRPORT_FLL.test(input)) return 'FLL';
  if (AIRPORT_MIA.test(input)) return 'MIA';
  return null;
}

/**
 * Scan all user turns in a session (oldest -> newest) to build a durable
 * structured TripProfile. Newest turn overrides older values for the same slot.
 */
export function extractTripProfile(messages, now = new Date()) {
  const turns = (Array.isArray(messages) ? messages : [])
    .filter((m) => m?.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content);

  let guests = null;
  let neighborhood = null;
  let maxDailyBudget = null;
  let minDailyBudget = null;
  let cheapest = false;
  let dateRange = null;
  let occasion = null;
  let airport = null;
  let hasKids = false;
  const cuisineSet = new Set();

  for (const text of turns) {
    const g = partySize(text);
    if (g) guests = g;

    const hood = extractNeighborhood(text);
    if (hood) neighborhood = hood;

    const budget = extractBudget(text);
    if (budget) {
      if (budget.maxDaily) maxDailyBudget = budget.maxDaily;
      if (budget.minDaily) minDailyBudget = budget.minDaily;
      if (budget.cheapest) cheapest = true;
    }

    const dr = extractDateRange(text, now);
    if (dr) dateRange = dr;

    const occ = extractOccasion(text);
    if (occ) {
      occasion = occ;
      if (occ === 'family-kids') hasKids = true;
    }

    const ap = extractAirport(text);
    if (ap) airport = ap;

    for (const tag of extractCuisinePreferences(text)) {
      if (tag === 'no-seafood') cuisineSet.delete('seafood');
      if (tag === 'seafood' && cuisineSet.has('no-seafood')) continue;
      cuisineSet.add(tag);
    }
  }

  return {
    guests,
    neighborhood,
    maxDailyBudget,
    minDailyBudget,
    cheapest,
    dateRange,
    datesMentioned: Boolean(dateRange),
    occasion,
    hasKids,
    airport,
    dietaryOrCuisine: [...cuisineSet].slice(0, 3)
  };
}

/** Compact one-line summary for Workers AI system context (<= 220 bytes, zero PII). */
export function tripProfilePromptLine(profile) {
  if (!profile || typeof profile !== 'object') return '';
  const bits = [];
  if (profile.guests) bits.push(`guests=${profile.guests}`);
  if (profile.neighborhood) bits.push(`neighborhood=${profile.neighborhood}`);
  if (profile.dateRange) {
    bits.push(profile.dateRange.from === profile.dateRange.to
      ? `date=${profile.dateRange.from}`
      : `dates=${profile.dateRange.from}..${profile.dateRange.to}`);
  }
  if (profile.maxDailyBudget) bits.push(`maxCarBudget=$${profile.maxDailyBudget}/day`);
  else if (profile.cheapest) bits.push('pricePreference=budget');
  if (profile.occasion) bits.push(`occasion=${profile.occasion}`);
  if (profile.hasKids && profile.occasion !== 'family-kids') bits.push('kids=yes');
  if (profile.airport) bits.push(`airport=${profile.airport}`);
  if (Array.isArray(profile.dietaryOrCuisine) && profile.dietaryOrCuisine.length) {
    bits.push(`cuisine=${profile.dietaryOrCuisine.join('+')}`);
  }
  return bits.length ? `Session trip profile: ${bits.join(', ')}.` : '';
}

export const STAY22_MIAMI_BASE_URL = 'https://www.stay22.com/embed/gm?aid=gorgonaone&address=Miami%2C+FL%2C+USA&viewmode=listview&showhotels=false&rentalsapi=vrbo&campaign=gorgona_miami_rentals_list';

/** Enrich the verified Stay22 referral URL with remembered check-in/out dates and guest count. */
export function buildStay22ReferralUrl(profile = null) {
  if (!profile || typeof profile !== 'object') return STAY22_MIAMI_BASE_URL;
  try {
    const url = new URL(STAY22_MIAMI_BASE_URL);
    if (profile.dateRange?.from) {
      url.searchParams.set('checkin', profile.dateRange.from);
      if (profile.dateRange.to && profile.dateRange.to > profile.dateRange.from) {
        url.searchParams.set('checkout', profile.dateRange.to);
      }
    }
    if (Number.isInteger(profile.guests) && profile.guests > 0 && profile.guests < 100) {
      url.searchParams.set('guests', String(profile.guests));
    }
    return url.href;
  } catch {
    return STAY22_MIAMI_BASE_URL;
  }
}
