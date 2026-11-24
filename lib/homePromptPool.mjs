// Curated, 16-language rotating pool of concise Miami luxury prompts for the
// HomeHero suggestion strip. Each locale carries 16 varied requests across
// yachts, supercars, tickets, villas/hotels, dining, private jets and
// experiences so visitors continuously see fresh, diverse suggestions rather
// than the same five static chips on every visit.

const PROMPT_POOL = {
  en: [
    'Yacht on Saturday',
    'Rolls-Royce for 3 days',
    'Heat tickets',
    'Villa in Miami Beach',
    'Table for four',
    'Sunset Biscayne yacht',
    'Lamborghini Urus today',
    'Inter Miami tickets',
    'Star Island villa',
    'Carbone dinner tonight',
    'Private jet to Bahamas',
    'Maybach with driver',
    '5★ Brickell hotel',
    'South Beach helicopter',
    'Sandbar yacht party',
    'Weekend plan for two'
  ],
  ru: [
    'Яхта в субботу',
    'Rolls-Royce на 3 дня',
    'Билеты на Heat',
    'Вилла в Майами-Бич',
    'Стол на четверых',
    'Яхта на закат',
    'Lamborghini Urus',
    'Билеты Inter Miami',
    'Вилла Star Island',
    'Ужин в Carbone',
    'Джет на Багамы',
    'Maybach с водителем',
    'Отель 5★ Brickell',
    'Вертолёт над Майами',
    'Яхта на сэндбар',
    'Уикенд в Майами'
  ],
  es: [
    'Yate el sábado',
    'Rolls-Royce por 3 días',
    'Boletos de los Heat',
    'Villa en Miami Beach',
    'Mesa para cuatro',
    'Yate al atardecer',
    'Lamborghini Urus hoy',
    'Boletos Inter Miami',
    'Villa en Star Island',
    'Cena en Carbone hoy',
    'Jet privado a Bahamas',
    'Maybach con chofer',
    'Hotel 5★ en Brickell',
    'Helicóptero South Beach',
    'Fiesta en yate Sandbar',
    'Plan de fin de semana'
  ],
  he: [
    'יאכטה בשבת',
    'רולס-רויס ל-3 ימים',
    'כרטיסים למיאמי היט',
    'וילה במיאמי ביץ׳',
    'שולחן לארבעה',
    'יאכטה בשקיעה',
    'למבורגיני אורוס היום',
    'כרטיסים לאינטר מיאמי',
    'וילה בסטאר איילנד',
    'ארוחת ערב ב-Carbone',
    'מטוס פרטי לבהאמה',
    'מייבאך עם נהג',
    'מלון 5★ בבריקל',
    'מסוק מעל סאות׳ ביץ׳',
    'מסיבת יאכטה בסנדבר',
    'סופ״ש זוגי במיאמי'
  ],
  zh: [
    '周六游艇包船',
    '劳斯莱斯租三天',
    '迈阿密热火球票',
    '迈阿密海滩别墅',
    '四人晚餐订座',
    '比斯坎湾日落游艇',
    '今日兰博基尼Urus',
    '迈阿密国际球票',
    '星岛海滨别墅',
    '今晚Carbone晚餐',
    '私人飞机去巴哈马',
    '迈巴赫配司机',
    '布里克尔五星酒店',
    '南海滩直升机观光',
    '浅滩游艇派对',
    '双人周末行程'
  ],
  pt: [
    'Iate no sábado',
    'Rolls-Royce por 3 dias',
    'Ingressos do Heat',
    'Villa em Miami Beach',
    'Mesa para quatro',
    'Iate ao pôr do sol',
    'Lamborghini Urus hoje',
    'Ingressos Inter Miami',
    'Villa em Star Island',
    'Jantar no Carbone hoje',
    'Jato para as Bahamas',
    'Maybach com motorista',
    'Hotel 5★ em Brickell',
    'Helicóptero South Beach',
    'Iate no Sandbar',
    'Roteiro de fim de semana'
  ],
  uk: [
    'Яхта в суботу',
    'Rolls-Royce на 3 дні',
    'Квитки на Heat',
    'Вілла в Маямі-Біч',
    'Столик на чотирьох',
    'Захід сонця на яхті',
    'Lamborghini Urus сьогодні',
    'Квитки на Inter Miami',
    'Вілла на Star Island',
    'Вечеря в Carbone',
    'Джет на Багами',
    'Maybach із водієм',
    'Готель 5★ у Брікеллі',
    'Гелікоптер над Саут-Біч',
    'Яхта на сендбар',
    'План на вікенд удвох'
  ],
  ja: [
    '土曜日にヨット',
    'ロールスロイス3日間',
    'ヒート戦チケット',
    'マイアミビーチのヴィラ',
    '4名でディナー予約',
    'サンセットヨット',
    '今日ランボルギーニUrus',
    'インテルマイアミ観戦',
    'スター島のヴィラ',
    '今夜Carboneディナー',
    'バハマへプライベート機',
    '運転手付きマイバッハ',
    'ブリッケル5★ホテル',
    'サウスビーチ遊覧ヘリ',
    'サンドバーヨット体験',
    '週末カップルプラン'
  ],
  ko: [
    '토요일 요트 차터',
    '롤스로이스 3일 렌트',
    '마이애미 히트 티켓',
    '마이애미 비치 빌라',
    '4인 디너 테이블',
    '선셋 비스케인 요트',
    '오늘 람보르기니 우루스',
    '인터 마이애미 티켓',
    '스타 아일랜드 빌라',
    '오늘 밤 Carbone 디너',
    '바하마 프라이빗 젯',
    '기사 포함 마이바흐',
    '브리켈 5★ 호텔',
    '사우스비치 헬기 투어',
    '샌드바 요트 파티',
    '주말 커플 일정'
  ],
  de: [
    'Yacht am Samstag',
    'Rolls-Royce für 3 Tage',
    'Heat-Tickets',
    'Villa in Miami Beach',
    'Tisch für vier',
    'Sonnenuntergangs-Yacht',
    'Lamborghini Urus heute',
    'Inter Miami Tickets',
    'Villa auf Star Island',
    'Dinner im Carbone',
    'Privatjet Bahamas',
    'Maybach mit Chauffeur',
    '5★ Hotel in Brickell',
    'Helikopter South Beach',
    'Sandbar-Yachtparty',
    'Wochenendplan zu zweit'
  ],
  ar: [
    'يخت يوم السبت',
    'رولز رويس لـ 3 أيام',
    'تذاكر ميامي هيت',
    'فيلا في ميامي بيتش',
    'طاولة لأربعة أشخاص',
    'يخت عند الغروب',
    'لامبورغيني أوروس اليوم',
    'تذاكر إنتر ميامي',
    'فيلا في ستار آيلاند',
    'عشاء في Carbone الليلة',
    'طائرة خاصة للباهاما',
    'مايباخ مع سائق',
    'فندق 5★ في بريكل',
    'هليكوبتر فوق ساوث بيتش',
    'رحلة يخت في ساندبار',
    'خطة عطلة نهاية الأسبوع'
  ],
  tr: [
    'Cumartesi yat kiralama',
    '3 günlük Rolls-Royce',
    'Heat maç biletleri',
    'Miami Beach villası',
    'Dört kişilik masa',
    'Gün batımı yat turu',
    'Bugün Lamborghini Urus',
    'Inter Miami biletleri',
    'Star Island villası',
    'Bu akşam Carbone yemeği',
    'Bahamalara özel jet',
    'Şoförlü Maybach',
    'Brickell 5★ otel',
    'South Beach helikopter',
    'Sandbar yat partisi',
    'İki kişilik hafta sonu'
  ],
  fa: [
    'کشتی تفریحی شنبه',
    'رولزرویس برای ۳ روز',
    'بلیت میامی هیت',
    'ویلا در میامی بیچ',
    'میز برای چهار نفر',
    'کشتی تفریحی غروب',
    'لامبورگینی اوروس امروز',
    'بلیت اینتر میامی',
    'ویلا در استار آیلند',
    'شام امشب در Carbone',
    'جت خصوصی به باهاما',
    'مایباخ با راننده',
    'هتل ۵★ در بریکل',
    'هلیکوپتر ساوث بیچ',
    'مهمانی یات در سندبار',
    'برنامه آخر هفته دونفره'
  ],
  it: [
    'Yacht sabato',
    'Rolls-Royce per 3 giorni',
    'Biglietti Miami Heat',
    'Villa a Miami Beach',
    'Tavolo per quattro',
    'Yacht al tramonto',
    'Lamborghini Urus oggi',
    'Biglietti Inter Miami',
    'Villa a Star Island',
    'Cena da Carbone stasera',
    'Jet privato Bahamas',
    'Maybach con autista',
    'Hotel 5★ a Brickell',
    'Elicottero South Beach',
    'Festa in yacht Sandbar',
    'Weekend per due'
  ],
  fr: [
    'Yacht samedi',
    'Rolls-Royce 3 jours',
    'Billets Miami Heat',
    'Villa à Miami Beach',
    'Table pour quatre',
    'Yacht au coucher du soleil',
    'Lamborghini Urus',
    'Billets Inter Miami',
    'Villa sur Star Island',
    'Dîner chez Carbone',
    'Jet privé Bahamas',
    'Maybach avec chauffeur',
    'Hôtel 5★ à Brickell',
    'Hélicoptère South Beach',
    'Yacht au Sandbar',
    'Week-end à deux'
  ],
  pl: [
    'Jacht w sobotę',
    'Rolls-Royce na 3 dni',
    'Bilety na Heat',
    'Willa w Miami Beach',
    'Stolik dla czterech',
    'Jacht o zachodzie słońca',
    'Lamborghini Urus dziś',
    'Bilety na Inter Miami',
    'Willa na Star Island',
    'Kolacja w Carbone dziś',
    'Prywatny odrzutowiec',
    'Maybach z szoferem',
    'Hotel 5★ w Brickell',
    'Helikopter South Beach',
    'Impreza na jachcie',
    'Plan na weekend we dwoje'
  ]
};

