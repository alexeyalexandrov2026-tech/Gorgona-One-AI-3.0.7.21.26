// Guest-facing answer when the model is wrong, late, or absent.
// Prices and names come from the catalogue cards, never from this prose.
import { adviceCopy, carAdviceMatches } from './conciergeAdvice.mjs';
import { conciergeCopy } from './conciergeCopy.mjs';
import { normalizeLocale, unavailableReply } from './locale.js';
import { getTranslation } from '../i18n.js';
import { conversationNavigation } from './conversation.mjs';
import { gatedListings, namedVenueCards } from './listingCards.mjs';
import { extractTripProfile } from './tripProfile.mjs';

// A booking, reservation or payment request in the supported languages. Card
// wording is matched only with an owner or payment word ("my card", "credit
// card", "с карты"), so a menu card or a map does not count as a payment.
const BOOKING = new RegExp([
  String.raw`\b(?:book(?:ing|ed|s)?|reserv(?:e|ed|es|ing|ations?)|confirm(?:ation)?|charge[ds]?|charging|payments?|pay(?:ing)?|deposit|checkout|purchase)\b`,
  String.raw`\b(?:my|the|credit|debit|bank)\s+card\b`,
  // Russian and Ukrainian: reserve, pay, debit a card.
  // Endings are explicit so "спишь" (sleep), "список" (list) and
  // "с картинами" (paintings) are not read as payments.
  String.raw`заброн|оплат|брон(?:ь|ир)|оплати|спиши(?![\p{L}])|спишите|спишіть|списа(?:ть|ти|л)|списыва|[сз]\s+(?:моей\s+|моєї\s+|этой\s+)?карт(?:ы|и|ки)(?![\p{L}])`,
  // Spanish and Portuguese: reserve, charge, card.
  String.raw`\breserv(?:ar|a|e|en|o|amos)\b|reservaci[oó]n|\bcobr(?:ar|a|e|en|o)\b|\btarjeta\b|cart[aã]o`,
  String.raw`احجز|ادفع|הזמנ|תשלום|预订|付款|予約|支払|예약|결제`,
  String.raw`buchen|bezahlen|belast|kreditkarte|réserver|reserver|payer|d[ée]bit|carte\s+(?:bancaire|de\s+cr[ée]dit)|\bma\s+carte\b|prenot|addebit|carta\s+di\s+credito|pagar|zarezerw|zapłać|zaplac|rezervasyon|\böde\b`,
].join('|'), 'iu');

const JET = {
  en: 'Enter your route and date to request a private charter quote from PrivateJetFinder.',
  ru: 'Укажите маршрут и дату в форме PrivateJetFinder, чтобы запросить стоимость частного перелёта.',
  es: 'Indica la ruta y la fecha en PrivateJetFinder para solicitar un presupuesto de vuelo privado.',
  he: 'הזינו מסלול ותאריך ב־PrivateJetFinder כדי לקבל הצעת מחיר לטיסה פרטית.',
  zh: '在 PrivateJetFinder 输入航线和日期，申请私人包机报价。',
  pt: 'Indique a rota e a data no PrivateJetFinder para pedir um orçamento de voo particular.',
  uk: 'Вкажіть маршрут і дату у формі PrivateJetFinder, щоб отримати розрахунок приватного перельоту.',
  ja: 'PrivateJetFinderで区間と日付を入力し、チャーターの見積もりを依頼できます。',
  ko: 'PrivateJetFinder에서 노선과 날짜를 입력해 전용기 견적을 요청하세요.',
  de: 'Geben Sie Route und Datum bei PrivateJetFinder ein, um ein Charterangebot anzufragen.',
  ar: 'أدخل المسار والتاريخ في PrivateJetFinder لطلب عرض سعر لرحلة خاصة.',
  tr: 'Özel uçuş teklifi almak için PrivateJetFinder’a rota ve tarihi girin.',
  fa: 'برای دریافت قیمت پرواز خصوصی، مسیر و تاریخ را در PrivateJetFinder وارد کنید.',
  it: 'Indica tratta e data su PrivateJetFinder per richiedere un preventivo per il volo privato.',
  fr: 'Indiquez le trajet et la date sur PrivateJetFinder pour demander un devis de vol privé.',
  pl: 'Podaj trasę i datę w PrivateJetFinder, aby poprosić o wycenę lotu prywatnego.'
};

