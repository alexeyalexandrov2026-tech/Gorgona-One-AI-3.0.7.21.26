import { matchActionCards, matchSuggestions } from '../aiSuggestions.js';

// Carry the last explicit topic only for a short date, party-size, budget,
// neighborhood, cuisine, vehicle-style or schedule follow-up. New explicit
// intent always wins; unrelated text does not.
export const followup = new RegExp([
  // Bare numbers, ISO dates, times, currency
  String.raw`^\s*\d{1,3}\s*$|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}:\d{2}\b|[$€£]`,
  // Core temporal, party-size & budget terms (16 languages)
  String.raw`tomorrow|today|tonight|weekend|next week|this week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|guests?|people|passengers?|how much|price|budget`,
  String.raw`завтра|сегодня|послезавтра|человек|гост|пассажир|сколько|стоим|цен|бюджет|на\s+.*\s*дн|в\s+(?:понедельник|среду|четверг|пятницу|субботу|воскресенье)|во\s+вторник|на\s+(?:выходн|следующ\p{L}*\s+недел|этой\s+недел)|выходн|вдво[её]м|втро[её]м|вчетвером|на\s+(?:двоих|троих|четверых|пятерых|шестерых|восьмерых)|для\s+(?:двоих|четверых|шестерых|восьми)`,
  String.raw`mañana|personas|sábado|domingo|viernes|próxima semana|demain|personnes|samedi|dimanche|morgen|gäste|samstag|sonntag|wochenende|domani|ospiti|sabato|domenica|amanhã|pessoas|jutro|osób|sobota|niedziela|yarın|kişi|cumartesi|pazar|מחר|אורחים|غد|أشخاص|فردا|نفر|明天|人数|明日|내일|명`,
  // Miami neighborhoods (en & ru)
  String.raw`\b(?:brickell|south beach|sobe|wynwood|design district|sunny isles|bal harbour|coral gables|coconut grove|little havana|key biscayne|edgewater|surfside|downtown)\b`,
  String.raw`брикелл|саус\s*бич|винвуд|уинвуд|дизайн[\s-]*дистрикт|санни[\s-]*айлс|бал[\s-]*харбор|корал[\s-]*гейблс|коконат[\s-]*гроув|литл[\s-]*гавана|ки[\s-]*бискейн|даунтаун`,
  // Dining cuisines, styles & tiers
  String.raw`\b(?:michelin|romantic|sunset|rooftop|italian|japanese|sushi|steak|seafood|cuban|asian|mediterranean|korean|cheap|affordable|luxury|vip|casual|family)\b`,
  String.raw`мишлен|романт|закат|крыш|итальянск|японск|суши|стейк|морепродукт|кубинск|азиатск|средиземномор|подешевле|недорог|люкс|премиум|семейн`,
  // Vehicle, yacht & event attributes
  String.raw`\b(?:convertible|cabrio(?:let)?|suv|sedan|sport|supercar|coupe|white|black|blue|red|silver|gr[ae]y|nfl|mls|nba|nhl|mlb|ufc|f1)\b`,
  String.raw`кабриолет|внедорожник|седан|суперкар|белы\p{L}*|белая|белую|ч[её]рн\p{L}*|син\p{L}*|красн\p{L}*|сер\p{L}*`
].join('|'), 'iu');

// Explicit Travel product wording (hotels, flights, trips). Bare weekend/place
// words ("на выходные", "this weekend") are weak Travel fallbacks and should
// inherit an active topic (e.g. "Хочу Ferrari" -> "на выходные").
const EXPLICIT_TRAVEL = /hotel|hôtel|resort|flight|airfare|airline|airport|travel|trip|vacation|holiday|getaway|itinerary|отел|гостиниц|авиабилет|перел[её]т|рейс|путешеств|поездк|отпуск|курорт|vuelo|viaje|voo|viagem|flug|reise|vol|voyage|volo|viaggio|lot|podróż|uçuş|seyahat|מלון|טיסה|טיול|فندق|طيران|سفر|هتل|پرواز|酒店|机票|航班|旅行|ホテル|航空券|フライト|호텔|항공권/iu;

export function conversationNavigation(messages, { locale = 'en', reply = '' } = {}) {
  const turns = messages.filter(m => m?.role === 'user' && typeof m.content === 'string');
  const latest = turns.at(-1)?.content || '';
  let query = latest;
  const direct = matchActionCards(query);
  const weakTravelOnly = direct.length === 1 && direct[0].href === '/travel' && !EXPLICIT_TRAVEL.test(query);
  if ((!direct.length || weakTravelOnly) && query.length <= 300 && followup.test(query)) {
    for (let i = turns.length - 2; i >= 0; i--) {
      if (matchActionCards(turns[i].content).length) {
        query = turns[i].content + ' ' + latest;
        break;
      }
    }
  }
  return {
    query,
    cards: matchActionCards(query, { locale, reply }),
    suggestions: matchSuggestions(query, { locale, reply })
  };
}
