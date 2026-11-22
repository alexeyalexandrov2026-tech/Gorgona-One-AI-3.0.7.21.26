// ===========================================================================
// Miami Elio — localized intent vocabulary for the action-card matcher.
//
// TWO SOURCES FEED THE MULTILINGUAL MATCHER, and this file is the second of
// them:
//
//   1. HARVESTED (lib/aiSuggestions.js): the section names already translated
//      in lib/i18n.js - `nav.*`, `discovery.*` and the per-page `pill` labels,
//      across all 16 locales. Free, and it can never drift from the UI: add a
//      locale to i18n and the matcher speaks it the same day.
//
//   2. CURATED (this file): how guests actually PHRASE a request, which a
//      nav label does not cover. Russian navigation says "Аренда авто", but a
//      guest types "нужна машина"; the harvest gets the former, this gets the
//      latter.
//
// Stems carry the load in inflected languages: 'яхт*' matches яхта / яхты /
// яхту / яхте from one entry, which is why the matcher supports a trailing
// '*' (see compileKeyword). For Chinese, Japanese and Korean the matcher
// drops word boundaries entirely - those scripts do not separate words, and
// Korean in particular glues particles straight onto the noun ("렌터카가"),
// so a boundary-anchored pattern would never fire.
//
// This table is intentionally not exhaustive. It covers the request shapes
// the concierge sees most - vehicles, yachts, betting, shopping, dining,
// stays, travel, events, experiences, coupons - and the harvest backs up
// everything else.
// ===========================================================================

