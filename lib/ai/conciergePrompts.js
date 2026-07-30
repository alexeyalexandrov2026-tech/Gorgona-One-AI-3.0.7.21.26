// Starter prompts shown in an empty concierge thread, per locale.
//
// These are not decoration: tapping one sends it verbatim to the AI, so they
// have to be in the guest's language or the very first exchange happens in
// the wrong one. They also double as a live demonstration that the action
// cards fire on non-English input - each line contains vocabulary the
// multilingual matcher in lib/aiSuggestions.js recognises.
//
// Locales without an entry fall back to English (see the consumer).

export const STARTER_PROMPTS = {
  en: [
    'Plan a weekend in Miami',
    'Find a yacht for 8 guests',
    'Book a table for a birthday dinner',
    'Best sportsbook offers right now'
  ],
  ru: [
    'Спланируй выходные в Майами',
    'Найди яхту на 8 гостей',
    'Забронируй столик на день рождения',
    'Нужна аренда авто'
  ],
  es: [
    'Planea un fin de semana en Miami',
    'Busca un yate para 8 personas',
    'Reserva una mesa para una cena',
    'Necesito alquiler de coches'
  ],
  he: [
    'תכנן סוף שבוע במיאמי',
    'מצא יאכטה ל-8 אורחים',
    'הזמן שולחן לארוחת ערב',
    'אני צריך השכרת רכב'
  ],
  zh: ['计划迈阿密周末之旅', '寻找可容纳8人的游艇', '预订晚餐餐厅', '我需要租车'],
  pt: [
    'Planeje um fim de semana em Miami',
    'Encontre um iate para 8 pessoas',
    'Reserve uma mesa para o jantar',
    'Preciso de aluguel de carros'
  ],
  uk: [
    'Сплануй вихідні в Маямі',
    'Знайди яхту на 8 гостей',
    'Заброньюй столик на вечерю',
    'Потрібна оренда авто'
  ],
  ja: ['マイアミの週末を計画して', '8名用のヨットを探して', 'ディナーの席を予約して', 'レンタカーが必要です'],
  ko: ['마이애미 주말 여행 계획', '8인용 요트 찾기', '저녁 식사 예약', '렌터카가 필요해요'],
  de: [
    'Plane ein Wochenende in Miami',
    'Finde eine Yacht für 8 Gäste',
    'Reserviere einen Tisch zum Abendessen',
    'Ich brauche einen Mietwagen'
  ],
  ar: ['خطط لعطلة نهاية أسبوع في ميامي', 'ابحث عن يخت لـ 8 ضيوف', 'احجز طاولة للعشاء', 'أحتاج تأجير سيارات'],
  tr: [
    "Miami'de bir hafta sonu planla",
    '8 kişilik bir yat bul',
    'Akşam yemeği için masa ayırt',
    'Araba kiralama lazım'
  ],
  fa: ['یک آخر هفته در میامی برنامه‌ریزی کن', 'یک قایق تفریحی برای ۸ نفر پیدا کن', 'یک میز برای شام رزرو کن', 'به اجاره خودرو نیاز دارم'],
  it: [
    'Organizza un weekend a Miami',
    'Trova uno yacht per 8 ospiti',
    'Prenota un tavolo per cena',
    'Mi serve un noleggio auto'
  ],
  fr: [
    'Organise un week-end à Miami',
    'Trouve un yacht pour 8 personnes',
    'Réserve une table pour le dîner',
    "J'ai besoin d'une location de voiture"
  ],
  pl: [
    'Zaplanuj weekend w Miami',
    'Znajdź jacht dla 8 gości',
    'Zarezerwuj stolik na kolację',
    'Potrzebuję wynajmu samochodu'
  ]
};
