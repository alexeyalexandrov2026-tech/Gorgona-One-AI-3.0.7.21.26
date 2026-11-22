// ===========================================================================
// Contextual 1-tap quick-reply chips for Miami Elio AI Concierge (16 locales).
//
// Inspects the concierge's latest reply, active section cards, and session
// trip profile to surface 3-4 immediate follow-up chips so the guest can
// answer clarifying questions in one tap on mobile or desktop.
// ===========================================================================

import { normalizeLocale } from './locale.js';
import { conciergeCopy } from './conciergeCopy.mjs';

const QUICK_REPLIES = Object.freeze({
  vibe: {
    en: ['Michelin-starred restaurant', 'Sunset rooftop dining', 'Romantic dinner', 'VIP nightclub'],
    ru: ['Ресторан со звездой Мишлен', 'Ужин на закате / руфтоп', 'Романтический ужин', 'Ночной клуб / VIP'],
    es: ['Restaurante con estrella Michelin', 'Cena al atardecer / rooftop', 'Cena romántica', 'Club nocturno VIP'],
    he: ['מסעדת כוכב מישלן', 'ארוחת שקיעה על הגג', 'ארוחת ערב רומנטית', 'מועדון לילה VIP'],
    zh: ['米其林星级餐厅', '日落屋顶餐厅', '浪漫晚餐', 'VIP 夜店'],
    pt: ['Restaurante com estrela Michelin', 'Jantar ao pôr do sol / rooftop', 'Jantar romântico', 'Boate VIP'],
    uk: ['Ресторан із зіркою Мішлен', 'Вечеря на заході сонця / руфтоп', 'Романтична вечеря', 'Нічний клуб VIP'],
    ja: ['ミシュラン星付きレストラン', 'サンセット・ルーフトップ', 'ロマンチックディナー', 'VIPナイトクラブ'],
    ko: ['미슐랭 스타 레스토랑', '선셋 루프톱 다이닝', '로맨틱 디너', 'VIP 나이트클럽'],
    de: ['Michelin-Sterne-Restaurant', 'Sunset-Rooftop-Dinner', 'Romantisches Abendessen', 'VIP-Nachtclub'],
    ar: ['مطعم حائز على نجمة ميشلان', 'عشاء عند الغروب على السطح', 'عشاء رومانسي', 'نادي ليلي VIP'],
    tr: ['Michelin yıldızlı restoran', 'Gün batımı çatı restoranı', 'Romantik akşam yemeği', 'VIP gece kulübü'],
    fa: ['رستوران ستاره‌دار میشلن', 'شام غروب در روف‌تاپ', 'شام عاشقانه', 'کلوب شبانه VIP'],
    it: ['Ristorante stellato Michelin', 'Cena al tramonto / rooftop', 'Cena romantica', 'Nightclub VIP'],
    fr: ['Restaurant étoilé Michelin', 'Dîner au coucher du soleil / rooftop', 'Dîner romantique', 'Club VIP'],
    pl: ['Restauracja z gwiazdką Michelin', 'Kolacja o zachodzie słońca / rooftop', 'Romantyczna kolacja', 'Klub nocny VIP']
  },
  neighborhood: {
    en: ['In Brickell', 'In South Beach', 'In Design District', 'In Sunny Isles Beach'],
    ru: ['В Brickell', 'В South Beach', 'В Design District', 'В Sunny Isles Beach'],
    es: ['En Brickell', 'En South Beach', 'En Design District', 'En Sunny Isles Beach'],
    he: ['ב-Brickell', 'ב-South Beach', 'ב-Design District', 'ב-Sunny Isles Beach'],
    zh: ['在 Brickell', '在 South Beach', '在 Design District', '在 Sunny Isles Beach'],
    pt: ['Em Brickell', 'Em South Beach', 'Em Design District', 'Em Sunny Isles Beach'],
    uk: ['У Brickell', 'У South Beach', 'У Design District', 'У Sunny Isles Beach'],
    ja: ['Brickellエリア', 'South Beachエリア', 'Design Districtエリア', 'Sunny Isles Beachエリア'],
    ko: ['Brickell 지역', 'South Beach 지역', 'Design District 지역', 'Sunny Isles Beach 지역'],
    de: ['In Brickell', 'In South Beach', 'Im Design District', 'In Sunny Isles Beach'],
    ar: ['في Brickell', 'في South Beach', 'في Design District', 'في Sunny Isles Beach'],
    tr: ['Brickell bölgesinde', 'South Beach bölgesinde', 'Design District bölgesinde', 'Sunny Isles Beach bölgesinde'],
    fa: ['در Brickell', 'در South Beach', 'در Design District', 'در Sunny Isles Beach'],
    it: ['A Brickell', 'A South Beach', 'Nel Design District', 'A Sunny Isles Beach'],
    fr: ['À Brickell', 'À South Beach', 'Dans le Design District', 'À Sunny Isles Beach'],
    pl: ['W Brickell', 'W South Beach', 'W Design District', 'W Sunny Isles Beach']
  },
  'car-style': {
    en: ['Luxury SUV under $700/day', 'Supercar (Lamborghini / Ferrari)', 'Convertible', 'Executive sedan'],
    ru: ['Внедорожник (SUV) до $700/день', 'Суперкар (Lamborghini / Ferrari)', 'Кабриолет', 'Представительский седан'],
    es: ['SUV de lujo hasta $700/día', 'Superdeportivo (Lamborghini / Ferrari)', 'Descapotable', 'Sedán ejecutivo'],
    he: ['רכב פנאי-שטח (SUV)', 'מכונית-על (Lamborghini / Ferrari)', 'קבריולה (גג נפתח)', 'סדאן יוקرتית'],
    zh: ['豪华 SUV', '超级跑车 (Lamborghini / Ferrari)', '敞篷跑车', '行政轿车'],
    pt: ['SUV de luxo', 'Supercarro (Lamborghini / Ferrari)', 'Conversível', 'Sedã executivo'],
    uk: ['Позашляховик (SUV) до $700/день', 'Суперкар (Lamborghini / Ferrari)', 'Кабріолет', 'Представницький седан'],
    ja: ['ラグジュアリーSUV', 'スーパーカー (Lamborghini / Ferrari)', 'オープンカー', 'エグゼクティブセダン'],
    ko: ['럭셔리 SUV', '슈퍼카 (Lamborghini / Ferrari)', '컨버터블', '이그제큐티브 세단'],
    de: ['Luxus-SUV', 'Supersportwagen (Lamborghini / Ferrari)', 'Cabriolet', 'Oberklasse-Limousine'],
    ar: ['سيارة دفع رباعي فاخرة (SUV)', 'سيارة خارقة (Lamborghini / Ferrari)', 'سيارة مكشوفة', 'سيدان تنفيذية'],
    tr: ['Lüks SUV', 'Süper otomobil (Lamborghini / Ferrari)', 'Cabrio', 'Makam sedanı'],
    fa: ['شاسی‌بلند لوکس (SUV)', 'سوپراسپرت (Lamborghini / Ferrari)', 'کروک', 'سدان تشریفاتی'],
    it: ['SUV di lusso', 'Supercar (Lamborghini / Ferrari)', 'Cabriolet', 'Berlina executive'],
    fr: ['SUV de luxe', 'Supercar (Lamborghini / Ferrari)', 'Cabriolet', 'Berline exécutive'],
    pl: ['Luksusowy SUV', 'Supersamochód (Lamborghini / Ferrari)', 'Kabriolet', 'Limuzyna klasy premium']
  },
  'sport-or-artist': {
    en: ['Miami Heat tickets (NBA)', 'Inter Miami match (MLS)', 'Concerts this weekend', 'Comedy & stand-up'],
    ru: ['Билеты на Miami Heat (NBA)', 'Матч Inter Miami (MLS)', 'Концерты в эти выходные', 'Стендап и шоу'],
    es: ['Entradas Miami Heat (NBA)', 'Partido Inter Miami (MLS)', 'Conciertos este fin de semana', 'Comedia y shows'],
    he: ['כרטיסים ל-Miami Heat (NBA)', 'משחק Inter Miami (MLS)', 'הופעות בסוף השבוע', 'מופעי סטנדאפ'],
    zh: ['迈阿密热火队门票 (NBA)', '迈阿密国际比赛 (MLS)', '本周末演唱会', '脱口秀与演出'],
    pt: ['Ingressos Miami Heat (NBA)', 'Jogo do Inter Miami (MLS)', 'Shows neste fim de semana', 'Comédia e stand-up'],
    uk: ['Квитки на Miami Heat (NBA)', 'Матч Inter Miami (MLS)', 'Концерти цими вихідними', 'Стендап та шоу'],
    ja: ['マイアミ・ヒート (NBA)', 'インテル・マイアミ (MLS)', '今週末のコンサート', 'コメディ＆ショー'],
    ko: ['마이애미 히트 티켓 (NBA)', '인터 마이애미 경기 (MLS)', '이번 주말 콘서트', '코미디 & 공연'],
    de: ['Miami Heat Tickets (NBA)', 'Inter Miami Spiel (MLS)', 'Konzerte dieses Wochenende', 'Comedy & Shows'],
    ar: ['تذاكر ميامي هيت (NBA)', 'مباراة إنتر ميامي (MLS)', 'حفلات نهاية الأسبوع', 'عروض كوميدية'],
    tr: ['Miami Heat biletleri (NBA)', 'Inter Miami maçı (MLS)', 'Bu hafta sonu konserler', 'Komedi ve gösteriler'],
    fa: ['بلیط میامی هیت (NBA)', 'مسابقه اینتر میامی (MLS)', 'کنسرت‌های این آخر هفته', 'کمدی و نمایش‌ها'],
    it: ['Biglietti Miami Heat (NBA)', 'Partita Inter Miami (MLS)', 'Concerti questo weekend', 'Comedy e spettacoli'],
    fr: ['Billets Miami Heat (NBA)', 'Match Inter Miami (MLS)', 'Concerts ce week-end', 'Humour et spectacles'],
    pl: ['Bilety na Miami Heat (NBA)', 'Mecz Inter Miami (MLS)', 'Koncerty w ten weekend', 'Stand-up i widowiska']
  },
  interests: {
    en: ['Miami helicopter flight', 'Biscayne Bay yacht cruise', 'Everglades airboat tour', 'Where to go with kids'],
    ru: ['Вертолёт над Майами', 'Яхта по заливу Бискейн', 'Аэролодка в Everglades', 'Куда пойти с детьми'],
    es: ['Vuelo en helicóptero por Miami', 'Crucero en yate por Biscayne Bay', 'Hidrodeslizador en Everglades', 'Qué hacer con niños'],
    he: ['טיסת מסוק מעל מיאמי', 'שייט יאכטה במפרץ ביסקיין', 'סירת אוויר באוורגליידס', 'פעילויות עם ילדים'],
    zh: ['迈阿密直升机观光', '比斯坎湾游艇巡游', '大沼泽地气垫船之旅', '亲子家庭活动'],
    pt: ['Voo de helicóptero em Miami', 'Cruzeiro de iate em Biscayne Bay', 'Aerobarco em Everglades', 'Passeios com crianças'],
    uk: ['Гелікоптер над Маямі', 'Яхта затокою Біскейн', 'Аерочовен в Everglades', 'Куди піти з дітьми'],
    ja: ['マイアミ・ヘリコプター遊覧', 'ビスケーン湾ヨットクルーズ', 'エバーグレーズ・エアボート', '子供と楽しめるスポット'],
    ko: ['마이애미 헬리콥터 투어', '비스케인만 요트 크루즈', '에버글레이즈 에어보트', '아이와 함께 갈 곳'],
    de: ['Helikopterflug über Miami', 'Yacht-Круиз Biscayne Bay', 'Everglades Airboat-Tour', 'Ausflüge mit Kindern'],
    ar: ['جولة هليكوبتر فوق ميامي', 'رحلة يخت في خليج بيسكاين', 'قارب هوائي في إيفرغليدز', 'أنشطة مع الأطفال'],
    tr: ['Miami helikopter turu', 'Biscayne Körfezi yat turu', 'Everglades hava botu turu', 'Çocuklarla gezilecek yerler'],
    fa: ['پرواز هلیکوپتر بر فراز میامی', 'گشت یات در خلیج بیسکین', 'قایق بادی اورگلیدز', 'تفریحات مناسب کودکان'],
    it: ['Volo in elicottero su Miami', 'Crociera in yacht a Biscayne Bay', 'Idroscivolante nelle Everglades', 'Cosa fare con i bambini'],
    fr: ['Vol en hélicoptère sur Miami', 'Croisière en yacht à Biscayne Bay', 'Hydroglisseur dans les Everglades', 'Sorties avec enfants'],
    pl: ['Lot helikopterem nad Miami', 'Rejs jachtem po Biscayne Bay', 'Poduszkowiec w Everglades', 'Atrakcje dla dzieci']
  },
  'time-on-water': {
    en: ['Short 2–3 hour bay cruise', 'Full-day private yacht charter', 'Yacht for 8 guests this Saturday'],
    ru: ['Короткий круиз на 2–3 часа', 'Чартер яхты на весь день', 'Яхта на 8 гостей в субботу'],
    es: ['Crucero corto de 2–3 horas', 'Chárтер de yate todo el día', 'Yate para 8 personas el sábado'],
    he: ['שייט קצר של 2–3 שעות', 'השכרת יאכטה ליום שלם', 'יאכטה ל-8 אורחים בשבת'],
    zh: ['2–3 小时海湾短途巡游', '全天私人游艇包船', '周六 8 人游艇'],
    pt: ['Cruzeiro curto de 2–3 horas', 'Fretamento de iate para o dia todo', 'Iate para 8 convidados no sábado'],
    uk: ['Короткий круїз на 2–3 години', 'Чартер яхти на весь день', 'Яхта на 8 гостей у суботу'],
    ja: ['2〜3時間のショートクルーズ', '1日プライベートヨットチャーター', '土曜日に8名でヨット'],
    ko: ['2~3시간 짧은 베이 크루즈', '전일 프라이빗 요트 차터', '토요일 8인용 요트'],
    de: ['Kurze 2–3 Stunden Bucht-Tour', 'Ganztägiger Yacht-Charter', 'Yacht für 8 Gäste am Samstag'],
    ar: ['رحلة بحرية قصيرة لمدة 2–3 ساعات', 'استئجار يخت خاص ليوم كامل', 'يخت لـ 8 ضيوف يوم السبت'],
    tr: ['2–3 saatlik kısa körfez turu', 'Tam gün özel yat kiralama', 'Cumartesi 8 kişilik yat'],
    fa: ['گشت کوتاه ۲ تا ۳ ساعته خلیج', 'اجاره یات خصوصی برای تمام روز', 'یات برای ۸ نفر در روز شنبه'],
    it: ['Crociera breve di 2–3 ore', 'Noleggio yacht per l’intera giornata', 'Yacht per 8 ospiti sabato'],
    fr: ['Croisière courte de 2–3 heures', 'Location de yacht à la journée', 'Yacht pour 8 personnes samedi'],
    pl: ['Krótki rejs 2–3 godziny', 'Czarter jachtu na cały dzień', 'Jacht dla 8 gości w sobotę']
  },
  dates: {
    en: ['Tonight', 'Tomorrow', 'This weekend', 'This Friday'],
    ru: ['Сегодня вечером', 'Завтра', 'В эти выходные', 'В пятницу'],
    es: ['Esta noche', 'Mañana', 'Este fin de semana', 'Este viernes'],
    he: ['הערב', 'מחר', 'בסוף השבוע', 'ביום שישי'],
    zh: ['今晚', '明天', '本周末', '本周五'],
    pt: ['Hoje à noite', 'Amanhã', 'Neste fim de semana', 'Nesta sexta-feira'],
    uk: ['Сьогодні ввечері', 'Завтра', 'Цими вихідними', 'У п’ятницю'],
    ja: ['今夜', '明日', '今週末', '今週の金曜日'],
    ko: ['오늘 저녁', '내일', '이번 주말', '이번 금요일'],
    de: ['Heute Abend', 'Morgen', 'Dieses Wochenende', 'Diesen Freitag'],
    ar: ['الليلة', 'غداً', 'عطلة نهاية الأسبوع', 'هذا الجمعة'],
    tr: ['Bu akşam', 'Yarın', 'Bu hafta sonu', 'Bu cuma'],
    fa: ['امشب', 'فردا', 'این آخر هفته', 'این جمعه'],
    it: ['Stasera', 'Domani', 'Questo weekend', 'Questo venerdì'],
    fr: ['Ce soir', 'Demain', 'Ce week-end', 'Ce vendredi'],
    pl: ['Dziś wieczorem', 'Jutro', 'W ten weekend', 'W ten piątek']
  },
  group: {
    en: ['For 2 guests', 'For 4 guests', 'For 6 guests', 'For 8 guests'],
    ru: ['На двоих', 'Нас четверо', 'Нас шестеро', 'На 8 гостей'],
    es: ['Para 2 personas', 'Para 4 personas', 'Para 6 personas', 'Para 8 personas'],
    he: ['ל-2 אורחים', 'ל-4 אורחים', 'ל-6 אורחים', 'ל-8 אורחים'],
    zh: ['2 位宾客', '4 位宾客', '6 位宾客', '8 位宾客'],
    pt: ['Para 2 pessoas', 'Para 4 pessoas', 'Para 6 pessoas', 'Para 8 pessoas'],
    uk: ['На двох', 'Нас четверо', 'Нас шестеро', 'На 8 гостей'],
    ja: ['2名で', '4名で', '6名で', '8名で'],
    ko: ['2명', '4명', '6명', '8명'],
    de: ['Für 2 Gäste', 'Für 4 Gäste', 'Für 6 Gäste', 'Für 8 Gäste'],
    ar: ['لضيفين (2)', 'لـ 4 ضيوف', 'لـ 6 ضيوف', 'لـ 8 ضيوف'],
    tr: ['2 kişi için', '4 kişi için', '6 kişi için', '8 kişi için'],
    fa: ['برای ۲ نفر', 'برای ۴ نفر', 'برای ۶ نفر', 'برای ۸ نفر'],
    it: ['Per 2 ospiti', 'Per 4 ospiti', 'Per 6 ospiti', 'Per 8 ospiti'],
    fr: ['Pour 2 personnes', 'Pour 4 personnes', 'Pour 6 personnes', 'Pour 8 personnes'],
    pl: ['Dla 2 osób', 'Dla 4 osób', 'Dla 6 osób', 'Dla 8 osób']
  }
});

