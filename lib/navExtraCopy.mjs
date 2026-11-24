// 16-language compact labels for extra top navigation & footer links
// (Dining & Nightlife + Live Trip Room).

const COPY = {
  en: { dining: 'Dining', tripRoom: 'Trip Room' },
  ru: { dining: 'Рестораны', tripRoom: 'Поездка' },
  es: { dining: 'Restaurantes', tripRoom: 'Mi Viaje' },
  he: { dining: 'מסעדות', tripRoom: 'חדר הטיול' },
  zh: { dining: '餐饮夜生活', tripRoom: '行程室' },
  pt: { dining: 'Gastronomia', tripRoom: 'Minha Viagem' },
  uk: { dining: 'Ресторани', tripRoom: 'Поїздка' },
  ja: { dining: 'ダイニング', tripRoom: 'トリップ' },
  ko: { dining: '다이닝', tripRoom: '트립 룸' },
  de: { dining: 'Dining', tripRoom: 'Trip Room' },
  ar: { dining: 'المطاعم', tripRoom: 'رحلتي' },
  tr: { dining: 'Restoranlar', tripRoom: 'Seyahatim' },
  fa: { dining: 'رستوران‌ها', tripRoom: 'سفر من' },
  it: { dining: 'Dining', tripRoom: 'Trip Room' },
  fr: { dining: 'Dining', tripRoom: 'Mon Voyage' },
  pl: { dining: 'Restauracje', tripRoom: 'Moja Podróż' }
};

export function getNavExtraCopy(locale = 'en') {
  return COPY[locale] || COPY.en;
}