// Category bucket per prompt index so every generated batch mixes distinct worlds
// (yacht, car, event, stay, dining, jet/experience) instead of clustering duplicates.
const BUCKETS = [
  'yacht', 'car', 'event', 'stay', 'dining',
  'yacht', 'car', 'event', 'stay', 'dining',
  'jet', 'car', 'stay', 'experience', 'yacht', 'plan'
];

export function getHomePromptPool(locale) {
  return PROMPT_POOL[locale] || PROMPT_POOL.en;
}

export function pickFreshHomeChips(locale, count = 4, { exclude = [], random = Math.random } = {}) {
  const pool = getHomePromptPool(locale);
  const excluded = new Set(exclude);
  const candidates = pool
    .map((text, index) => ({ text, bucket: BUCKETS[index % BUCKETS.length], index }))
    .filter((entry) => !excluded.has(entry.text));

  const source = candidates.length >= count ? candidates : pool.map((text, index) => ({ text, bucket: BUCKETS[index % BUCKETS.length], index }));

  // Fisher-Yates shuffle on a shallow copy
  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  const picked = [];
  const usedBuckets = new Set();
  for (const item of shuffled) {
    if (picked.length >= count) break;
    if (!usedBuckets.has(item.bucket)) {
      picked.push(item.text);
      usedBuckets.add(item.bucket);
    }
  }
  if (picked.length < count) {
    for (const item of shuffled) {
      if (picked.length >= count) break;
      if (!picked.includes(item.text)) picked.push(item.text);
    }
  }
  return picked;
}

export const HOME_PROMPT_LOCALES = Object.keys(PROMPT_POOL);
