import { navigationForSections } from '../aiSuggestions.js';
import { adviceCopy, adviceOptions, adviceQuestions, carAdviceMatches } from './conciergeAdvice.mjs';
import { conciergeCopy } from './conciergeCopy.mjs';
import { normalizeLocale } from './locale.js';
import { answerForNavigation } from './catalogueAnswer.mjs';
import { partySize } from './plan.mjs';
import { extractDateRange } from './tripProfile.mjs';

export const CONVERSATION_POLICY = 'conversation-v1';

// Curated local stops, not live inventory. Zoo Miami, Everglades and
// Wynwood Walls are also in the site's experiences catalogue.
const stops = {
  'south-beach': { name: 'South Beach', focus: 'beach and Art Deco, outdoors' },
  'frost-science': { name: 'Frost Science', focus: 'science museum, aquarium, planetarium, indoor' },
  'childrens-museum': { name: 'Miami Children’s Museum', focus: 'play museum for kids, indoor' },
  pamm: { name: 'Pérez Art Museum Miami', focus: 'contemporary art museum, indoor' },
  'zoo-miami': { name: 'Zoo Miami', focus: 'family and wildlife, outdoors' },
  everglades: { name: 'Everglades', focus: 'wetlands and airboat nature, outdoors' },
  'wynwood-walls': { name: 'Wynwood Walls', focus: 'murals and street art, outdoors' },
  'design-district': { name: 'Miami Design District', focus: 'luxury shopping, galleries, Michelin dining, indoor/outdoor' },
  brickell: { name: 'Brickell', focus: 'waterfront dining, rooftops and skyline' },
  'coconut-grove': { name: 'Coconut Grove', focus: 'leafy bayfront neighborhood and dining' },
  'little-havana': { name: 'Little Havana', focus: 'Cuban culture, Calle Ocho, live music' },
  'key-biscayne': { name: 'Key Biscayne', focus: 'calm beaches, lighthouse, skyline views, outdoors' },
  'bal-harbour': { name: 'Bal Harbour', focus: 'quiet luxury beach and Bal Harbour Shops' },
  'sunny-isles': { name: 'Sunny Isles Beach', focus: 'oceanfront towers, beach, Haulover Marina' },
  vizcaya: { name: 'Vizcaya Museum & Gardens', focus: 'historic bayfront villa and gardens, indoor/outdoor' },
  'biscayne-bay': { name: 'Biscayne Bay', focus: 'bay cruise and Millionaire’s Row views, outdoors' },
};

const guides = {
  'airport-south-beach': 'MIA airport to South Beach public bus (Route 150) only',
  'weather-scope': 'weather forecast outside the current KMIA observation',
  'miami-neighborhoods': 'comparing Miami neighborhoods',
  'miami-peak-season': 'busiest Miami event weeks and booking ahead',
  'miami-dining-tips': 'Michelin/restaurant reservation timing and dress code',
  'miami-nightlife-tips': 'club dress code, arrival timing and nightlife areas',
  'miami-weather-seasons': 'Miami dry vs wet season and outdoor/water timing',
  'miami-getting-around': 'MIA vs FLL airports, causeway traffic and valet',
};

const questions = Object.keys(conciergeCopy.en.questions).join(', ');
const advice = Object.fromEntries(Object.entries(adviceOptions).map(([id, value]) => [id, value.hint]));

export const STOP_IDS = Object.freeze(Object.keys(stops));
export const GUIDE_IDS = Object.freeze(Object.keys(guides));

// The model reads the conversation + Grounded facts and returns a lean v3
// JSON object with "reply" FIRST so SSE streaming reaches the guest within
// the opening tokens (~350ms TTFT). Legacy v1/v2 decoders remain supported
// in projectConversation / groundedReply for backward compatibility.
const COMPACT_STOPS = Object.keys(stops).join(', ');
export const CONVERSATION_PROTOCOL = [
  '\nReturn ONLY one valid JSON object with "reply" right after "version" (no prose outside JSON, no extra keys):',
  '{"version":3,"reply":"...","action":"consult","sections":["/restaurants-nightlife"],"followups":["...","..."]}',
  'Optional v3 keys: "stops":[...] (only for plan/ideas; valid IDs: ' + COMPACT_STOPS + '), "followups":[2-3 short next-step chips in guest language, <=64 chars each], "tripPatch":{"neighborhood":...,"guests":...,"maxDailyBudget":...,"occasion":...,"airport":...,"hasKids":...} (only when guest states/changes a preference), "handoffSummary":"1-line concise brief for live manager when handing off".',
  'Actions: consult, plan, ideas, recommend, guide (empty sections). Use v3 for comparisons, itineraries (Morning→Midday→Sunset→Evening by Miami cluster), budgets, Split-Pay, page questions, and forecasts (cite NOAA temp/rain/wind when given; note 7-day NOAA scope if further out).',
  'Reply rules: guest’s language, warm insider tone, 2-5 readable plain-text sentences or • bullets (NO **bold**, # headers, URLs, domains, /paths, emails, or phones); cite ONLY venues, dates, capacities & exact dollar prices from Grounded facts/budget math/guest text (never invent prices or claim booking/payment is confirmed); max 1 natural clarifying question.',
  'Consult has no options for a private jet: route private jets to {"version":1,"action":"recommend","sections":["/private-jets"]}, jet skis to "/experiences", airline tickets to "/travel". Use v1 handoff ONLY for explicit direct card-charge demands; unsupported (empty sections) for off-topic. Sections: 0-4 exact top-level IDs from Allowed section catalogue.',
].join('\n');