const SECTION_DEFAULT_KEY = Object.freeze({
  '/restaurants-nightlife': 'vibe',
  '/rentals': 'car-style',
  '/events': 'sport-or-artist',
  '/experiences': 'interests',
  '/yachts': 'time-on-water'
});

/**
 * Determine 3-4 localized quick-reply chips for the latest assistant reply.
 */
export function quickRepliesForTurn({ reply = '', cards = [], listings = [], locale = 'en', handoff = false, degraded = false } = {}) {
  if (handoff || degraded || !reply || typeof reply !== 'string') return [];
  const code = normalizeLocale(locale);
  const questions = conciergeCopy[code]?.questions || conciergeCopy.en.questions;

  // 1. If the assistant's reply ends with a known clarifying question, match its exact quick-reply set.
  for (const [qId, qText] of Object.entries(questions)) {
    if (qText && reply.includes(qText) && QUICK_REPLIES[qId]) {
      return QUICK_REPLIES[qId][code] || QUICK_REPLIES[qId].en;
    }
  }

  // 2. Otherwise offer contextual quick refinements for the primary active section.
  const primarySection = cards[0]?.href || (listings[0]?.href ? '/' + listings[0].href.split('/')[1] : null);
  const key = primarySection ? SECTION_DEFAULT_KEY[primarySection] : null;
  if (key && QUICK_REPLIES[key]) {
    return QUICK_REPLIES[key][code] || QUICK_REPLIES[key].en;
  }

  return [];
}
