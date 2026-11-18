// Compositional intent. Exact keywords stay in lib/aiSuggestions.js. This layer
// catches paraphrases ("fly my own plane", "свой борт", "jet") and brand names
// guests actually type. It never invents a route: every href is a real page.
const norm = value => String(value ?? '').normalize('NFKC').toLowerCase();

const RULES = [
  {
    href: '/private-jets',
    weight: 6,
    test(text) {
      if (/jet[\s-]*ski|jetski|гидроцикл|moto de agua|moto acuática|moto aquática|джет[\s-]*ски/iu.test(text)) return false;
      if (/авиабилет|airline ticket|plane ticket|commercial flight|scheduled flight|эконом[\p{L}]*\s+класс|regular flight|рейс авиакомпан/iu.test(text)) return false;
      if (/\b(?:private|personal|charter|business)\b[\s\S]{0,40}\b(?:jet|plane|aircraft|flight)\b/iu.test(text)) return true;
      if (/\b(?:jet|plane|aircraft)\b[\s\S]{0,40}\b(?:charter|private)\b/iu.test(text)) return true;
      if (/\bfly\b[\s\S]{0,48}\b(?:own|my|our|private)\b[\s\S]{0,24}\b(?:plane|jet|aircraft)\b/iu.test(text)) return true;
      if (/\bown plane\b|\bmy plane\b|\bour plane\b|\bempty leg\b|\bbusiness aviation\b|\bfly private\b/iu.test(text)) return true;
      if (/privat\p{L}*\s+jet/iu.test(text)) return true;
      if (/(?:^|[^\p{L}\p{N}])(?:jets?|джет(?:а|у|ом|е|ы|ов|ам|ами|ах)?)(?![\p{L}\p{N}])/iu.test(text)
        && !/\b(?:new york|ny|winnipeg)\s+jets\b|\bjet\s+(?:lag|engine|fuel)\b/iu.test(text)) return true;
      if (/свой борт|частн\p{L}*\s+борт|частн\p{L}*\s+самол|самол[её]т до|заказать борт|аренда самол|чартер самол|на своём самол|на своем самол|приватн\p{L}*\s+літак|літак до|jet privé|vol privé|avion privé|jet privado|avión privado|avião particular|jato particular|privatjet|privatflug|eigenes flugzeug|eigenen jet|özel jet|özel uçak|kiralık uçak|מטוס פרטי|טיסה פרטית|طائرة خاصة|طائرة خاصة|جت خاص|جت خصوصی|هواپیمای خصوصی|私人飞机|私人飛機|包机|包機|プライベートジェット|自家用機|전용기|프라이빗 제트|private odrzutowiec|własnym samolotem|noleggio jet|aereo privato/iu.test(text)) return true;
      if (/самол[её]т|літак|طائرة|מטוס|飞机|飛機|ジェット|비행기|전세기|제트기|uçak|avion|aereo|flugzeug|samolot|odrzutow/iu.test(text) && /частн|свой|борт|арен|чартер|приват|خاص|פרטי|私人|프라이빗|전세|개인|özel|privé|privado|privat|prywatn|czarter|wynaj/iu.test(text)) return true;
      return false;
    }
  },
  {
    href: '/yachts',
    weight: 5,
    test(text) {
      return /yacht|yachts|superyacht|catamaran|sailboat|on the water|day on the water|яхт|катер|лодк|катамаран|на воде|יכט|יאכט|يخت|يخوت|قایق|یخت|游艇|快艇|ヨット|요트|yate|barco|iate|boot|bateau|barca|jacht|tekne|סירה|قارب/iu.test(text);
    }
  },
  {
    href: '/rentals',
    weight: 5,
    test(text) {
      return /supercar|sports car|sportwagen|exotic car|rent(?:al)? a car|car rental|chauffeur|limousine|\bsuv\b|lamborghini|ferrari|porsche|bentley|rolls[\s-]*royce|mclaren|bugatti|maserati|aston martin|range rover|corvette|urus|huracan|huracán|aventador|cullinan|bentayga|ламборг|ламбордж|урус|феррар|порш|бентли|роллс|макларен|мазерат|астон|рендж|корвет|мустанг|ламборг|урус|феррар|порше|بنتلي|لامبورغ|أوروس|فيراري|بورش|لامبورگ|اوروس|فراری|پورشه|למבורגיני|אורוס|פרארי|פורשה|兰博基尼|乌鲁斯|法拉利|保时捷|ランボルギーニ|ウルス|フェラーリ|ポルシェ|람보르기니|우루스|페라리|포르쉐|аренда авто|прокат авто|нужна машина|хочу машину|внедорожник|кабриолет|تأجير سيارة|سيارة فاخرة|השכרת רכב|מכונית|租车|豪车|レンタカー|스포츠카|렌터카/iu.test(text);
    }
  },
  {
    href: '/restaurants-nightlife',
    weight: 5,
    test(text) {
      return /restaurant|steakhouse|omakase|\bdinner\b|\blunch\b|\bbrunch\b|nightclub|night club|nightlife|bottle service|guest list|ресторан|ужин|ночн\p{L}*\s+клуб|клуб\b|бар\b|столик|مطعم|عشاء|نادي ليلي|حياة ليلية|رستوران|شام|מסעדה|ארוחת ערב|מועדון|餐厅|晚餐|夜店|レストラン|ディナー|クラブ|레스토랑|저녁|나이트/iu.test(text);
    }
  },
  {
    href: '/vacation-rentals',
    weight: 5,
    test(text) {
      return /\bvilla\b|villas|penthouse|vacation rental|where to stay|place to stay|вилл|пентхаус|особняк|где остановиться|فيلا|فلل|ویلا|וילה|פנטהאוז|别墅|ヴィラ|빌라|별장/iu.test(text);
    }
  },
  {
    href: '/entertainment/adrenaline-365',
    weight: 6,
    test(text) {
      return /adrenaline[\s-]*365|адреналин[\s-]*365|أدرينالين 365/iu.test(text);
    }
  },
  {
    href: '/experiences',
    weight: 4,
    test(text) {
      if (/adrenaline[\s-]*365/iu.test(text)) return false;
      return /skydiv|jet[\s-]*ski|jetski|helicopter tour|airboat|everglades|parasail|things to do|what to do|чем заняться|что посмотреть|прыжок с парашют|гидроцикл|вертол[её]тн\p{L}*\s+экскурс|قفز مظلي|هليكوبتر|ماذا نفعل|تجربة|مغامرة|צניחה|מסוק|跳伞|直升机|スカイダイブ|ヘリコプター|스카이다이빙|헬리콥터|skydive|paracaidismo|hélicoptère|hubschrauber/iu.test(text);
    }
  },
  {
    href: '/events',
    weight: 5,
    test(text) {
      return /concert|festival|comedy show|\btickets?\b|live music|heat tickets|билеты на|концерт|фестивал|квитки|تذكرة|حفل|بلیط کنسرت|כרטיס|הופעה|演唱会|门票|コンサート|チケット|콘서트|티켓|concierto|entradas|ingresso|konzert|karten|spectacle|billet/iu.test(text);
    }
  },
  {
    href: '/travel',
    weight: 4,
    test(text) {
      if (/\b(?:private|personal)\b[\s\S]{0,40}\b(?:jet|plane|aircraft)\b/iu.test(text)) return false;
      if (/свой борт|частн\p{L}*\s+самол|jet privé|jet privado|privatjet/iu.test(text)) return false;
      return /авиабилет|airline ticket|plane ticket|commercial flight|find flights|book a flight|cheap flight|city break|\bhotel\b|отель|гостиниц|فندق|هتل|מלון|酒店|ホテル|호텔|hotel\b|fin de semana en |wochenende in |vacation in |отпуск в |курорт/iu.test(text);
    }
  },
  {
    href: '/discovery',
    weight: 4,
    test(text) {
      return /discovery room|open discovery|show me everything|what can you do|комната открытий|что ты умеешь|غرفة الاكتشاف|ماذا تستطيع|اتاق کشف|חדר הגילוי|探索室|ディスカバリー|디스커버리 룸|sala de descubrimiento|salle de découverte/iu.test(text);
    }
  }
];

/** @returns {Array<{href:string,weight:number}>} */
export function lexiconHits(raw) {
  const text = norm(raw);
  if (!text) return [];
  const hits = [];
  for (const rule of RULES) {
    try {
      if (rule.test(text)) hits.push({ href: rule.href, weight: rule.weight });
    } catch { /* a bad phrase must not take the matcher down */ }
  }
  return hits;
}

export const LEXICON_ROUTES = [...new Set(RULES.map(rule => rule.href))];

const EXTRA = {
  '/entertainment/adrenaline-365': {
    href: '/entertainment/adrenaline-365',
    label: 'Adrenaline 365',
    title: 'Adrenaline 365',
    summary: 'Skydiving, helicopter flights and other booked adventures.',
    cta: 'See adventures',
    keywords: [],
    patterns: []
  }
};

export function extraSection(href) {
  return EXTRA[href] || null;
}
