// Guest-facing answer when the model is wrong, late, or absent.
// Prices and names come from the catalogue cards, never from this prose.
import {adviceCopy} from './conciergeAdvice.mjs';
import {conciergeCopy} from './conciergeCopy.mjs';
import {normalizeLocale, unavailableReply} from './locale.js';
import {getTranslation} from '../i18n.js';
import {conversationNavigation} from './conversation.mjs';
import {listingCards} from './listingCards.mjs';

const BOOKING = /(?:\b(?:book(?:ing)?|reserve|reservation|confirm(?:ation)?|charge|payment|pay|deposit|checkout)\b|заброн|оплат|брон(?:ь|ир)|оплати|احجز|ادفع|הזמנ|תשלום|预订|付款|予約|支払|예약|결제|buchen|bezahlen|réserver|reserver|payer|prenot|pagar|zarezerw|zapłać|zaplac|rezervasyon|\böde\b)/iu;

const JET = {
  en: 'For a private aircraft I’d open the charter desk and request a quote for the route. Tell me the cities and how many people are flying if you want that narrowed.',
  ru: 'Для частного самолёта я бы открыл чартерный стол и запросил расчёт по маршруту. Напишите города и сколько человек летит, если нужно сузить выбор.',
  es: 'Para un avión privado abriría la mesa de charter y pediría un presupuesto del trayecto. Dime las ciudades y cuántas personas vuelan si quieres acotarlo.',
  he: 'למטוס פרטי הייתי פונה לדלפק הצ׳ארטר ומבקש הצעת מחיר למסלול. כתבו את הערים וכמה אנשים טסים אם תרצו לצמצם.',
  zh: '私人飞机我会从包机台开始，按航线询价。如果想再缩小范围，告诉我城市和人数。',
  pt: 'Para um jato particular eu abriria o balcão de fretamento e pediria um orçamento da rota. Diga as cidades e quantas pessoas voam se quiser afunilar.',
  uk: 'Для приватного літака я б відкрив чартерний стіл і запитав розрахунок маршруту. Напишіть міста і скільки людей летить, якщо треба звузити вибір.',
  ja: 'プライベート機はチャーター窓口で路線の見積もりを取るところから始めます。絞り込みたい場合は都市と人数を教えてください。',
  ko: '전용기는 차터 데스크에서 노선 견적을 받는 것부터 시작합니다. 좁히고 싶으면 도시와 인원을 알려 주세요.',
  de: 'Für ein Privatflugzeug würde ich zuerst den Charter-Schalter öffnen und eine Offerte für die Strecke einholen. Nennen Sie Städte und Personenzahl, wenn ich eingrenzen soll.',
  ar: 'للطائرة الخاصة أبدأ بمكتب التشارتر وأطلب عرض سعر للمسار. اذكر المدن وعدد المسافرين إذا أردت تضييق الاختيار.',
  tr: 'Özel uçak için önce charter masasını açar, rota için teklif isterim. Daraltmamı isterseniz şehirleri ve kişi sayısını yazın.',
  fa: 'برای هواپیمای خصوصی اول میز چارتر را باز می‌کنم و برای مسیر قیمت می‌گیرم. اگر می‌خواهید محدودتر شود، شهرها و تعداد نفرات را بگویید.',
  it: 'Per un aereo privato partirei dal banco charter e chiederei un preventivo sulla rotta. Indica le città e quante persone volano se vuoi restringere.',
  fr: 'Pour un avion privé, j’ouvrirais le bureau charter et demanderais un devis pour la route. Indiquez les villes et le nombre de passagers si vous voulez affiner.',
  pl: 'Przy prywatnym samolocie zacząłbym od biura czarteru i wyceny trasy. Napisz miasta i liczbę osób, jeśli mam to zawęzić.'
};

export function explicitBooking(text) {
  return BOOKING.test(String(text || ''));
}

function latestUser(messages) {
  const turns = (Array.isArray(messages) ? messages : []).filter(message => message?.role === 'user' && typeof message.content === 'string');
  return turns.at(-1)?.content || '';
}

function consult(section, text, code) {
  const copy = adviceCopy[code] || adviceCopy.en;
  if (section === '/private-jets') return JET[code] || JET.en;
  if (section === '/yachts') {
    const option = /couple of hours|a few hours|пару час|כמה שעות|بضع ساعات|几小时|数時間/iu.test(text) ? 'bay-cruise' : 'longer-charter';
    return copy[option];
  }
  if (section === '/rentals') {
    const convertible = /convertible|cabriolet|cabrio|кабриолет|مكشوف|敞篷|オープン|컨버터블/iu.test(text) && !/suv|urus|урус|внедорожник/iu.test(text);
    return copy[convertible ? 'convertible' : 'family-suv'];
  }
  if (section === '/vacation-rentals') return copy.villa;
  if (section === '/travel') return copy.hotel;
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
  if (explicitBooking(user)) return guidance(code) + (lead ? ` ${lead}` : '');
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
  const listings = listingCards(navigation.query || latestUser(messages), { locale: code });
  const matched = navigation.cards.length > 0 || listings.length > 0;
  const reply = answerForNavigation(navigation, messages, code) || (matched ? getTranslation(code).ai?.conciergeIntro : unavailableReply(code));
  return { reply, navigation, listings, matched };
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
