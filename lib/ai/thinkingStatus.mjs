// ===========================================================================
// 16-language context-aware progressive thinking status for AiConversation.jsx.
//
// Gives VIP guests immediate, truthful visibility into what the concierge is
// checking (live TicketNetwork events, NOAA Miami forecast, yachts, fleet,
// dining, or multi-step VIP itinerary) while Workers AI composes the answer.
// ===========================================================================

import { normalizeLocale } from './locale.js';

const COPY = Object.freeze({
  en: {
    events: 'Checking live Miami tickets on TicketNetwork…',
    weather: 'Checking official Miami NOAA forecast…',
    yachts: 'Matching verified Miami yachts & charters…',
    cars: 'Checking Miami fleet by seats & budget…',
    dining: 'Curating Miami dining & booking channels…',
    plan: 'Composing your Miami VIP itinerary & timing…',
    default: 'Curating personal Miami recommendations…',
    compose: 'Preparing your personal answer & partner options…'
  },
  ru: {
    events: 'Проверяю живые билеты в Майами на TicketNetwork…',
    weather: 'Сверяю официальный прогноз NOAA для Майами…',
    yachts: 'Подбираю проверенные яхты и чартеры в Майами…',
    cars: 'Подбираю авто из каталога по местам и бюджету…',
    dining: 'Подбираю рестораны и проверяю каналы бронирования…',
    plan: 'Составляю VIP-маршрут с учётом логистики Майами…',
    default: 'Подбираю персональные рекомендации по Майами…',
    compose: 'Формирую ответ и партнёрские предложения…'
  },
  es: {
    events: 'Consultando entradas en vivo en TicketNetwork…',
    weather: 'Consultando el pronóstico oficial NOAA de Miami…',
    yachts: 'Buscando yates y chárters verificados en Miami…',
    cars: 'Comparando autos por plazas y presupuesto…',
    dining: 'Seleccionando restaurantes y reservas en Miami…',
    plan: 'Diseñando tu itinerario VIP en Miami…',
    default: 'Preparando recomendaciones personales en Miami…',
    compose: 'Redactando tu respuesta y opciones de reserva…'
  },
  uk: {
    events: 'Перевіряю живі квитки в Маямі на TicketNetwork…',
    weather: 'Звіряю офіційний прогноз NOAA для Маямі…',
    yachts: 'Підбираю перевірені яхти та чартери в Маямі…',
    cars: 'Підбираю авто з каталогу за місцями та бюджетом…',
    dining: 'Підбираю ресторани та канали бронювання…',
    plan: 'Складаю VIP-маршрут з урахуванням логістики Маямі…',
    default: 'Підбираю персональні рекомендації по Маямі…',
    compose: 'Формую відповідь і партнерські пропозиції…'
  },
  fr: {
    events: 'Vérification des billets en direct sur TicketNetwork…',
    weather: 'Vérification des prévisions officielles NOAA à Miami…',
    yachts: 'Sélection de yachts et charters vérifiés à Miami…',
    cars: 'Recherche de véhicules selon places et budget…',
    dining: 'Sélection de restaurants et réservations à Miami…',
    plan: 'Préparation de votre itinéraire VIP à Miami…',
    default: 'Préparation de vos recommandations à Miami…',
    compose: 'Rédaction de votre réponse personnalisée…'
  },
  de: {
    events: 'Prüfe Live-Tickets für Miami auf TicketNetwork…',
    weather: 'Prüfe offiziellen NOAA-Wetterbericht für Miami…',
    yachts: 'Suche geprüfte Yachten & Charter in Miami…',
    cars: 'Filtere Fahrzeuge nach Plätzen & Budget…',
    dining: 'Wähle Restaurants & Buchungskanäle in Miami…',
    plan: 'Erstelle Ihren VIP-Tagesplan für Miami…',
    default: 'Stelle persönliche Miami-Empfehlungen zusammen…',
    compose: 'Formuliere Ihre persönliche Antwort & Optionen…'
  },
  it: {
    events: 'Controllo i biglietti live su TicketNetwork…',
    weather: 'Controllo le previsioni ufficiali NOAA per Miami…',
    yachts: 'Seleziono yacht e charter verificati a Miami…',
    cars: 'Confronto auto per posti e budget…',
    dining: 'Seleziono ristoranti e canali di prenotazione…',
    plan: 'Creo il tuo itinerario VIP a Miami…',
    default: 'Preparo consigli su misura per Miami…',
    compose: 'Preparo la risposta e le proposte partner…'
  },
  pt: {
    events: 'Verificando ingressos ao vivo na TicketNetwork…',
    weather: 'Verificando previsão oficial NOAA para Miami…',
    yachts: 'Selecionando iates e charters verificados…',
    cars: 'Filtrando carros por lugares e orçamento…',
    dining: 'Selecionando restaurantes e reservas em Miami…',
    plan: 'Montando seu roteiro VIP em Miami…',
    default: 'Preparando recomendações pessoais em Miami…',
    compose: 'Finalizando sua resposta e opções parceiras…'
  },
  pl: {
    events: 'Sprawdzam bilety na żywo w TicketNetwork…',
    weather: 'Sprawdzam oficjalną prognozę NOAA dla Miami…',
    yachts: 'Dobieram sprawdzone jachty i czartery w Miami…',
    cars: 'Dobieram auta według miejsc i budżetu…',
    dining: 'Wybieram restauracje i kanały rezerwacji…',
    plan: 'Układam plan VIP z logistyką w Miami…',
    default: 'Przygotowuję osobiste rekomendacje dla Miami…',
    compose: 'Przygotowuję odpowiedź i oferty partnerów…'
  },
  tr: {
    events: 'TicketNetwork üzerinden canlı Miami biletleri kontrol ediliyor…',
    weather: 'Resmi Miami NOAA hava tahmini kontrol ediliyor…',
    yachts: 'Onaylı Miami yatları ve turları eşleştiriliyor…',
    cars: 'Koltuk ve bütçeye göre araçlar filtreleniyor…',
    dining: 'Miami restoranları ve rezervasyon kanalları seçiliyor…',
    plan: 'Miami VIP programınız hazırlanıyor…',
    default: 'Size özel Miami önerileri hazırlanıyor…',
    compose: 'Kişisel yanıtınız ve partner seçenekleri hazırlanıyor…'
  },
  he: {
    events: 'בודק כרטיסים חיים במיאמי ב-TicketNetwork…',
    weather: 'בודק תחזית NOAA רשמית למיאמי…',
    yachts: 'מתאים יאכטות והפלגות מאומתות במיאמי…',
    cars: 'מסנן רכבים לפי מושבים ותקציב…',
    dining: 'בוחר מסעדות וערוצי הזמנה במיאמי…',
    plan: 'בונה מסלול VIP אישי במיאמי…',
    default: 'מכין המלצות אישיות למיאמי…',
    compose: 'מנסח את התשובה והצעות השותפים…'
  },
  ar: {
    events: 'جاري التحقق من التذاكر المباشرة على TicketNetwork…',
    weather: 'جاري التحقق من توقعات NOAA الرسمية لميامي…',
    yachts: 'جاري مطابقة اليخوت المعتمدة في ميامي…',
    cars: 'جاري تصفية السيارات حسب المقاعد والميزانية…',
    dining: 'جاري اختيار المطاعم وقنوات الحجز…',
    plan: 'جاري إعداد برنامج VIP مخصص لميامي…',
    default: 'جاري إعداد توصيات شخصية لميامي…',
    compose: 'جاري صياغة ردك وعروض الشركاء…'
  },
  fa: {
    events: 'در حال بررسی بلیت‌های زنده در TicketNetwork…',
    weather: 'در حال بررسی پیش‌بینی رسمی NOAA میامی…',
    yachts: 'در حال یافتن قایق‌های تفریحی معتبر میامی…',
    cars: 'در حال فیلتر خودروها بر اساس ظرفیت و بودجه…',
    dining: 'در حال انتخاب رستوران‌ها و رزرو میامی…',
    plan: 'در حال چیدمان برنامه VIP میامی…',
    default: 'در حال آماده‌سازی پیشنهادهای اختصاصی میامی…',
    compose: 'در حال نهایی‌سازی پاسخ و پیشنهادهای همکاران…'
  },
  zh: {
    events: '正在查询 TicketNetwork 迈阿密实时演出与赛事门票…',
    weather: '正在查询迈阿密 NOAA 官方天气预报…',
    yachts: '正在为您匹配迈阿密严选游艇与包船…',
    cars: '正在按座位数与预算筛选迈阿密豪车…',
    dining: '正在为您甄选迈阿密餐厅与预订渠道…',
    plan: '正在为您规划迈阿密 VIP 行程与路线…',
    default: '正在为您定制迈阿密专属建议…',
    compose: '正在整理专属回复与合作方预订卡片…'
  },
  ja: {
    events: 'TicketNetworkでマイアミの最新チケットを確認中…',
    weather: 'マイアミのNOAA公式天気予報を確認中…',
    yachts: 'マイアミの厳選ヨット・チャーターを検索中…',
    cars: '人数とご予算に合う車両を検索中…',
    dining: 'マイアミのレストランと予約窓口を選定中…',
    plan: 'マイアミのVIP旅程と移動時間を設計中…',
    default: 'マイアミのパーソナル提案を準備中…',
    compose: 'ご回答とパートナー予約候補をまとめています…'
  },
  ko: {
    events: 'TicketNetwork에서 마이애미 실시간 티켓을 확인 중…',
    weather: '마이애미 공식 NOAA 일기예보를 확인 중…',
    yachts: '마이애미 검증 요트 및 차터를 매칭 중…',
    cars: '좌석과 예산에 맞는 차량을 찾는 중…',
    dining: '마이애미 레스토랑과 예약 채널을 선별 중…',
    plan: '마이애미 VIP 일정과 동선을 구성 중…',
    default: '마이애미 맞춤 추천을 준비 중…',
    compose: '맞춤 답변과 파트너 예약 옵션을 정리 중…'
  }
});