// Hotel/stay & flight wording in the supported languages.
const STAY = /hotel|hôtel|motel|resort|\bstay\b|accommodation|lodging|отел|готел|гостиниц|проживан|жиль|alojamiento|hospedaje|hospedagem|pousada|unterkunft|übernachtung|albergo|alloggio|hébergement|nocleg|otel|konaklama|מלון|فندق|هتل|酒店|飯店|宾馆|ホテル|宿泊|호텔|숙소/iu;
const FLIGHT = /\b(?:flights?|airfare|airlines?|ovago)\b|авиабилет|перел[её]т|рейс|vuelos?|voos?|fl[üu]ge?|vols?|voli|loty|uçuş|טיסות|طيران|پرواز|机票|航班|航空券|フライト|항공권/iu;

// Dining, events, and experience fallback detectors.
const DINING_MICHELIN = /michelin|мишлен|мішлен|מישלן|ميشلان|میشلن|米其林|ミシュラン|미슐랭/iu;
const DINING_NIGHTLIFE = /nightclub|night\s*club|nightlife|bottle\s*service|guest\s*list|ночн\p{L}*\s+клуб|\bclub\b|клуб|discoteca|boîte|נادي ليلي|מועדון|夜店|クラブ|클럽/iu;
const DINING_SUNSET = /sunset|rooftop|waterfront|закат|крыш|руфтоп|atardecer|azotea|日落|サンセット|선셋/iu;
const DINING_ROMANTIC = /romantic|romance|\bdate\b|романт|свидан|rom[aá]ntic|cita|רומנטי|رومانسي|浪漫|ロマンチック|로맨틱/iu;
const DINING_CASUAL = /casual|cheap|budget|affordable|local|недорог|деш[её]в|бюджет|подешевле|barat|econ[oó]mic/iu;

const EVENT_SPORTS = /\b(?:nfl|mls|nba|nhl|mlb|ufc|f1|formula\s*1|nascar|football|soccer|basketball|hockey|baseball|tennis|boxing|golf|sport(?:s|ing)?|match|stadium|dolphins|heat|inter\s*miami|panthers|marlins|miami\s*open)\b|футбол|баскетбол|хоккей|бейсбол|теннис|бокс|спорт|матч|стадион|формула\s*1|интер\s*майами|майами\s*хит|fútbol|futebol|fußball|calcio|piłka\s*nożna|כדורגל|كرة\s*القدم|فوتبال|足球|サッカー|축구/iu;
const EVENT_CONCERT = /concert|festival|comedy|stand[\s-]?up|theater|theatre|broadway|opera|live\s*music|shows?|концерт|фестивал|стендап|комеди|театр|опер|шоу|concierto|konzert|spectacle|concerto|koncert|הופעה|حفل|کنسرت|演唱会|コンサート|콘서트/iu;

const EXP_HELI = /helicopter|aerial|вертол[её]т|helicóptero|hélicoptère|hubschrauber|elicottero|helikopter|מסוק|هليكوبتر|هلیکوپتر|直升机|ヘリコプター|헬리콥터/iu;
const EXP_EVERGLADES = /everglades|airboat|alligator|эверглейдс|еверглейдс|аэролодк|أوורגליידס|אוורגליידס|إيفرغليدز|大沼泽地|エバーグレーズ|에버글레이즈/iu;
const EXP_PARKS = /theme\s*park|amusement\s*park|water\s*park|roller\s*coaster|universal|disney|magic\s*kingdom|epcot|seaworld|busch\s*gardens|legoland|orlando|tampa|парк\s*аттракционов|аквапарк|американские\s*горки|дисней|юниверсал|орландо|тампа/iu;
const EXP_WATER = /boat\s*tour|sightseeing\s*cruise|speedboat|jet[\s-]*ski|jetski|kayak|paddleboard|biscayne|\bsup\b|гидроцикл|каяк|катер|круиз|бискейн/iu;

