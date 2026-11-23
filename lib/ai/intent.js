// Listing search and section navigation share one multilingual intent registry.
import { getEcosystemIndex } from './ecosystemIndex';
import { matchActionCards } from '../aiSuggestions';
import { diningCollectionFor } from '../dining/filters.mjs';
import {
  extractBudget,
  extractNeighborhood,
  neighborhoodProximity,
  partySize
} from './tripProfile.mjs';

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'me', 'i', 'need', 'want', 'find', 'show', 'get', 'to', 'in', 'of', 'my',
  'with', 'best', 'under', 'near', 'please', 'can', 'you', 'looking', 'some', 'any', 'is', 'are', 'at', 'on',
  'this', 'that', 'from', 'в', 'на', 'с', 'со', 'и', 'по', 'для', 'от', 'до', 'из', 'к', 'над', 'под', 'о', 'об',
  'мне', 'нам', 'хочу', 'нужен', 'нужна', 'нужно', 'нужны', 'найди', 'покажи', 'подбери', 'посоветуй'
]);
const CITY_TOKENS = new Set([
  'miami', 'майами', 'маями', 'маямі', 'міамі', 'מיאמי', 'ميامي', 'میامی', '迈阿密', 'マイアミ', '마이애미'
]);
const norm = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/ё/g, 'е');
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const worlds = {
  '/yachts': 'drive', '/rentals': 'drive', '/private-jets': 'travel', '/travel': 'travel',
  '/vacation-rentals': 'travel', '/restaurants-nightlife': 'taste', '/experiences': 'play', '/events': 'play'
};
const belongs = (href, root) => href === root || href.startsWith(root + '/') || href.startsWith(root + '#');

// A number counts as a price only next to a currency or budget word: "$300",
// "300/day", "under 300", "budget 300". A bare "300" (stars, words, guests)
// must not match "$300/day" in a listing's text.
const BUDGET = /[$€£]\s*\d|\d\s*(?:\/|per\s+)(?:day|night|hour|person)|\b(?:under|below|less than|up to|max(?:imum)?|budget|around)\s*[$€£]?\s*\d|(?:до|бюджет|менее|не дороже)\s*[$€£]?\s*\d|(?:menos de|hasta|presupuesto)\s*[$€£]?\s*\d/iu;

const EXPLICIT_SPORT_CAR_RE = /\b(?:supercar|sports?\s*car|convertible|cabrio(?:let)?|coupe|ferrari|hurac[aá]n|aventador|revuelto|temerario|mclaren|720s|750s|570s|artura|911|gt3|corvette|amg\s*gt|r8)\b|суперкар|спорткар|кабриолет|купе|феррари|хуракан|уракан|авентадор|макларен|корвет/iu;

