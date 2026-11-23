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
    'Recommend a restaurant for a birthday dinner',
    'I need a car rental'
  ],
  ru: [
    'Спланируй выходные в Майами',
    'Найди яхту на 8 гостей',
    'Подбери ресторан на день рождения',
    'Нужна аренда авто'
  ],
  es: [
    'Planea un fin de semana en Miami',
    'Busca un yate para 8 personas',
    'Recomienda un restaurante para cenar',
    'Necesito alquiler de coches'
  ],
  he: [
    'תכנן סוף שבוע במיאמי',
    'מצא יאכטה ל-8 אורחים',
    'המלץ על מסעדה לארוחת ערב',
    'אני צריך השכרת רכב'
  ],
  zh: ['计划迈阿密周末之旅', '寻找可容纳8人的游艇', '推荐一家晚餐餐厅', '我需要租车'],
  pt: [
    'Planeje um fim de semana em Miami',
    'Encontre um iate para 8 pessoas',
    'Recomende um restaurante para jantar',
    'Preciso de aluguel de carros'
  ],
  uk: [
    'Сплануй вихідні в Маямі',
    'Знайди яхту на 8 гостей',
    'Підбери ресторан на вечерю',
    'Потрібна оренда авто'
  ],
  ja: ['マイアミの週末を計画して', '8名用のヨットを探して', 'ディナーにおすすめのレストランを教えて', 'レンタカーが必要です'],
  ko: ['마이애미 주말 여행 계획', '8인용 요트 찾기', '저녁 식사하기 좋은 레스토랑 추천해 줘', '렌터카가 필요해요'],
  de: [
    'Plane ein Wochenende in Miami',
    'Finde eine Yacht für 8 Gäste',
    'Empfiehl ein Restaurant fürs Abendessen',
    'Ich brauche einen Mietwagen'
  ],
  ar: ['خطط لعطلة نهاية أسبوع في ميامي', 'ابحث عن يخت لـ 8 ضيوف', 'رشّح لي مطعماً للعشاء في ميامي', 'أحتاج تأجير سيارات'],
  tr: [
    "Miami'de bir hafta sonu planla",
    '8 kişilik bir yat bul',
    'Akşam yemeği için restoran öner',
    'Araba kiralama lazım'
  ],
  fa: ['یک آخر هفته در میامی برنامه‌ریزی کن', 'یک قایق تفریحی برای ۸ نفر پیدا کن', 'یک رستوران عالی برای شام پیشنهاد بده', 'به اجاره خودرو نیاز دارم'],
  it: [
    'Organizza un weekend a Miami',
    'Trova uno yacht per 8 ospiti',
    'Consiglia un ristorante per cena',
    'Mi serve un noleggio auto'
  ],
  fr: [
    'Organise un week-end à Miami',
    'Trouve un yacht pour 8 personnes',
    'Recommande un restaurant pour le dîner',
    "J'ai besoin d'une location de voiture"
  ],
  pl: [
    'Zaplanuj weekend w Miami',
    'Znajdź jacht dla 8 gości',
    'Poleć restaurację na kolację',
    'Potrzebuję wynajmu samochodu'
  ]
};
