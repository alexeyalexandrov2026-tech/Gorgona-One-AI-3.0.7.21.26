// Guest-facing answer when the model is wrong, late, or absent.
// Prices and names come from the catalogue cards, never from this prose.
import {adviceCopy,carAdviceMatches} from './conciergeAdvice.mjs';
import {conciergeCopy} from './conciergeCopy.mjs';
import {normalizeLocale, unavailableReply} from './locale.js';
import {getTranslation} from '../i18n.js';
import {conversationNavigation} from './conversation.mjs';
import {gatedListings,namedVenueCards} from './listingCards.mjs';

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

// Hotel or stay wording in the supported languages.
const STAY = /hotel|hôtel|motel|resort|\bstay\b|accommodation|lodging|отел|готел|гостиниц|проживан|жиль|alojamiento|hospedaje|hospedagem|pousada|unterkunft|übernachtung|albergo|alloggio|hébergement|nocleg|otel|konaklama|מלון|فندق|هتل|酒店|飯店|宾馆|ホテル|宿泊|호텔|숙소/iu;

export function explicitBooking(text) {
  return BOOKING.test(String(text || ''));
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
    const option = ['convertible', 'family-suv'].find(id => carAdviceMatches(id, text));
    return option ? copy[option] : '';
  }
  if (section === '/vacation-rentals') return copy.villa;
  // Travel covers flights as well as hotels: the hotel line only fits a stay request.
  if (section === '/travel') return STAY.test(text) ? copy.hotel : '';
  return '';
}

/** Sentence for a navigation set the server already chose. */
export function answerForNavigation(navigation, messages, locale = 'en') {
  const code = normalizeLocale(locale);
  const user = latestUser(messages);
  const cards = navigation?.cards || [];
  const t = getTranslation(code);
  const names = cards.map(card => card.title).filter(Boolean);
  const lead = names.length ? `${t.ai?.results || 'Results'}: ${names.join(' · ')}.` : '';
  // A booking or payment request always leads with the disclaimer, even for
  // the private-jet quote form.
  if (explicitBooking(user)) return bookingAnswer(navigation, code);
  if (cards.length === 1 && cards[0].href === '/private-jets') return JET[code] || JET.en;
  if (cards.length >= 2) return [conciergeCopy[code]?.itineraryIntro || conciergeCopy.en.itineraryIntro, lead].filter(Boolean).join('\n\n');
  const line = consult(cards[0]?.href, user, code);
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
  const listings = handoff ? namedVenueCards(latestUser(messages), { locale: code })
    : gatedListings(navigation.query || latestUser(messages), { locale: code, action, sections });
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
