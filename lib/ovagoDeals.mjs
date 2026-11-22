// Canonical registry of the active Ovago CJ Affiliate flight offers shown on
// app/travel/ovago/page.js. Kept in sync by tests/concierge/index-completeness.test.mjs
// so the page file itself stays untouched while the AI concierge can index every deal.
export const OVAGO_DEALS = Object.freeze([
  Object.freeze({
    id: 'ovago-last-minute-flights',
    slug: 'last-minute-flights',
    name: 'Last Minute Flights',
    description: 'Save up to $30 off* on Flights with code: LASTMINUTE30, Book Now!',
    image: '/images/ovago/last-minute-flights.jpg',
    href: 'https://www.dpbolvw.net/click-101825540-15821121',
    internalHref: '/travel/ovago',
    tags: Object.freeze([
      'last minute', 'last-minute', 'urgent', 'today', 'tomorrow',
      'срочно', 'горящие', 'последний момент', 'авиабилеты', 'авиабилет', 'перелёт', 'перелет', 'рейс',
      'último minuto', 'vuelos', 'voos', 'letzte minute', 'flüge', 'dernière minute', 'vols',
      'ultimo minuto', 'voli', 'ostatnia chwila', 'loty', 'son dakika', 'uçuş',
      'רגע אחרון', 'טיסות', 'اللحظة الأخيرة', 'طيران', 'لحظه آخری', 'پرواز',
      '特价机票', '机票', '直前', '航空券', '막차', '항공권'
    ])
  }),
  Object.freeze({
    id: 'ovago-cheap-flights',
    slug: 'cheap-flights',
    name: 'Cheap Flights',
    description: 'Cheap Flight Deals *Hot Selling',
    image: '/images/ovago/cheap-flights.jpg',
    href: 'https://www.tkqlhce.com/click-101825540-15820959',
    internalHref: '/travel/ovago',
    tags: Object.freeze([
      'cheap', 'deals', 'affordable', 'budget', 'economy', 'airfare', 'airline', 'ticket', 'tickets',
      'дешевые', 'дешёвые', 'недорогие', 'выгодные', 'авиабилеты', 'авиабилет', 'перелёт', 'перелет', 'рейс',
      'vuelos baratos', 'económicos', 'voos baratos', 'günstige flüge', 'vols pas chers', 'voli economici',
      'tanie loty', 'ucuz uçak bileti', 'טיסות זולות', 'تذاكر طيران رخيصة', 'بلیط ارزان هواپیما',
      '便宜机票', '机票', '格安航空券', '항공권'
    ])
  }),
  Object.freeze({
    id: 'ovago-business-class-flights',
    slug: 'business-class-flights',
    name: 'Business Class Flights',
    description: 'Business Class Flight Deals',
    image: '/images/ovago/business-class-flights.jpg',
    href: 'https://www.kqzyfj.com/click-101825540-15832128',
    internalHref: '/travel/ovago',
    tags: Object.freeze([
      'business class', 'first class', 'premium cabin', 'flat bed', 'lounge', 'airfare', 'airline',
      'бизнес класс', 'бизнес-класс', 'первый класс', 'авиабилеты', 'перелёт', 'перелет',
      'clase ejecutiva', 'classe executiva', 'business-klasse', 'classe affaires', 'business class',
      'klasa biznes', 'business class uçuş', 'מחלקת עסקים', 'درجة رجال الأعمال', 'بیزنس کلاس',
      '商务舱', 'ビジネスクラス', '비즈니스석'
    ])
  })
]);