export const LOCALIZED_KEYWORDS = {
  '/private-jets': {
    ru:['частный самолёт','частный самолет','частного самолёта','частном самолёте','бизнес джет'],
    uk:['приватний літак','приватного літака'],es:['jet privado','avión privado'],pt:['jato privado','avião particular'],
    de:['privatjet','privatflug'],fr:['jet privé','avion privé'],it:['jet privato','aereo privato'],pl:['prywatny odrzutowiec','prywatny samolot'],
    tr:['özel jet','özel uçak'],he:['מטוס פרטי'],ar:['طائرة خاصة'],fa:['جت خصوصی','هواپیمای خصوصی'],zh:['私人飞机','私人飛機'],ja:['プライベートジェット'],ko:['전용기','프라이빗 제트']
  },
  '/yachts': {
    ru: ['яхт*', 'катер*', 'лодк*', 'парусник*', 'катамаран*', 'чартер*', 'на воде'],
    uk: ['яхт*', 'катер*', 'човен', 'човни', 'катамаран*', 'чартер*'],
    es: ['yate*', 'barco*', 'velero*', 'catamarán', 'catamaran', 'chárter', 'charter', 'navegar'],
    pt: ['iate*', 'barco*', 'veleiro*', 'catamarã', 'catamara', 'fretamento'],
    de: ['yacht*', 'boot', 'boote', 'segelboot*', 'katamaran*', 'charter*'],
    fr: ['yacht*', 'bateau*', 'voilier*', 'catamaran*', 'affrètement', 'croisière'],
    it: ['yacht*', 'barca', 'barche', 'veliero', 'catamarano', 'noleggio barca'],
    pl: ['jacht*', 'łódź', 'łodzi', 'katamaran*', 'czarter*'],
    tr: ['yat', 'yatlar', 'tekne*', 'katamaran*', 'kiralık yat'],
    he: ['יאכט*', 'סירה', 'סירות', 'שיט'],
    ar: ['يخت', 'يخوت', 'قارب', 'قوارب', 'إبحار'],
    fa: ['قایق', 'یات', 'کشتی تفریحی'],
    zh: ['游艇', '快艇', '帆船', '包船', '出海'],
    ja: ['ヨット', 'クルーザー', 'クルージング', '船'],
    ko: ['요트', '보트', '크루즈', '선박']
  },

  '/rentals': {
    ru: ['машин*', 'авто', 'автомобил*', 'аренда авто', 'прокат авто', 'внедорожник', 'кабриолет', 'водител*', 'шофёр', 'лимузин*'],
    uk: ['машин*', 'авто', 'автомобіл*', 'оренда авто', 'прокат авто', 'водій', 'лімузин*'],
    es: ['coche*', 'auto', 'autos', 'carro*', 'vehículo*', 'alquiler de coches', 'alquiler de autos', 'chófer', 'chofer', 'limusina*', 'descapotable'],
    pt: ['carro*', 'automóvel', 'veículo*', 'aluguel de carros', 'aluguer de carros', 'motorista', 'limusine*'],
    de: ['auto', 'autos', 'wagen', 'mietwagen', 'fahrzeug*', 'chauffeur*', 'limousine*', 'cabrio*'],
    fr: ['voiture*', 'auto', 'véhicule*', 'location de voiture', 'chauffeur*', 'limousine*', 'cabriolet*'],
    it: ['auto', 'automobile*', 'macchina', 'macchine', 'noleggio auto', 'autista', 'limousine*', 'cabrio*'],
    pl: ['samochód', 'samochody', 'samochodu', 'auto', 'auta', 'wynajem samochodu', 'kierowc*', 'limuzyn*'],
    tr: ['araba', 'arabalar', 'araç', 'araçlar', 'araba kiralama', 'şoför', 'limuzin'],
    he: ['רכב', 'מכונית', 'מכוניות', 'השכרת רכב', 'נהג', 'לימוזינה'],
    ar: ['سيارة', 'سيارات', 'تأجير سيارات', 'سائق', 'ليموزين'],
    fa: ['خودرو', 'ماشین', 'اجاره خودرو', 'راننده', 'لیموزین'],
    zh: ['租车', '汽车', '轿车', '跑车', '司机', '豪车'],
    ja: ['レンタカー', '車', 'クルマ', 'スポーツカー', '運転手', 'リムジン'],
    ko: ['렌터카', '자동차', '차량', '스포츠카', '기사', '리무진']
  },

  '/restaurants-nightlife': {
    ru: ['ресторан*', 'ужин', 'обед', 'поесть', 'еда', 'кухн*', 'шеф', 'стейк*', 'суши', 'мишлен*', 'бар', 'бары', 'клуб', 'клубы', 'ночн*', 'коктейл*', 'столик'],
    uk: ['ресторан*', 'вечер*', 'їжа', 'кухн*', 'мішлен*', 'бар', 'клуб', 'нічн*', 'столик'],
    es: ['restaurante*', 'cena', 'cenar', 'comida', 'comer', 'cocina', 'chef', 'sushi', 'michelin', 'bar', 'bares', 'discoteca*', 'club', 'clubes', 'cóctel*', 'mesa'],
    pt: ['restaurante*', 'jantar', 'comida', 'comer', 'cozinha', 'chef', 'sushi', 'michelin', 'bar', 'bares', 'balada*', 'boate*', 'mesa'],
    de: ['restaurant*', 'essen', 'abendessen', 'küche', 'koch', 'sushi', 'michelin', 'bar', 'bars', 'club', 'clubs', 'nachtleben', 'tisch'],
    fr: ['restaurant*', 'dîner', 'diner', 'manger', 'cuisine', 'chef', 'sushi', 'michelin', 'bar', 'bars', 'boîte de nuit', 'club', 'table'],
    it: ['ristorante', 'ristoranti', 'cena', 'cenare', 'mangiare', 'cucina', 'chef', 'sushi', 'michelin', 'bar', 'discoteca', 'tavolo'],
    pl: ['restauracj*', 'kolacj*', 'jedzenie', 'kuchni*', 'szef kuchni', 'sushi', 'michelin', 'bar', 'klub', 'kluby', 'stolik'],
    tr: ['restoran*', 'akşam yemeği', 'yemek', 'mutfak', 'şef', 'suşi', 'michelin', 'bar', 'kulüp', 'gece hayatı', 'masa'],
    he: ['מסעדה', 'מסעדות', 'ארוחה', 'ארוחת ערב', 'אוכל', 'שף', 'סושי', 'מישלן', 'בר', 'מועדון', 'חיי לילה', 'שולחן'],
    ar: ['مطعم', 'مطاعم', 'عشاء', 'طعام', 'مأكولات', 'شيف', 'سوشي', 'ميشلان', 'بار', 'نادي ليلي', 'حياة ليلية', 'طاولة'],
    fa: ['رستوران', 'شام', 'غذا', 'آشپزی', 'سوشی', 'میشلن', 'بار', 'کلاب', 'میز'],
    zh: ['餐厅', '餐廳', '晚餐', '吃饭', '美食', '料理', '主厨', '寿司', '米其林', '酒吧', '夜生活', '夜店', '订位', '订桌'],
    ja: ['レストラン', 'ディナー', '食事', '料理', 'シェフ', '寿司', 'ミシュラン', 'バー', 'ナイトライフ', 'クラブ', '予約', '席'],
    ko: ['레스토랑', '식당', '저녁', '식사', '요리', '셰프', '초밥', '미슐랭', '바', '나이트라이프', '클럽', '예약', '테이블']
  },

  '/vacation-rentals': {
    ru: ['вилл*', 'апартамент*', 'жиль*', 'прожива*', 'особняк', 'пентхаус', 'резиденци*', 'где остановиться', 'снять дом'],
    uk: ['віл*', 'апартамент*', 'житло', 'особняк', 'пентхаус', 'де зупинитися'],
    es: ['villa*', 'apartamento*', 'alojamiento', 'mansión', 'ático', 'penthouse', 'residencia*', 'dónde alojarse', 'casa de playa'],
    pt: ['vila', 'vilas', 'apartamento*', 'hospedagem', 'mansão', 'cobertura', 'residência*', 'onde ficar'],
    de: ['villa', 'villen', 'apartment*', 'wohnung*', 'unterkunft', 'penthouse', 'residenz*', 'ferienhaus'],
    fr: ['villa*', 'appartement*', 'hébergement', 'manoir', 'penthouse', 'résidence*', 'où loger', 'maison de plage'],
    it: ['villa', 'ville', 'appartamento', 'appartamenti', 'alloggio', 'attico', 'residenza', 'dove alloggiare'],
    pl: ['willa', 'wille', 'willi', 'willę', 'willą', 'apartament*', 'zakwaterowanie', 'rezydencj*', 'gdzie się zatrzymać'],
    tr: ['villa', 'villalar', 'daire', 'konaklama', 'malikâne', 'çatı katı', 'nerede kalınır'],
    he: ['וילה', 'וילות', 'דירה', 'דירות', 'לינה', 'אירוח', 'פנטהאוז'],
    ar: ['فيلا', 'فلل', 'شقة', 'شقق', 'إقامة', 'سكن', 'بنتهاوس'],
    fa: ['ویلا', 'آپارتمان', 'اقامتگاه', 'محل اقامت', 'پنت هاوس'],
    zh: ['别墅', '別墅', '公寓', '住宿', '民宿', '顶层公寓', '住哪里'],
    ja: ['ヴィラ', 'ビラ', '別荘', 'アパートメント', '宿泊', 'ペントハウス', '滞在'],
    ko: ['빌라', '별장', '아파트', '숙박', '숙소', '펜트하우스']
  },

  '/travel': {
    ru: ['путешеств*', 'поездк*', 'поехать', 'полёт', 'полет', 'перелёт', 'рейс', 'билет на самолёт', 'отел*', 'гостиниц*', 'курорт', 'выходны*', 'отпуск', 'маршрут', 'майами'],
    uk: ['подорож*', 'поїздк*', 'переліт', 'рейс', 'готел*', 'курорт', 'вихідн*', 'відпустк*', 'маямі'],
    es: ['viaje*', 'viajar', 'vuelo*', 'volar', 'hotel*', 'resort*', 'fin de semana', 'vacacion*', 'itinerario', 'escapada', 'miami'],
    pt: ['viagem', 'viagens', 'viajar', 'voo', 'voos', 'hotel', 'hotéis', 'resort*', 'fim de semana', 'férias', 'roteiro', 'miami'],
    de: ['reise*', 'reisen', 'flug', 'flüge', 'fliegen', 'hotel*', 'resort*', 'wochenende', 'urlaub', 'reiseplan', 'miami'],
    fr: ['voyage*', 'voyager', 'vol', 'vols', 'hôtel*', 'hotel*', 'week-end', 'vacances', 'itinéraire', 'escapade', 'miami'],
    it: ['viaggio', 'viaggi', 'viaggiare', 'volo', 'voli', 'hotel', 'albergo', 'weekend', 'vacanz*', 'itinerario', 'miami'],
    pl: ['podróż*', 'wyjazd*', 'lot', 'loty', 'hotel*', 'weekend', 'wakacj*', 'urlop', 'miami'],
    tr: ['seyahat', 'gezi', 'uçuş', 'uçak bileti', 'otel', 'oteller', 'tatil', 'hafta sonu', 'miami'],
    he: ['טיול', 'נסיעה', 'טיסה', 'טיסות', 'מלון', 'מלונות', 'חופשה', 'סוף שבוע', 'מיאמי'],
    ar: ['سفر', 'رحلة', 'رحلات', 'طيران', 'رحلة طيران', 'فندق', 'فنادق', 'منتجع', 'عطلة', 'نهاية الأسبوع', 'ميامي'],
    fa: ['سفر', 'پرواز', 'هتل', 'تعطیلات', 'آخر هفته', 'میامی'],
    zh: ['旅行', '旅游', '旅遊', '航班', '机票', '酒店', '飯店', '度假', '周末', '迈阿密', '邁阿密'],
    ja: ['旅行', 'フライト', '航空券', 'ホテル', 'リゾート', '週末', '休暇', 'マイアミ'],
    ko: ['여행', '항공편', '항공권', '호텔', '리조트', '주말', '휴가', '마이애미']
  },

  '/events': {
    ru: ['событи*', 'мероприяти*', 'концерт*', 'билет*', 'шоу', 'фестивал*', 'выступлени*', 'вип', 'спортивн*', 'футбол*', 'баскетбол*', 'хоккей*', 'бейсбол*', 'теннис*', 'бокс', 'матч*', 'стендап*', 'комеди*', 'театр*', 'опер*', 'формула 1', 'интер майами', 'майами хит', 'нфл', 'нба', 'нхл', 'млс', 'юфс'],
    uk: ['поді*', 'захід', 'концерт*', 'квитк*', 'шоу', 'фестивал*', 'спортивн*', 'футбол*', 'баскетбол*', 'хокей*', 'теніс*', 'бокс', 'матч*', 'стендап*', 'театр*', 'опер*'],
    es: ['evento*', 'concierto*', 'entrada*', 'boleto*', 'espectáculo*', 'festival*', 'vip', 'deporte*', 'fútbol', 'futbol', 'baloncesto', 'hockey', 'béisbol', 'tenis', 'boxeo', 'partido*', 'comedia', 'teatro', 'ópera', 'fórmula 1'],
    pt: ['evento*', 'concerto*', 'show', 'shows', 'ingresso*', 'bilhete*', 'festival*', 'vip', 'esporte*', 'desporto*', 'futebol', 'basquete*', 'hóquei', 'tênis', 'ténis', 'boxe', 'jogo*', 'comédia', 'teatro', 'ópera', 'fórmula 1'],
    de: ['veranstaltung*', 'event*', 'konzert*', 'ticket*', 'karten', 'show', 'festival*', 'vip', 'fußball', 'fussball', 'basketball', 'eishockey', 'tennis', 'boxen', 'komödie', 'theater', 'oper', 'formel 1'],
    fr: ['événement*', 'evenement*', 'concert*', 'billet*', 'spectacle*', 'festival*', 'vip', 'football', 'basket*', 'hockey', 'tennis', 'boxe', 'match*', 'comédie', 'théâtre', 'opéra', 'formule 1'],
    it: ['evento', 'eventi', 'concerto', 'concerti', 'biglietto', 'biglietti', 'spettacolo', 'festival', 'vip', 'calcio', 'basket', 'pallacanestro', 'hockey', 'tennis', 'pugilato', 'boxe', 'partita', 'commedia', 'teatro', 'opera', 'formula 1'],
    pl: ['wydarzeni*', 'koncert*', 'bilet*', 'festiwal*', 'vip', 'piłka nożna', 'pilka nozna', 'futbol', 'koszykówk*', 'hokej*', 'tenis*', 'boks', 'mecz*', 'komedi*', 'teatr*', 'oper*'],
    tr: ['etkinlik*', 'konser*', 'bilet*', 'gösteri', 'festival*', 'vip', 'spor', 'futbol', 'basketbol', 'hokey', 'tenis', 'boks', 'maç*', 'komedi', 'tiyatro', 'opera'],
    he: ['אירוע', 'אירועים', 'הופעה', 'הופעות', 'כרטיס', 'כרטיסים', 'פסטיבל', 'וי איי פי', 'ספורט', 'כדורגל', 'פוטבול', 'כדורסל', 'הוקי', 'טניס', 'אגרוף', 'משחק', 'סטנדאפ', 'תיאטרון', 'אופרה'],
    ar: ['فعالية', 'فعاليات', 'حفلة', 'حفلات', 'تذكرة', 'تذاكر', 'مهرجان', 'عرض', 'رياضة', 'كرة القدم', 'كرة السلة', 'هوكي', 'تنس', 'ملاكمة', 'مباراة', 'كوميديا', 'مسرح', 'أوبرا'],
    fa: ['رویداد', 'کنسرت', 'بلیط', 'جشنواره', 'نمایش', 'ورزش', 'فوتبال', 'بسکتبال', 'هاکی', 'تنیس', 'بوکس', 'مسابقه', 'کمدی', 'تئاتر', 'اپرا'],
    zh: ['活动', '活動', '演唱会', '音乐会', '门票', '票', '演出', '节日', '体育', '足球', '篮球', '冰球', '网球', '拳击', '比赛', '脱口秀', '音乐剧', '歌剧'],
    ja: ['イベント', 'コンサート', 'ライブ', 'チケット', 'フェス', '公演', 'スポーツ', 'サッカー', 'フットボール', 'バスケットボール', 'ホッケー', 'テニス', 'ボクシング', '試合', 'コメディ', 'ミュージカル', 'オペラ'],
    ko: ['이벤트', '콘서트', '공연', '티켓', '페스티벌', '스포츠', '축구', '미식축구', '농구', '하키', '테니스', '복싱', '경기', '코미디', '뮤지컬', '오페라']
  },

  '/experiences': {
    ru: ['впечатлени*', 'приключени*', 'экскурси*', 'активност*', 'адреналин*', 'парашют*', 'вертолёт*', 'вертолет*', 'гидроцикл*', 'чем заняться', 'парк аттракционов', 'аквапарк*', 'кей вест', 'эверглейдс', 'аэролодк*', 'зоопарк*', 'квадроцикл*', 'каяк*', 'дисней', 'юниверсал', 'американские горки'],
    uk: ['враження', 'пригод*', 'екскурсі*', 'адреналін*', 'вертоліт', 'чим зайнятися', 'парк атракціонів', 'аквапарк*', 'кей вест', 'еверглейдс', 'зоопарк*'],
    es: ['experiencia*', 'aventura*', 'excursión', 'excursiones', 'actividad*', 'adrenalina', 'paracaidismo', 'helicóptero', 'moto acuática', 'qué hacer', 'parque temático', 'parque acuático', 'key west', 'everglades', 'kayak'],
    pt: ['experiência*', 'aventura*', 'excursão', 'passeio*', 'atividade*', 'adrenalina', 'paraquedismo', 'helicóptero', 'o que fazer', 'parque temático', 'parque aquático', 'key west', 'everglades', 'caiaque'],
    de: ['erlebnis*', 'abenteuer*', 'ausflug', 'ausflüge', 'aktivität*', 'adrenalin', 'fallschirm*', 'hubschrauber*', 'jetski', 'freizeitpark*', 'wasserpark*', 'key west', 'everglades', 'kajak'],
    fr: ['expérience*', 'aventure*', 'excursion*', 'activité*', 'adrénaline', 'parachute', 'hélicoptère', 'jet ski', 'que faire', 'parc d attractions', 'parc aquatique', 'key west', 'everglades', 'kayak'],
    it: ['esperienz*', 'avventur*', 'escursion*', 'attività', 'adrenalina', 'paracadutismo', 'elicottero', 'cosa fare', 'parco divertimenti', 'parco acquatico', 'key west', 'everglades', 'kayak'],
    pl: ['doświadczeni*', 'przygod*', 'wycieczk*', 'atrakcj*', 'adrenalin*', 'spadochron*', 'helikopter*', 'park rozrywki', 'aquapark*', 'key west', 'everglades', 'kajak*'],
    tr: ['deneyim*', 'macera*', 'gezi', 'aktivite*', 'adrenalin', 'paraşüt', 'helikopter', 'jet ski', 'tema park', 'su parkı', 'key west', 'everglades'],
    he: ['חוויה', 'חוויות', 'הרפתקה', 'טיול', 'פעילות', 'אדרנלין', 'צניחה', 'מסוק', 'פארק שעשועים', 'פארק מים', 'קי ווסט', 'אוורגליידס'],
    ar: ['تجربة', 'تجارب', 'مغامرة', 'مغامرات', 'رحلة', 'نشاط', 'أنشطة', 'أدرينالين', 'قفز مظلي', 'هليكوبتر', 'مدينة ملاهي', 'حديقة مائية', 'كي ويست', 'إيفرغليدز'],
    fa: ['تجربه', 'ماجراجویی', 'تور', 'فعالیت', 'آدرنالین', 'هلیکوپتر', 'شهربازی', 'پارک آبی', 'کی وست', 'اورگلیدز'],
    zh: ['体验', '體驗', '冒险', '探险', '活动项目', '跳伞', '直升机', '摩托艇', '玩什么', '主题公园', '水上乐园', '迪士尼', '环球影城', '大沼泽地', '基韦斯特'],
    ja: ['体験', 'アクティビティ', '冒険', 'スカイダイビング', 'ヘリコプター', 'ジェットスキー', 'テーマパーク', 'ウォーターパーク', 'ディズニー', 'ユニバーサル', 'エバーグレーズ', 'キーウェスト'],
    ko: ['체험', '액티비티', '모험', '스카이다이빙', '헬리콥터', '제트스키', '할 것', '테마파크', '워터파크', '디즈니', '유니버설', '에버글레이즈', '키웨스트']
  }
};