// Informational policy, discovery, or Split-Pay questions about deposits,
// payment rules, or "where/which/can I book" should be answered normally by
// ELIO instead of triggering a hard booking handoff, unless the guest
// explicitly asks to charge their card or pay/book right now.
const POLICY_QUESTION = /(?:\b(?:how\s+(?:much|does|do|far\s+in\s+advance|early)|what(?:'s|\s+is|\s+are)|where\s+(?:can|should|do)\s+(?:i|we)|which\s+\w+\s+(?:should|can)\s+(?:i|we)|can\s+(?:i|we)\s+(?:split|pay\s+with|use\s+split)|is\s+there|do\s+(?:i|you|they)\s+(?:need|require|take|accept)|policy|rules?|terms?|split[\s-]?pay)\b.{0,50}\b(?:deposit|booking|book|reservation|reserve|payment|pay|split)\b|\b(?:deposit|booking|payment)\s+(?:policy|requirement|rules?|terms?|amount|work)\b|\bsplit[\s-]?pay\b|(?:какой|какая|какие|нужен\s+ли|сколько|где(?:\s+лучше)?|можно\s+ли|как\s+(?:происходит|работает|устроен\p{L}*|лучше)|условия)\s+(?:\p{L}+\s+){0,3}(?:депозит|бронирован|забронир|оплат|раздел\p{L}*\s+оплат))/iu;
const DIRECT_BOOK_OR_CHARGE = new RegExp([
  String.raw`\b(?:book\s+(?:me|us|it|this|that|a|the)|reserve\s+(?:me|us|it|this|that|a|the)|charge[ds]?\s+(?:my|the|this)?\s*card|pay\s+now|take\s+payment|checkout\s+now|my\s+card|credit\s+card|debit\s+card)\b`,
  String.raw`забронируй|оплати(?![\p{L}])|спиши(?![\p{L}])|спишите|спишіть|списа(?:ть|ти)|[сз]\s+(?:моей\s+|моєї\s+|этой\s+)?карт(?:ы|и|ки)(?![\p{L}])`,
  String.raw`\breserv(?:ar|a)\s+(?:un|una|el|la|me)\b|\bcobr(?:ar|a)\s+(?:mi|la)\s+tarjeta\b`
].join('|'), 'iu');
const CARD_CHARGE_DEMAND = /\b(?:charge[ds]?\s+(?:my|the|this)?\s*card|pay\s+now|take\s+payment|checkout\s+now|my\s+card|credit\s+card|debit\s+card)\b|спиши(?![\p{L}])|спишите|спишіть|списа(?:ть|ти)|[сз]\s+(?:моей\s+|моєї\s+|этой\s+)?карт(?:ы|и|ки)(?![\p{L}])|\bcobr(?:ar|a)\s+(?:mi|la)\s+tarjeta\b/iu;

export function explicitBooking(text) {
  const input = String(text || '');
  if (!BOOKING.test(input)) return false;
  if (POLICY_QUESTION.test(input) && !CARD_CHARGE_DEMAND.test(input)) {
    // Keep explicit imperative commands ("Book a table at Komodo") as handoff,
    // while letting genuine "where/which/how/can we split-pay" questions through.
    if (!DIRECT_BOOK_OR_CHARGE.test(input) || /\bsplit[\s-]?pay\b|раздел\p{L}*\s+оплат|\bwhere\s+(?:can|should)\s+(?:i|we)\s+book\b|\bwhich\b.*\bbook\b/iu.test(input)) {
      return false;
    }
  }
  return true;
}

function latestUser(messages) {
  const turns = (Array.isArray(messages) ? messages : []).filter(message => message?.role === 'user' && typeof message.content === 'string');
  return turns.at(-1)?.content || '';
}

function consult(section, text, code) {
  const copy = adviceCopy[code] || adviceCopy.en;
  if (section === '/yachts') {
    const option = /couple of hours|a few hours|пару час|כמה שעות|بضع ساعات|几小时|数時間/iu.test(text) ? 'bay-cruise' : 'longer-charter';
    return copy[option];
  }
  if (section === '/rentals') {
    const option = ['convertible', 'family-suv', 'supercar', 'luxury-sedan'].find(id => carAdviceMatches(id, text));
    return option ? copy[option] : '';
  }
  if (section === '/vacation-rentals') return copy.villa;
  // Travel covers flights as well as hotels: the hotel line only fits a stay request.
  if (section === '/travel') {
    if (STAY.test(text)) return copy.hotel;
    if (FLIGHT.test(text)) return copy.flights;
    return '';
  }
  if (section === '/restaurants-nightlife') {
    if (DINING_MICHELIN.test(text)) return copy['michelin-dining'];
    if (DINING_NIGHTLIFE.test(text)) return copy['nightlife-vip'];
    if (DINING_SUNSET.test(text)) return copy['sunset-dining'];
    if (DINING_ROMANTIC.test(text)) return copy['romantic-dinner'];
    if (DINING_CASUAL.test(text)) return copy['casual-local'];
    return '';
  }
  if (section === '/events') {
    if (EVENT_SPORTS.test(text)) return copy['sports-game'];
    if (EVENT_CONCERT.test(text)) return copy['concert-show'];
    return '';
  }
  if (section === '/experiences') {
    if (EXP_HELI.test(text)) return copy['helicopter-tour'];
    if (EXP_EVERGLADES.test(text)) return copy['everglades-tour'];
    if (EXP_PARKS.test(text)) return copy['florida-parks'];
    if (EXP_WATER.test(text)) return copy['water-adventure'];
    return '';
  }
  return '';
}

/** Sentence for a navigation set the server already chose. */
export function answerForNavigation(navigation, messages, locale = 'en') {
  const code = normalizeLocale(locale);
  const user = latestUser(messages);
  const contextText = navigation?.query || user;
  const cards = navigation?.cards || [];
  const t = getTranslation(code);
  const names = cards.map(card => card.title).filter(Boolean);
  const lead = names.length ? `${t.ai?.results || 'Results'}: ${names.join(' · ')}.` : '';
  // A booking or payment request always leads with the disclaimer, even for
  // the private-jet quote form.
  if (explicitBooking(user)) return bookingAnswer(navigation, code);
  if (cards.length === 1 && cards[0].href === '/private-jets') return JET[code] || JET.en;
  if (cards.length >= 2) {
    const lines = [...new Set(cards.map(card => consult(card?.href, contextText, code)).filter(Boolean))];
    return [...lines, conciergeCopy[code]?.itineraryIntro || conciergeCopy.en.itineraryIntro, lead].filter(Boolean).join('\n\n');
  }
  const line = consult(cards[0]?.href, contextText, code);
  return [line, lead].filter(Boolean).join('\n\n') || (cards.length ? lead : '') || t.ai?.conciergeIntro || '';
}

/**
 * Deterministic answer for a turn. Always returns navigation the guest can tap.
 * @returns {{reply:string,navigation:{cards:object[],suggestions:object[]},listings:object[],matched:boolean}}
 */
export function catalogueAnswer(messages, locale = 'en') {
  const code = normalizeLocale(locale);
  const navigation = conversationNavigation(messages, { locale: code });
  // A booking or payment request is a handoff: no catalogue rows that could
  // read as something this chat is about to reserve, except the restaurants
  // or clubs the guest named, each with the venue's own booking page.
  const handoff = explicitBooking(latestUser(messages));
  // The same gate as the model path: rows only for a recommendation, and only
  // inside the sections this answer shows.
  const action = handoff ? 'handoff' : navigation.cards.length ? 'recommend' : 'unsupported';
  const sections = navigation.cards.map(card => card.href);
  const profile = extractTripProfile(messages);
  const listings = handoff ? namedVenueCards(latestUser(messages), { locale: code, profile })
    : gatedListings(navigation.query || latestUser(messages), { locale: code, action, sections, profile });
  const matched = navigation.cards.length > 0 || listings.length > 0;
  const reply = answerForNavigation(navigation, messages, code) || (matched ? getTranslation(code).ai?.conciergeIntro : unavailableReply(code));
  return { reply, navigation, listings, matched, handoff, action };
}

/** The localized "this chat does not create or confirm reservations" line. */
export function bookingDisclaimer(locale = 'en') {
  return guidance(normalizeLocale(locale));
}

/**
 * Handoff answer for a booking or payment request: the disclaimer first, then
 * the sections the guest can continue in (or the private-jet quote form).
 */
export function bookingAnswer(navigation, locale = 'en') {
  const code = normalizeLocale(locale);
  const cards = navigation?.cards || [];
  const t = getTranslation(code);
  const names = cards.map(card => card.title).filter(Boolean);
  const jet = cards.length === 1 && cards[0].href === '/private-jets';
  const next = jet ? (JET[code] || JET.en) : names.length ? `${t.ai?.results || 'Results'}: ${names.join(' · ')}.` : '';
  return guidance(code) + (next ? ` ${next}` : '');
}

function guidance(code) {
  const lines = {
    en: 'Check current terms and availability through the selected channel; this chat does not create or confirm reservations.',
    ru: 'Условия и наличие уточняются через выбранный канал; этот чат не создаёт и не подтверждает бронирования.',
    es: 'Consulta las condiciones y la disponibilidad en el canal elegido; este chat no crea ni confirma reservas.',
    he: 'יש לבדוק תנאים וזמינות בערוץ הנבחר; הצ׳אט הזה אינו יוצר או מאשר הזמנות.',
    zh: '请在所选渠道核实当前条件和可用情况；此聊天不会创建或确认预订。',
    pt: 'Consulte as condições e a disponibilidade no canal escolhido; este chat não cria nem confirma reservas.',
    uk: 'Умови та наявність уточнюються через обраний канал; цей чат не створює та не підтверджує бронювання.',
    ja: '最新の条件や空き状況は選択した窓口でご確認ください。このチャットでは予約の作成や確定は行いません。',
    ko: '최신 조건과 이용 가능 여부는 선택한 채널에서 확인해 주세요. 이 채팅에서는 예약을 생성하거나 확정하지 않습니다.',
    de: 'Prüfen Sie Bedingungen und Verfügbarkeit beim gewählten Anbieter; dieser Chat erstellt oder bestätigt keine Reservierungen.',
    ar: 'تحقق من الشروط والتوافر عبر القناة المختارة؛ هذه المحادثة لا تنشئ الحجوزات ولا تؤكدها.',
    tr: 'Güncel koşulları ve uygunluğu seçtiğiniz kanaldan kontrol edin; bu sohbet rezervasyon oluşturmaz veya onaylamaz.',
    fa: 'شرایط و موجودی را از کانال انتخاب‌شده بررسی کنید؛ این گفتگو رزرو ایجاد یا تأیید نمی‌کند.',
    it: 'Verifica condizioni e disponibilità tramite il canale scelto; questa chat non crea né conferma prenotazioni.',
    fr: 'Vérifiez les conditions et disponibilités auprès du canal choisi ; ce chat ne crée ni ne confirme de réservation.',
    pl: 'Aktualne warunki i dostępność sprawdzisz w wybranym kanale; ten czat nie tworzy ani nie potwierdza rezerwacji.'
  };
  return lines[code] || lines.en;
}
