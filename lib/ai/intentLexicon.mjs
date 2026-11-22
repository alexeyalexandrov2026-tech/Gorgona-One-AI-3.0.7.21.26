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
      return /supercar|sports car|voiture de sport|sportwagen|exotic car|rent(?:al)? a car|car rental|chauffeur|limousine|\bsuv\b|lamborghini|ferrari|porsche|bentley|rolls[\s-]*royce|mclaren|maybach|bugatti|maserati|aston martin|range rover|corvette|escalade|\bg63\b|\bg[\s-]?class\b|g[\s-]?wagon|urus|huracan|huracán|aventador|cullinan|bentayga|ламборг|ламбордж|урус|уракан|авентадор|феррар|порш|бентли|роллс|куллинан|макларен|майбах|мазерат|астон|рендж|корвет|мустанг|эскалейд|гелендваген|гелик|мерседес|бмв|بنتلي|لامبورغ|أوروس|فيراري|بورش|لامبورگ|اوروس|فراری|پورشه|למבורגיני|אורוס|פרארי|פורשה|兰博基尼|乌鲁斯|法拉利|保时捷|ランボルギーニ|ウルス|フェラーリ|ポルシェ|람보르기니|우루스|페라리|포르쉐|аренда авто|прокат авто|нужна машина|хочу машину|внедорожник|кабриолет|суперкар|спорткар|تأجير سيارة|سيارة فاخرة|השכרת רכב|מכונית|租车|豪车|レンタカー|스포츠카|렌터카/iu.test(text);
    }
  },
  {
    href: '/restaurants-nightlife',
    weight: 5,
    test(text) {
      return /restaurant|steakhouse|omakase|michelin|\bdinner\b|\blunch\b|\bbrunch\b|nightclub|night club|nightlife|bottle service|guest list|anniversary|honeymoon|date night|bachelor party|bachelorette|ресторан|мишлен|ужин|ночн\p{L}*\s+клуб|клуб\b|бар\b|столик|годовщин\p{L}*|медов\p{L}*\s+месяц|свидани\p{L}*|романтическ\p{L}*\s+(?:ужин|вечер)|мальчишник|девичник|aniversario|مطعم|عشاء|نادي ليلي|حياة ليلية|ميشلان|رستوران|شام|מסעדה|ארוחת ערב|מועדון|מישלן|餐厅|晚餐|夜店|米其林|レストラン|ディナー|クラブ|ミシュラン|레스토랑|저녁|나이트|미슐랭/iu.test(text);
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
    href: '/experiences',
    weight: 4,
    test(text) {
      return /skydiv|jet[\s-]*ski|jetski|helicopter|airboat|everglades|parasail|key west|theme park|water ?park|roller coaster|universal studios|disney world|magic kingdom|seaworld|busch gardens|legoland|wynwood walls|zoo miami|things to do|what to do|with kids|with children|for kids|чем заняться|что посмотреть|куда пойти с детьми|с детьми|для детей|прыжок с парашют|гидроцикл|вертол[её]т|аэролодк|эверглейдс|кей вест|парк аттракционов|аквапарк|قفز مظلي|هليكوبتر|ماذا نفعل|تجربة|مغامرة|צניחה|מסוק|跳伞|直升机|主题公园|スカイダイブ|ヘリコプター|テーマパーク|스카이다이빙|헬리콥터|테마파크|skydive|paracaidismo|hélicoptère|hubschrauber/iu.test(text);
    }
  },
  {
    href: '/events',
    weight: 5,
    test(text) {
      return /concert|festival|comedy show|stand[\s-]?up|\btickets?\b|live music|heat tickets|inter miami|miami heat|miami dolphins|florida panthers|miami marlins|miami open|\b(?:nfl|mls|nba|nhl|mlb|ufc|f1|formula\s*1|nascar|football|soccer|basketball|hockey|baseball|tennis|boxing|broadway|opera|lakers|celtics|warriors|knicks|bulls|bucks|mavericks|nuggets|thunder|bills|patriots|chiefs|cowboys|eagles|rangers|bruins|lightning|yankees|dodgers|mets)\b|билеты на|концерт|фестивал|футбол|баскетбол|хоккей|теннис|бокс|стендап|театр|опера|матч|формула\s*1|интер майами|майами хит|лейкерс|селтикс|уорриор[зс]|никс|булл[зс]|билл[зс]|пэтриотс|чифс|рейнджерс|янки[зс]|квитки|афиш\p{L}*|мероприят\p{L}*|событи\p{L}*|\bшоу\b|куда сходить|что будет|what(?:'s|\s+is)\s+(?:on|happening)|upcoming events|cartelera|تذكرة|حفل|كرة القدم|مباراة|بلیط کنسرت|فوتبال|כרטיס|הופעה|כדורגל|כדורסל|演唱会|门票|足球|篮球|コンサート|チケット|サッカー|콘서트|티켓|축구|농구|concierto|fútbol|entradas|ingresso|futebol|konzert|fußball|karten|spectacle|billet|calcio|piłka nożna/iu.test(text);
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

const EXTRA = {};

export function extraSection(href) {
  return EXTRA[href] || null;
}
