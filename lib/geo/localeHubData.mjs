// ===========================================================================
// Indexable multilingual landing hub data (/ru and /es) for AI Search / GEO.
// Pure data module so i18n:check stays 100% green and zero existing pages change.
// ===========================================================================

import { SITE_URL } from '../seo.mjs';

export const HUB_HREFLANG = Object.freeze({
  en: `${SITE_URL}/`,
  ru: `${SITE_URL}/ru`,
  es: `${SITE_URL}/es`,
  'x-default': `${SITE_URL}/`
});

export const LOCALE_HUBS = Object.freeze({
  ru: {
    lang: 'ru',
    ogLocale: 'ru_RU',
    path: '/ru',
    metaTitle: 'Аренда яхт, люксовых авто, вилл и джетов в Майами на русском | Miami Elio',
    metaDescription: 'Miami Elio — аренда экзотических авто (290+ машин), яхт с капитаном, вилл, частных джетов и 74+ ресторанов в Майами на русском языке. ELIO+ Guide 24/7 и живая команда.',
    eyebrow: 'MIAMI ELIO · МАЙАМИ НА РУССКОМ · 16 ЯЗЫКОВ',
    heroTitle: 'Яхты, суперкары, виллы и рестораны в Майами — на русском языке.',
    heroLede: 'Единая платформа в Майами: 290+ люксовых авто, чартер яхт с капитаном, виллы у воды, частные джеты, 74+ проверенных ресторана, билеты на спорт и концерты. Персональное сопровождение живой команды Miami Elio и 16-язычный ИИ-гид ELIO+ 24/7.',
    heroImage: '/images/home/hero-tower.webp',
    heroAlt: 'Панорама Майами-Бич и залива Бискейн — Miami Elio',
    primaryCta: { label: 'Открыть ELIO+ Guide', href: '/discovery' },
    telegramCta: { label: 'Написать в Telegram @MIAMI_ELIO', href: 'https://t.me/MIAMI_ELIO' },
    whatsappCta: { label: 'WhatsApp 24/7', href: 'https://wa.me/message/VO7GCPZCDKRZO1' },
    stats: [
      ['Автопарк в Майами', '290+ авто'],
      ['Рестораны и клубы', '74+ проверенных'],
      ['Языки платформы', '16 языков'],
      ['Поддержка команды', '24/7 Telegram и WhatsApp']
    ],
    worldsTitle: 'Восемь направлений Майами в одном аккаунте',
    worldsSub: 'Подбирайте отдельные услуги или собирайте полную поездку под ключ с подачей авто к трапу или вилле.',
    worlds: [
      { title: 'Аренда люксовых авто', meta: 'От $250/день · 290+ машин', desc: 'Lamborghini Urus, Rolls-Royce Cullinan, Ferrari, Mercedes-AMG G63, Porsche 911. Подача в MIA, FLL, OPF, Майами-Бич, Бриккелл и Санни-Айлс.', href: '/rentals', cta: 'Смотреть автопарк' },
      { title: 'Аренда яхт с капитаном', meta: '4ч и 8ч · Залив Бискейн', desc: 'Частные яхты от 34 до 110+ футов по прямым тарифам YATR и проверенных операторов: Star Island, Haulover и Nixon Sandbar.', href: '/yachts', cta: 'Выбрать яхту' },
      { title: 'Виллы и апартаменты', meta: 'Майами-Бич, Бриккелл, Санни-Айлс', desc: 'Виллы у воды с бассейном, пентхаусы и отели 5★ под ваши даты и состав гостей с координацией заселения.', href: '/vacation-rentals', cta: 'Смотреть виллы' },
      { title: 'Частные джеты', meta: 'OPF · MIA · FXE', desc: 'Перелёты в/из Майами через лицензированных партнёров PereJets и PrivateJetFinder с публикацией ориентировочных тарифов.', href: '/private-jets', cta: 'Запросить расчёт' },
      { title: 'Рестораны Michelin и клубы', meta: '74+ верифицированных места', desc: 'Carbone, Komodo, Sexy Fish, LPM, COTE, L’Atelier, Papi Steak, MILA — прямые ссылки на Resy, SevenRooms и OpenTable.', href: '/restaurants-nightlife', cta: 'Открыть гид ресторанов' },
      { title: 'Билеты на спорт и концерты', meta: 'NBA · NFL · MLS · F1 · Miami Open', desc: 'Miami Heat, Inter Miami CF, Miami Dolphins, Формула-1, концерты и VIP-события через живой календарь TicketNetwork.', href: '/events', cta: 'Смотреть афишу' },
      { title: 'Впечатления и вертолёты', meta: 'Майами и Флорида', desc: 'Частные полёты на вертолёте над South Beach, закатные круизы, Эверглейдс, музеи и парки через Viator и Headout.', href: '/experiences', cta: 'Смотреть туры' },
      { title: 'Авиабилеты в Майами', meta: 'Бизнес и первый класс · MIA / FLL', desc: 'Спецтарифы на международные и внутренние перелёты в Майами через партнёра Ovago.', href: '/travel', cta: 'Подобрать рейс' }
    ],
    pricingTitle: 'Ориентировочные цены на аренду в Майами (USD)',
    pricingSub: 'Прозрачные ориентиры по ключевым направлениям. Точный расчёт с депозитом и подачей команда Miami Elio подтверждает письменно до оплаты.',
    pricingHeaders: ['Направление', 'Формат / Класс', 'Ориентир, USD', 'Как бронируется'],
    pricingRows: [
      ['Люксовые SUV и седаны', 'BMW X5/X7, Mercedes-AMG G63, Range Rover', 'от $250 – $750 / день', 'ESIGN + Stripe 3DS2 / PayPal, Split-Pay'],
      ['Суперкары и Rolls-Royce', 'Lamborghini Urus/Huracán, Ferrari, Rolls-Royce Cullinan', 'от $900 – $2,000+ / день', 'Собственный гараж Sunny Isles + партнёры'],
      ['Яхты с капитаном (34–52 ft)', 'Прогулка 4 часа по заливу Бискейн', 'от $1,200 – $3,500', 'Прямые тарифы YATR и Viator'],
      ['Крупные яхты (60–110+ ft)', 'Чартер 4–8 часов с экипажем', 'от $4,500 – $25,000+', 'Прямые тарифы партнёров + 24/7 поддержка'],
      ['Частные виллы и резиденции', 'Майами-Бич, Бриккелл, Санни-Айлс', 'от $1,200 – $15,000+ / ночь', 'Поиск Stay22 + подбор командой'],
      ['Частный джет (one-way)', 'Майами → Нассау (1ч) / Нью-Йорк → Майами (2ч 36м)', 'от $8,000 / от $36,500', 'Лицензированные операторы PereJets / PrivateJetFinder']
    ],
    fleetTitle: 'Популярные автомобили автопарка в Майами',
    fleetCta: 'Все 290+ авто',
    dailyLabel: 'В сутки',
    guidesTitle: 'Полезные гайды и цены по Майами',
    guidesCta: 'Все гайды',
    faqTitle: 'Частые вопросы об аренде в Майами на русском',
    faqs: [
      {
        question: 'Можно ли арендовать суперкар или яхту в Майами на русском языке?',
        answer: 'Да. Сайт Miami Elio, ИИ-гид ELIO+ (на сайте, в Android-приложении, в Telegram @MIAMI_ELIO и WhatsApp) и живая команда в Майами полностью работают на русском языке и ещё на 15 языках.'
      },
      {
        question: 'Принимаются ли российские, европейские и международные водительские права?',
        answer: 'Да, для аренды авто в Майами принимаются действующие национальные и международные водительские права (латиницей), возраст водителя обычно от 25 лет, плюс полная страховка и возвратный депозит, размер которого подтверждается письменно до оплаты.'
      },
      {
        question: 'Доставляете ли вы авто в аэропорты MIA, FLL, OPF и к отелям?',
        answer: 'Да, команда Miami Elio организует подачу и возврат авто в аэропорты MIA, FLL, терминалы частной авиации OPF, а также по адресам в Майами-Бич, Бриккелл, Санни-Айлс, Бал-Харбор, Фишер-Айленд и Ки-Бискейн.'
      },
      {
        question: 'Сколько гостей можно взять на частную яхту в Майами?',
        answer: 'По правилам Береговой охраны США (USCG) стандартные частные яхты вмещают до 6 или до 12–13 дневных гостей в зависимости от сертификации судна. Для компаний от 14 человек подбираются сертифицированные инспектируемые суда.'
      },
      {
        question: 'Как защищена оплата и можно ли разделить счёт на компанию?',
        answer: 'Прямые бронирования через Miami Elio проходят после электронного подписания договора (ESIGN) через защищённый чекаут Stripe 3DS2 или PayPal Business с поддержкой Group Split-Pay (деление оплаты между участниками поездки) и гарантией ELIO+ Shield.'
      }
    ],
    switchLabel: 'Other languages:',
    switchLinks: [
      { label: 'English (Main)', href: '/' },
      { label: 'Español (/es)', href: '/es' }
    ]
  },
  es: {
    lang: 'es',
    ogLocale: 'es_US',
    path: '/es',
    metaTitle: 'Alquiler de Yates, Autos de Lujo, Villas y Jets en Miami | Miami Elio',
    metaDescription: 'Miami Elio — alquiler de autos exóticos (290+ vehículos), yates con capitán, villas frente al mar, jets privados y 74+ restaurantes verificados en Miami en español.',
    eyebrow: 'MIAMI ELIO · MIAMI EN ESPAÑOL · 16 IDIOMAS',
    heroTitle: 'Yates, autos exóticos, villas y restaurantes en Miami — en español.',
    heroLede: 'Una sola plataforma en Miami para reservar 290+ autos de lujo, yates con capitán, villas privadas, jets, 74+ restaurantes Michelin y entradas VIP. Atención personal de nuestro equipo local en Miami y guía ELIO+ 24/7 en 16 idiomas.',
    heroImage: '/images/home/hero-tower.webp',
    heroAlt: 'Vista aérea de Miami Beach y Biscayne Bay — Miami Elio',
    primaryCta: { label: 'Abrir ELIO+ Guide', href: '/discovery' },
    telegramCta: { label: 'Escribir en Telegram @MIAMI_ELIO', href: 'https://t.me/MIAMI_ELIO' },
    whatsappCta: { label: 'WhatsApp 24/7', href: 'https://wa.me/message/VO7GCPZCDKRZO1' },
    stats: [
      ['Flota en Miami', '290+ vehículos'],
      ['Restaurantes y clubes', '74+ verificados'],
      ['Idiomas disponibles', '16 idiomas'],
      ['Equipo en vivo', '24/7 Telegram y WhatsApp']
    ],
    worldsTitle: 'Ocho verticales de Miami en una sola cuenta',
    worldsSub: 'Reserva cada experiencia por separado o coordina todo tu fin de semana en Miami con entrega directa al aeropuerto o a tu villa.',
    worlds: [
      { title: 'Alquiler de autos exóticos', meta: 'Desde $250/día · 290+ autos', desc: 'Lamborghini Urus, Rolls-Royce Cullinan, Ferrari, Mercedes-AMG G63 y Porsche 911 con entrega en MIA, FLL, OPF, Miami Beach, Brickell y Sunny Isles.', href: '/rentals', cta: 'Ver flota' },
      { title: 'Alquiler de yates con capitán', meta: '4h y 8h · Biscayne Bay', desc: 'Yates privados de 34 a 110+ pies con tarifas directas de YATR y operadores verificados: Star Island, Haulover y Nixon Sandbar.', href: '/yachts', cta: 'Explorar yates' },
      { title: 'Villas y residencias', meta: 'Miami Beach, Brickell, Sunny Isles', desc: 'Villas frente al mar con piscina, penthouses y hoteles 5★ adaptados a tus fechas y número de huéspedes.', href: '/vacation-rentals', cta: 'Ver villas' },
      { title: 'Jets privados', meta: 'OPF · MIA · FXE', desc: 'Cotizaciones de aviación privada hacia y desde Miami con PereJets y PrivateJetFinder y precios guía de solo ida.', href: '/private-jets', cta: 'Solicitar cotización' },
      { title: 'Restaurantes Michelin y vida nocturna', meta: '74+ lugares verificados', desc: 'Carbone, Komodo, Sexy Fish, LPM, COTE, L’Atelier, Papi Steak y MILA con enlaces directos a Resy, SevenRooms y OpenTable.', href: '/restaurants-nightlife', cta: 'Ver restaurantes' },
      { title: 'Entradas a deportes y conciertos', meta: 'NBA · NFL · MLS · F1 · Miami Open', desc: 'Miami Heat, Inter Miami CF, Miami Dolphins, Fórmula 1 y conciertos con inventario en vivo vía TicketNetwork.', href: '/events', cta: 'Ver eventos' },
      { title: 'Experiencias y helicópteros', meta: 'Miami y Florida', desc: 'Vuelos privados en helicóptero sobre South Beach, cruceros al atardecer, Everglades y atracciones con Viator y Headout.', href: '/experiences', cta: 'Explorar tours' },
      { title: 'Vuelos a Miami', meta: 'Business y Primera · MIA / FLL', desc: 'Tarifas competitivas en vuelos internacionales y domésticos a Miami con Ovago.', href: '/travel', cta: 'Buscar vuelos' }
    ],
    pricingTitle: 'Guía de precios de referencia en Miami (USD)',
    pricingSub: 'Tarifas orientativas transparentes. El equipo de Miami Elio confirma el total exacto, depósito y entrega por escrito antes de cobrar.',
    pricingHeaders: ['Servicio', 'Categoría / Ejemplo', 'Precio guía (USD)', 'Reserva y protección'],
    pricingRows: [
      ['SUVs y sedanes de lujo', 'BMW X5/X7, Mercedes-AMG G63, Range Rover', '$250 – $750 / día', 'Contrato ESIGN + Stripe 3DS2 / PayPal, Split-Pay'],
      ['Superdeportivos y Rolls-Royce', 'Lamborghini Urus/Huracán, Ferrari, Rolls-Royce Cullinan', '$900 – $2,000+ / día', 'Flota propia Sunny Isles + socios verificados'],
      ['Yates con capitán (34–52 pies)', 'Charter de 4 horas en Biscayne Bay', '$1,200 – $3,500', 'Tarifas directas YATR y Viator'],
      ['Yates grandes y superyates (60–110+)', 'Charter de 4 a 8 horas con tripulación', '$4,500 – $25,000+', 'Operadores con licencia + soporte 24/7'],
      ['Villas privadas y estadías', 'Miami Beach, Brickell, Sunny Isles', '$1,200 – $15,000+ / noche', 'Búsqueda Stay22 + coordinación local'],
      ['Jet privado (solo ida)', 'Miami → Nassau (1h) / Nueva York → Miami (2h 36m)', 'Desde $8,000 / $36,500', 'Operadores licenciados PereJets / PrivateJetFinder']
    ],
    fleetTitle: 'Vehículos destacados en Miami',
    fleetCta: 'Ver los 290+ autos',
    dailyLabel: 'Por día',
    guidesTitle: 'Guías prácticas y precios en Miami',
    guidesCta: 'Ver todas las guías',
    faqTitle: 'Preguntas frecuentes sobre reservas en Miami',
    faqs: [
      {
        question: '¿Puedo reservar autos exóticos, yates y villas en Miami totalmente en español?',
        answer: 'Sí. Tanto la plataforma Miami Elio como ELIO+ Guide (web, app Android, Telegram @MIAMI_ELIO y WhatsApp) y nuestro equipo en vivo atienden en español y en otros 15 idiomas.'
      },
      {
        question: '¿Aceptan licencias de conducir internacionales y entregan en el aeropuerto MIA?',
        answer: 'Sí. Aceptamos licencias vigentes de Estados Unidos e internacionales. Coordinamos entrega directa en MIA, FLL, terminales privados OPF, hoteles y villas en Miami Beach, Brickell, Sunny Isles y Coral Gables.'
      },
      {
        question: '¿Cuántas personas pueden subir a un yate privado en Miami?',
        answer: 'Según la normativa de la Guardia Costera de EE. UU. (USCG), los yates privados estándar admiten hasta 6 o hasta 12–13 pasajeros de día según su certificación. Para grupos mayores de 13 personas ofrecemos embarcaciones certificadas.'
      },
      {
        question: '¿Cómo funciona el pago seguro y Group Split-Pay?',
        answer: 'Las reservas directas con Miami Elio incluyen contrato electrónico ESIGN previo al pago mediante Stripe 3D Secure 2 o PayPal Business, opción de dividir el pago entre amigos (Group Split-Pay) y garantía ELIO+ Shield.'
      }
    ],
    switchLabel: 'Otros idiomas:',
    switchLinks: [
      { label: 'English (Main)', href: '/' },
      { label: 'Русский (/ru)', href: '/ru' }
    ]
  }
});