const WEATHER_RE = /(?<![\p{L}\p{N}])(?:weather|forecast|rain(?:ing)?|storm|wind|погод\p{L}*|прогноз\p{L}*|дожд\p{L}*|clima|wetter|météo|pogod\p{L}*|hava|מזג|طقس|هوا)(?![\p{L}\p{N}])|天气|天気|날씨/iu;
const PLAN_RE = /(?<![\p{L}\p{N}])(?:itinerary|plan\s+(?:a|my|our|\d)|2\s*days?|3\s*days?|маршрут\p{L}*|спланир\p{L}*|собери|за\s+\d\s+дн\p{L}*|itinerario|tagesplan|itinéraire)(?![\p{L}\p{N}])/iu;

export function detectThinkingTopic(message = '', cards = []) {
  const text = String(message || '');
  const hrefs = Array.isArray(cards) ? cards.map((c) => c?.href).filter(Boolean) : [];
  if (hrefs.length >= 2 || PLAN_RE.test(text)) return 'plan';
  if (hrefs.includes('/events')) return 'events';
  if (WEATHER_RE.test(text)) return 'weather';
  if (hrefs.includes('/yachts')) return 'yachts';
  if (hrefs.includes('/rentals')) return 'cars';
  if (hrefs.includes('/restaurants-nightlife')) return 'dining';
  return 'default';
}

/** Return localized progressive status line for the active concierge request. */
export function thinkingStatusForTurn({ message = '', cards = [], locale = 'en', stage = 0 } = {}) {
  const code = normalizeLocale(locale);
  const copy = COPY[code] || COPY.en;
  if (stage >= 1) return copy.compose;
  const topic = detectThinkingTopic(message, cards);
  return copy[topic] || copy.default;
}