function hasKeys(value, keys) {
  return Object.keys(value).sort().join(',') === keys;
}

function knownId(value, catalogue) {
  return typeof value === 'string' && Object.hasOwn(catalogue, value);
}

function distinctIds(values, catalogue, limit) {
  return Array.isArray(values) && values.length >= 1 && values.length <= limit
    && values.every((id) => knownId(id, catalogue))
    && new Set(values).size === values.length;
}

function conversationResult(reply, locale, sections = [], extra = {}) {
  return { reply, navigation: navigationForSections(sections, { locale }), responsePolicy: CONVERSATION_POLICY, ...extra };
}

const GIVEN_GROUP = /(?:\p{N}+|one|two|three|four|five|six|seven|eight|nine|ten|dos|tres|cuatro|cinco|seis)\s+(?:guests?|people|passengers?|adults?|kids?|children|гост|пассажир|человек|взросл|personas?|pasajeros|adultos)|нас\s+(?:\p{N}+|двое|трое|четверо|пятеро|шестеро|семеро|восемь|девять|десять|два|три|четыре|пять|шесть|семь)/iu;
const GIVEN_DATES = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b|\b(?:tomorrow|tonight|today|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|mañana|lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b|завтра|сегодня|выходн|понедельник|вторник|среду|четверг|пятниц|суббот|воскресень|следующ\p{L}*\s+недел/iu;
const GIVEN_TIME_ON_WATER = /(?:\p{N}+|a few|a couple of|one|two|three|пару|несколько)\s+(?:hours?|час|horas?)/iu;
const GIVEN_NEIGHBORHOOD = /\b(?:south beach|sobe|miami beach|brickell|design district|wynwood|coconut grove|coral gables|sunny isles|bal harbour|little havana|key biscayne|downtown|edgewater|surfside)\b|саус\s*бич|майами\s*бич|брикелл|дизайн[\s-]*дистрикт|винвуд|коконат[\s-]*гроув|корал[\s-]*гейблс|санни[\s-]*айлс|бал[\s-]*харбор|литл[\s-]*гавана|ки[\s-]*бискейн|даунтаун/iu;
const GIVEN_VIBE = /\b(?:michelin|romantic|romance|date night|sunset|rooftop|waterfront|nightclub|club|nightlife|vip|casual|family|cheap|affordable|fine dining)\b|мишлен|романт|свидан|закат|крыш|руфтоп|ночн\p{L}*\s+клуб|клуб|вип|семейн|недорог/iu;
const GIVEN_SPORT_OR_ARTIST = /\b(?:nfl|mls|nba|nhl|mlb|ufc|f1|formula\s*1|nascar|football|soccer|basketball|hockey|baseball|tennis|boxing|golf|comedy|stand[\s-]?up|broadway|theater|theatre|opera|dolphins|heat|inter miami|panthers|marlins|miami open|ultra)\b|футбол|баскетбол|хоккей|бейсбол|теннис|бокс|стендап|комеди|театр|опер|формула\s*1|интер\s*майами|майами\s*хит/iu;
const GIVEN_CAR_STYLE = /\b(?:suv|convertible|cabrio(?:let)?|supercar|sports?\s*car|sedan|coupe|limousine|lamborghini|ferrari|porsche|bentley|rolls[\s-]*royce|mclaren|maybach|bugatti|mercedes|bmw|range rover|escalade|corvette|urus|hurac[aá]n|aventador|cullinan|g63|g[\s-]?class)\b|внедорожник|кабриолет|суперкар|спорткар|седан|ламборг|феррар|порш|бентли|роллс|макларен|майбах|мерседес|бмв|рендж|эскалейд|урус|уракан|авентадор|куллинан|гелендваген|гелик/iu;

export function missingQuestion(question, query, sessionText = '') {
  const tripScope = sessionText || query;
  switch (question) {
    case 'group': return !GIVEN_GROUP.test(tripScope) && !partySize(tripScope);
    case 'dates': return !GIVEN_DATES.test(tripScope) && !extractDateRange(tripScope);
    case 'luggage': return !GIVEN_GROUP.test(tripScope) && !partySize(tripScope) && !/suitcases?|bags|luggage|чемодан|багаж|maletas|equipaje/iu.test(tripScope);
    case 'time-on-water': return !GIVEN_TIME_ON_WATER.test(query);
    case 'neighborhood': return !GIVEN_NEIGHBORHOOD.test(tripScope);
    case 'vibe': return !GIVEN_VIBE.test(query);
    case 'sport-or-artist': return !GIVEN_SPORT_OR_ARTIST.test(query);
    case 'car-style': return !GIVEN_CAR_STYLE.test(query);
    default: return true;
  }
}

/** Project a validated model selection to localized concierge copy. */
export function projectConversation(value, locale, query = '', sessionText = '') {
  const code = normalizeLocale(locale);
  const copy = conciergeCopy[code];
  switch (value.action) {
    case 'ask':
      return hasKeys(value, 'action,choice,version') && knownId(value.choice, copy.questions)
        && missingQuestion(value.choice, query, sessionText)
        ? conversationResult(copy.questions[value.choice], code) : null;
    case 'guide':
      if (!hasKeys(value, 'action,choice,version') || !knownId(value.choice, guides)) return null;
      if (value.choice === 'weather-scope') return conversationResult(copy.weatherScope, code);
      // Miami-Dade Transit: miamidade.gov/global/transportation/mia-metrobus-service.page
      if (value.choice === 'airport-south-beach') return conversationResult(copy.airport, code);
      if (copy.guides && Object.hasOwn(copy.guides, value.choice)) return conversationResult(copy.guides[value.choice], code);
      return null;
    case 'consult': {
      if (!hasKeys(value, 'action,options,question,version') || !distinctIds(value.options, adviceOptions, 2)
        || (value.question !== null && !knownId(value.question, copy.questions))) return null;
      const sections = [...new Set(value.options.map((id) => adviceOptions[id].section))];
      if (sections.length > 1 && !sections.every((section) => section === '/travel' || section === '/vacation-rentals')) return null;
      if (value.question !== null && !sections.every((section) => adviceQuestions[section]?.includes(value.question))) return null;
      const options = value.options.filter((id) => carAdviceMatches(id, query));
      const paragraphs = options.map((id) => adviceCopy[code][id]);
      let question = value.question;
      if (!options.length && sections[0] === '/rentals' && missingQuestion('dates', query, sessionText)) question = 'dates';
      if (question !== null && missingQuestion(question, query, sessionText)) paragraphs.push(copy.questions[question]);
      if (!paragraphs.length) {
        const navigation = navigationForSections(sections, { locale: code });
        return { reply: answerForNavigation(navigation, [{ role: 'user', content: query }], code), navigation, responsePolicy: CONVERSATION_POLICY };
      }
      return conversationResult(paragraphs.join('\n\n'), code, sections);
    }
    case 'ideas': {
      if (!hasKeys(value, 'action,stops,version') || !distinctIds(value.stops, stops, 2)) return null;
      const [first, second] = value.stops.map((id) => stops[id].name);
      const suggestion = copy.ideas.replace('{first}', first);
      const alternative = second ? ' ' + copy.alternative.replace('{second}', second) : '';
      return conversationResult(suggestion + alternative, code, ['/experiences'], { stops: [...value.stops] });
    }
    case 'plan': {
      if (!hasKeys(value, 'action,days,version') || !Array.isArray(value.days) || !value.days.length
        || value.days.length > 3 || !value.days.every((day) => distinctIds(day, stops, 2))
        || new Set(value.days.flat()).size !== value.days.flat().length) return null;
      const number = new Intl.NumberFormat(code);
      const days = value.days.map((day, index) => copy.day.replace('{day}', number.format(index + 1))
        + ' — ' + day.map((id) => stops[id].name).join(' · '));
      return conversationResult([copy.itineraryIntro, days.join('\n'), copy.checkHours].join('\n\n'), code, ['/experiences'], { stops: value.days.flat() });
    }
    default: return null;
  }
}