// Typo-tolerant & 16-language phonetic/transliterated entity alias expansions.
const MULTILINGUAL_ENTITY_ALIASES = [
  [/(?<![\p{L}\p{N}])(?:lamborgini|lamborgHini|ламборгини|ламборджини|ламб[ауы]|למבורגיני|لامبورغيني|لامبورجيني)(?![\p{L}\p{N}])|兰博基尼|ランボルギーニ|람보르기니/iu, 'lamborghini'],
  [/(?<![\p{L}\p{N}])(?:ferari|феррари|ферари|פרארי|فيراري)(?![\p{L}\p{N}])|法拉利|フェラーリ|페라리/iu, 'ferrari'],
  [/(?<![\p{L}\p{N}])(?:porche|porshe|порше|порш|פורשה|بورش)(?![\p{L}\p{N}])|保时捷|ポルシェ|포르쉐/iu, 'porsche'],
  [/(?<![\p{L}\p{N}])(?:mclaren|макларен|מקלארן|ماكلارين)(?![\p{L}\p{N}])|迈凯伦|マクラーレン|맥라렌/iu, 'mclaren'],
  [/(?<![\p{L}\p{N}])(?:rolls[\s-]*royce|рол+с[\s-]*ройс\p{L}*|רולס\s*רויס|رولز\s*رويس)(?![\p{L}\p{N}])|劳斯莱斯|ロールスロイス|롤스로이스/iu, 'rolls-royce'],
  [/(?<![\p{L}\p{N}])(?:bently|бентли|בנטלי|بنتلي)(?![\p{L}\p{N}])|宾利|ベントレー|벤틀리/iu, 'bentley'],
  [/(?<![\p{L}\p{N}])(?:mersedes|мерседес\p{L}*|мерс|מרצדס|مرسيدس)(?![\p{L}\p{N}])|奔驰|メルセデス|메르세데스/iu, 'mercedes'],
  [/(?<![\p{L}\p{N}])(?:maybah|майбах\p{L}*|מייבאך|مايباخ)(?![\p{L}\p{N}])|迈巴赫|マイバッハ|마이바흐/iu, 'maybach'],
  [/(?<![\p{L}\p{N}])(?:escalde|esclade|эскалейд\p{L}*|эскалэйд\p{L}*|אסקלייד|إسكاليد)(?![\p{L}\p{N}])|凯雷德|エスカレード|에스컬레이드/iu, 'cadillac escalade'],
  [/(?<![\p{L}\p{N}])(?:гелендваген\p{L}*|гелик\p{L}*|g[\s-]?wagon)(?![\p{L}\p{N}])/iu, 'mercedes g63'],
  [/(?<![\p{L}\p{N}])(?:урус\p{L}*|אורוס|أوروس)(?![\p{L}\p{N}])/iu, 'lamborghini urus'],
  [/(?<![\p{L}\p{N}])(?:хуракан\p{L}*|уракан\p{L}*|hurcan)(?![\p{L}\p{N}])/iu, 'lamborghini huracan'],
  [/(?<![\p{L}\p{N}])(?:куллинан\p{L}*|кулинан\p{L}*|culinan)(?![\p{L}\p{N}])/iu, 'rolls-royce cullinan'],
  [/(?<![\p{L}\p{N}])(?:рейндж\s*ровер\p{L}*|рендж\s*ровер\p{L}*|ריינג['׳]?\s*רובר|رينج\s*روفر)(?![\p{L}\p{N}])|路虎揽胜|レンジローバー|레인지로버/iu, 'range rover'],
  [/(?<![\p{L}\p{N}])(?:carbne|carbone|карбоне|карбон|קרבון|كاربون)(?![\p{L}\p{N}])/iu, 'carbone'],
  [/(?<![\p{L}\p{N}])(?:komdo|комодо|קומודו|كومودو)(?![\p{L}\p{N}])/iu, 'komodo'],
  [/(?<![\p{L}\p{N}])(?:папи\s*стейк|פאפי\s*סטייק|بابي\s*ستيك)(?![\p{L}\p{N}])/iu, 'papi steak'],
  [/(?<![\p{L}\p{N}])(?:секси\s*фиш|סקסי\s*פיש|سيكسي\s*فيش)(?![\p{L}\p{N}])/iu, 'sexy fish'],
  [/(?<![\p{L}\p{N}])(?:коте|котэ|côte)(?![\p{L}\p{N}])/iu, 'cote miami'],
  [/(?<![\p{L}\p{N}])(?:лпм)(?![\p{L}\p{N}])/iu, 'lpm']
];

export function expandMultilingualAliases(rawText) {
  const base = norm(rawText).trim();
  if (!base) return '';
  const extra = [];
  for (const [pattern, canonical] of MULTILINGUAL_ENTITY_ALIASES) {
    if (pattern.test(base) && !base.includes(canonical)) {
      extra.push(canonical);
    }
  }
  return extra.length ? `${base} ${extra.join(' ')}` : base;
}

function mergeEntities(baseEntities, extraEntities) {
  if (!Array.isArray(extraEntities) || !extraEntities.length) return baseEntities;
  const overrides = new Map();
  const additions = [];
  for (const entity of extraEntities) {
    if (!entity?.href) continue;
    overrides.set(entity.href, entity);
  }
  const merged = [];
  const seenHrefs = new Set();
  for (const entity of baseEntities) {
    if (overrides.has(entity.href) && !['Destination', 'World', 'Category'].includes(entity.type)) {
      merged.push(overrides.get(entity.href));
      seenHrefs.add(entity.href);
    } else {
      merged.push(entity);
    }
  }
  for (const [href, entity] of overrides.entries()) {
    if (!seenHrefs.has(href)) additions.push(entity);
  }
  return additions.length ? [...merged, ...additions] : merged;
}

/**
 * strict (concierge listing rows): numbers score only with budget context, and
 * a row qualifies only when it is named or sits in a section the guest's own
 * words asked for. The default keeps the site search behaviour unchanged.
 * `extraEntities` merges server-loaded Supabase/live-event records on top of
 * the synchronous index; `profile` applies session-wide guests, budget, and
 * Miami neighborhood proximity without changing any existing caller signature.
 */
export function searchEcosystem(query, { limit = 6, locale = 'en', strict = false, extraEntities = [], profile = null } = {}) {
  const q = expandMultilingualAliases(query);
  const numbers = !strict || BUDGET.test(q);
  const tokens = q
    .split(/[^\p{L}\p{N}$]+/gu)
    .filter((token) => token && !STOP.has(token) && (numbers || !/^\$?\p{N}+$/u.test(token)));
  if (!q) return { results: [], world: null, tokens: [] };

  const sections = matchActionCards(q, { limit: 4, locale });
  const turnGuests = partySize(q);
  const requested = turnGuests || (EXPLICIT_SPORT_CAR_RE.test(q) ? null : profile?.guests) || null;
  const diningCollection = diningCollectionFor(q);
  const targetNeighborhood = extractNeighborhood(q) || profile?.neighborhood || null;
  const queryBudget = extractBudget(q);
  const maxDailyBudget = queryBudget?.maxDaily || profile?.maxDailyBudget || null;
  const cheapest = Boolean(queryBudget?.cheapest || profile?.cheapest);
  const budgetAmounts = new Set([queryBudget?.maxDaily, queryBudget?.minDaily].filter(Boolean).map(String));

  const entities = mergeEntities(getEcosystemIndex(), extraEntities);
  const wantsMiami = tokens.some((token) => CITY_TOKENS.has(token)) || Boolean(targetNeighborhood);
  const searchTokens = tokens.filter((token) => !budgetAmounts.has(token.replace(/^\$/, '')));
  const hasSubjectToken = searchTokens.some((token) => !CITY_TOKENS.has(token));
  const tokenMatchers = searchTokens.map((token) => ({
    cityOnly: hasSubjectToken && CITY_TOKENS.has(token),
    pattern: /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(token)
      ? new RegExp(escape(token), 'u')
      : new RegExp('(?<![\\p{L}\\p{N}])' + escape(token) + '(?![\\p{L}\\p{N}])', 'u')
  }));

  let scored = [];

  for (const entity of entities) {
    const section = sections.findIndex((item) =>
      belongs(entity.href, item.href) || (strict && item.href === '/yachts' && entity.experienceSection === 'boats')
    );
    const named = !['Destination', 'World', 'Category'].includes(entity.type) &&
      [entity.title, ...(entity.aliases || [])].some((value) => {
        const name = norm(value);
        return name.length >= 3 && q.includes(name) && new RegExp('(?<![\\p{L}\\p{N}])' + escape(name) + '(?![\\p{L}\\p{N}])', 'u').test(q);
      });
    // A known listing outranks generic geography such as "Miami". Location
    // keywords must never exclude Komodo Miami or a named yacht model.
    if ((strict || sections.length) && section < 0 && !named) continue;
    if (requested && entity.capacity && entity.capacity < requested) continue;
    if (wantsMiami && entity.type === 'Experience' && entity.region === 'helicopters' && !named) continue;

    const title = norm(entity.title);
    const text = norm(entity.text);
    let score = 0;
    let cityBonus = 0;
    for (const { pattern, cityOnly } of tokenMatchers) {
      if (pattern.test(text)) {
        if (cityOnly) cityBonus += 0.25;
        else score += 2;
      }
      if (pattern.test(title)) {
        if (cityOnly) cityBonus += 0.5;
        else score += 4;
      }
    }
    if (score > 0 || named || !hasSubjectToken) score += cityBonus;

    // Inflected dining collection requests (e.g. "с Мишленом", "романтический")
    // match verified venues belonging to that collection even when an exact
    // declension is absent from raw token strings.
    if (diningCollection && entity.booking && Array.isArray(entity.collections) && entity.collections.includes(diningCollection)) {
      score += 6;
    }

    // Real Miami geographic proximity boost for restaurants & nightlife:
    // exact neighborhood gets +8; adjacent neighborhoods (e.g. Brickell <-> Downtown
    // Miami / Elcielo, Sunny Isles <-> Surfside / Surf Club) get proportional boost.
    if (targetNeighborhood && entity.neighborhood && (entity.type === 'Restaurant' || entity.type === 'Nightlife')) {
      const prox = neighborhoodProximity(targetNeighborhood, entity.neighborhood);
      if (prox > 0) score += prox === 1 ? 8 : prox * 7;
    }

    // Verified live TicketNetwork events rank ahead of static category placeholders
    // when the guest asks about /events.
    if (entity.liveEvent && section >= 0 && belongs(entity.href, '/events')) {
      score += 12;
    }

    // On /yachts turns (strict listing lookup), prioritize dedicated yacht charters
    // over general sightseeing boats/kayaks within the boats experience section.
    if (strict && entity.experienceSection === 'boats' && sections.some((item) => item.href === '/yachts')) {
      if (/\byacht\b|яхт/iu.test(`${entity.title} ${(entity.aliases || []).join(' ')}`)) score += 6;
    }

    // Smart occasion boosts: family with kids -> Zoo Miami & Everglades; anniversary/romantic -> Helicopter & Yacht; birthday/party -> VIP party venues.
    if (strict && entity.type === 'Experience' && /\b(?:kids|children|family)\b|с\s+детьми|для\s+детей|реб[её]нк|niños/iu.test(q)) {
      if (['exp-headout-5426', 'exp-viator-5096p35', 'exp-headout-3097', 'exp-headout-4215'].includes(entity.id)) score += 6;
    }
    if (strict && entity.type === 'Experience' && /\b(?:anniversary|honeymoon|romantic|date\s+night)\b|годовщин|свидан|романт|медов\p{L}*\s+месяц|aniversario/iu.test(q)) {
      if (['exp-viator-231628p7', 'exp-viator-5606753p1', 'exp-viator-8836p1'].includes(entity.id)) score += 6;
    }
    if (strict && (entity.type === 'Restaurant' || entity.type === 'Nightlife') && /\b(?:birthday|bachelor|bachelorette)\b|день\s+рождения|мальчишник|девичник|юбилей|cumpleaños/iu.test(q)) {
      if (/\bparty\b|вечеринк/iu.test(text)) score += 5;
    }

    if (!score) continue;
    if (named) score += 20;
    if (entity.type !== 'Destination' && entity.type !== 'World') score += 0.5;
    if (entity.type === 'Event' && entity.id?.startsWith('event-cat-')) score += 0.25;
    scored.push({ entity, score, section, named });
  }

  // Strict numeric daily budget filter for Car rentals when matching vehicles fit
  // under the stated cap; falls back gracefully to cheapest matches if cap is unrealistically low.
  if (maxDailyBudget) {
    const carWithinBudget = scored.filter(
      (item) => item.entity.type === 'Car' && Number.isFinite(item.entity.numericPrice) && item.entity.numericPrice <= maxDailyBudget
    );
    if (carWithinBudget.length) {
      scored = scored.filter(
        (item) => item.entity.type !== 'Car' || (Number.isFinite(item.entity.numericPrice) && item.entity.numericPrice <= maxDailyBudget)
      );
      for (const item of scored) {
        if (item.entity.type === 'Car' && Number.isFinite(item.entity.numericPrice)) {
          // Slight tie-breaker preferring vehicles well matched to the budget (or cheapest if requested).
          item.score += cheapest
            ? Math.max(0, 6 - item.entity.numericPrice / 400)
            : (item.entity.numericPrice / maxDailyBudget) * 1.5;
        }
      }
    } else {
      // Unrealistic cap (e.g. "Lamborghini under $100"): keep candidates but sort cheapest first.
      for (const item of scored) {
        if (item.entity.type === 'Car' && Number.isFinite(item.entity.numericPrice)) {
          item.score += Math.max(0, 4 - item.entity.numericPrice / 1000);
        }
      }
    }
  } else if (cheapest) {
    for (const item of scored) {
      if (item.entity.type === 'Car' && Number.isFinite(item.entity.numericPrice)) {
        item.score += Math.max(0, 6 - item.entity.numericPrice / 400);
      }
    }
  }

  scored.sort((a, b) =>
    Number(b.named) - Number(a.named)
    || Number(Boolean(b.entity.liveEvent)) - Number(Boolean(a.entity.liveEvent))
    || a.section - b.section
    || b.score - a.score
  );
  const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 48) : 6;
  const entityKey = (e) => (strict && e.booking?.href && (e.type === 'Flight' || e.type === 'Yacht') ? e.booking.href : e.href);
  const seen = new Set();
  const ranked = scored
    .filter((item) => {
      const key = entityKey(item.entity);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => item.entity);

  const results = [];
  // Keep a named match ahead of generic geography, then reserve one result
  // for each requested section before filling the remaining listing slots.
  if (scored[0]?.named) results.push(scored[0].entity);
  for (const section of sections) {
    if (results.length >= size) break;
    if (results.some((item) => belongs(item.href, section.href))) continue;
    const entity = ranked.find((item) => belongs(item.href, section.href));
    // An honest category fallback never invents inventory or availability.
    if (!entity && strict) continue;
    results.push(entity || {
      id: 'intent-' + section.href, type: 'Destination', world: worlds[section.href] || 'concierge',
      title: section.title, href: section.href, subtitle: null, capacity: null, text: section.label
    });
  }
  for (const entity of ranked) {
    if (results.length >= size) break;
    if (!results.some((item) => entityKey(item) === entityKey(entity))) results.push(entity);
  }
  return { results, world: results[0]?.world || null, tokens };
}
