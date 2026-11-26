// ===========================================================================
// Semantic Vibe & Archetype Brain + Auto-Language Intelligence.
//
// 1. detectMessageLocale(text, fallbackLocale): identifies the language the
//    guest actually wrote in across all 16 supported languages so v3 Grounded
//    NLG replies seamlessly in the guest's language even if the UI switcher
//    is set to another language.
// 2. detectSemanticVibes(text): translates luxury metaphors, moods, and
//    high-value hospitality scenarios ("Miami Vice", "investor negotiations",
//    "unforgettable proposal", "St-Tropez vibe", "old money") into concrete
//    Miami search terms and curated concierge context.
// ===========================================================================

import { normalizeLocale } from './locale.js';

const LATIN_DETECTORS = [
  ['en', /\b(?:i\s+(?:want|need|would\s+like)|looking\s+for|can\s+you|could\s+you|please|recommend|suggest|dinner|rental|tickets|tonight|tomorrow|guests|people|with\s+kids|in\s+miami|hello|thanks)\b/iu],
  ['es', /\b(?:quiero|necesito|busco|restaurante|cena|yate|alquilar|entradas|playa|para\s+\d+|con\s+niños|en\s+miami|hola|gracias)\b|[¿¡ñ]/iu],
  ['fr', /\b(?:je\s+(?:veux|voudrais|cherche)|dîner|voiture|bateau|plage|billets|pour\s+\d+|avec\s+enfants|merci|bonjour)\b/iu],
  ['de', /\b(?:ich\s+(?:möchte|suche|brauche)|abendessen|mieten|boot|strand|wetter|für\s+\d+|mit\s+kindern|danke|hallo)\b|[äöüß]/iu],
  ['it', /\b(?:vorrei|cerco|ristorante|cena|noleggio|spiaggia|biglietti|per\s+\d+|con\s+bambini|grazie|ciao)\b/iu],
  ['pt', /\b(?:quero|preciso|procuro|jantar|alugar|praia|passeio|ingressos|para\s+\d+|com\s+crianças|obrigado|olá)\b|[ãõç]/iu],
  ['pl', /\b(?:chcę|szukam|potrzebuję|kolacja|samochód|jacht|plaża|bilety|dla\s+\d+|z\s+dziećmi|dziękuję|cześć)\b|[ąćęłńóśźż]/iu],
  ['tr', /\b(?:istiyorum|arıyorum|akşam|yemek|tekne|araç|plaj|bilet|kişilik|merhaba|teşekkür)\b|[ğışçöü]/iu]
];

/**
 * Detect the guest's active message language (from our 16 supported locales),
 * falling back to `fallbackLocale` when the text is short or ambiguous.
 */
export function detectMessageLocale(text, fallbackLocale = 'en') {
  const raw = String(text || '').trim();
  const fallback = normalizeLocale(fallbackLocale);
  if (!raw) return fallback;

  // Non-Latin scripts are unmistakable even in short phrases; preserve shared-script UI locales (uk, fa, ja).
  if (/[\u0400-\u04ff]/.test(raw)) {
    if (/[іїєґ]/i.test(raw)) return 'uk';
    return fallback === 'uk' ? 'uk' : 'ru';
  }
  if (/[\u0590-\u05ff]/.test(raw)) return 'he';
  if (/[\u0600-\u06ff]/.test(raw)) {
    if (/[پچژگیک]/.test(raw)) return 'fa';
    return fallback === 'fa' ? 'fa' : 'ar';
  }
  if (/[\u3040-\u30ff]/.test(raw)) return 'ja';
  if (/[\uac00-\ud7af]/.test(raw)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(raw)) return fallback === 'ja' ? 'ja' : 'zh';

  // Latin-script languages: require enough signal so English brand/venue names never misfire
  if (raw.length >= 12) {
    let best = null;
    let bestHits = 0;
    for (const [code, pattern] of LATIN_DETECTORS) {
      const matches = raw.match(new RegExp(pattern.source, 'giu'));
      const hits = matches ? matches.length : 0;
      if (hits >= 2 && hits > bestHits) {
        bestHits = hits;
        best = code;
      }
    }
    if (best) return best;
  }

  return fallback;
}

const VIBE_ARCHETYPES = [
  {
    id: 'executive-car',
    pattern: /(?<![\p{L}\p{N}])(?:executive\s+(?:car|sedan|suv|ride)|chauffeur[\s-]*grade|discrete\s+(?:car|ride)|quiet\s+(?:car|luxury\s+car|ride)|business\s+(?:car|suv|sedan|meeting\s+car)|for\s+(?:investor|client)\s+meeting|тих\p{L}*\s+(?:красив\p{L}*\s+)?(?:машин\p{L}*|авто\p{L}*)|представительск\p{L}*\s+(?:авто\p{L}*|машин\p{L}*)|для\s+встреч\p{L}*\s+с\s+инвестор\p{L}*|машин\p{L}*\s+без\s+пафос\p{L}*|бизнес[\s-]*(?:авто\p{L}*|седан\p{L}*|машин\p{L}*)|представницьк\p{L}*\s+авто\p{L}*|coche\s+ejecutivo|voiture\s+de\s+direction|geschäftswagen|auto\s+di\s+rappresentanza|carro\s+executivo|auto\s+biznesowe|makam\s+aracı|רכב\s+מנהלים|سيارة\s+فخمة\s+للأعمال|خودرو\s+تشریفاتی)(?![\p{L}\p{N}])|商务豪车|低调豪车|高級セダン|ビジネスカー|비즈니스\s*차량/iu,
    boost: 'Rolls-Royce Ghost Mercedes-Maybach S680 Bentley Flying Spur Range Rover S580',
    tags: ['rolls-royce', 'ghost', 'maybach', 'bentley', 'range rover', 's580', 's680', 'sedan', 'executive'],
    note: 'Executive/discreet vehicle intent: lead with refined, hushed cabin comfort (Rolls-Royce Ghost, Mercedes-Maybach, Bentley, Range Rover, S-Class) rather than loud track supercars.'
  },
  {
    id: 'executive-quiet',
    pattern: /(?<![\p{L}\p{N}])(?:investor\p{L}*|boardroom|negotiation\p{L}*|quiet\s+(?:dining|dinner|restaurant|place|spot)|private\s+(?:room|dining)|business\s+dinner|deal\s+dinner|переговор\p{L}*|инвестор\p{L}*|тихо\p{L}*\s+мест|без\s+громк\p{L}*\s+музык|приватн\p{L}*\s+комнат|делов\p{L}*\s+ужин|ділов\p{L}*\s+вечер|negocios|cena\s+de\s+negocios|réunion\s+d'affaires|geschäftsessen|cena\s+di\s+lavoro|jantar\s+de\s+negócios|kolacja\s+biznesowa|iş\s+yemeği|פגישת\s+עסקים|عشاء\s+عمل|شام\s+کاری)(?![\p{L}\p{N}])|商务晚餐|投资人|会食|비즈니스\s*디너/iu,
    boost: 'LPM Carbone Cote Nuna Maybach Rolls-Royce Bentley',
    tags: ['lpm', 'carbone', 'cote', 'private', 'quiet', 'brickell', 'maybach', 'rolls-royce', 'bentley'],
    note: 'Executive/quiet-talk vibe: prioritize refined, conversation-friendly rooms (LPM, Carbone, Cote, Nuna; ask venue about private dining) and chauffeur-grade sedans (Rolls-Royce/Maybach/Bentley).'
  },
  {
    id: 'proposal-unforgettable',
    pattern: /(?<![\p{L}\p{N}])(?:proposal|propose|engagement|pop\s+the\s+question|once\s+in\s+a\s+lifetime|breathtaking|unforgettable|предложени\p{L}*\s+рук|помолвк|пропозиці\p{L}*\s+руки|запомнил\p{L}*\s+на\s+всю\s+жизнь|перехватил\p{L}*\s+дыхани|незабываем|propuesta\s+de\s+matrimonio|demande\s+en\s+mariage|heiratsantrag|proposta\s+di\s+matrimonio|pedido\s+de\s+casamento|oświadczyny|evlilik\s+teklifi|הצעת\s+נישואין|عرض\s+زواج|خواستگاری)(?![\p{L}\p{N}])|求婚|プロポーズ|프로포즈/iu,
    boost: 'helicopter sunset yacht Vizcaya LPM Rosa Sky',
    tags: ['helicopter', 'sunset', 'yacht', 'vizcaya', 'lpm', 'rosa sky', 'romantic'],
    note: 'Proposal/once-in-a-lifetime vibe: pair a golden-hour private yacht or sunset helicopter flight with an intimate waterfront/garden table (LPM, Vizcaya, Rosa Sky) away from loud club crowds.'
  },
  {
    id: 'miami-vice-cinematic',
    pattern: /(?<![\p{L}\p{N}])(?:miami\s+vice|scarface|like\s+a\s+movie|cinematic|adrenaline|showstopper|как\s+в\s+кино|майами\s+вайс|адреналин|драйв|эффектн\p{L}*\s+появлен|киношн\p{L}*|як\s+у\s+кіно|como\s+en\s+una\s+película|comme\s+dans\s+un\s+film|wie\s+im\s+film|come\s+in\s+un\s+film|adrenalina|jak\s+w\s+filmie|sinematik|כמו\s+בסרט|مثل\s+الأفلام)(?![\p{L}\p{N}])|电影感|迈阿密风云|映画のよう|영화\s*처럼/iu,
    boost: 'Lamborghini Ferrari convertible helicopter speedboat Komodo LIV',
    tags: ['lamborghini', 'ferrari', 'convertible', 'helicopter', 'speedboat', 'komodo', 'liv'],
    note: 'Cinematic Miami Vice vibe: pair a convertible/supercar (Lamborghini/Ferrari) with a golden-hour helicopter or Biscayne speedboat, Brickell/South Beach sunset drinks, and high-energy dinner (Komodo/Papi Steak).'
  },
  {
    id: 'st-tropez-beach-club',
    pattern: /(?<![\p{L}\p{N}])(?:st[\s.-]?tropez|saint[\s.-]?tropez|mykonos|ibiza|riviera|beach\s+club|mediterranean\s+chic|сен[\s-]*тропе|миконос|ибиц|пляжн\p{L}*\s+клуб|лазурн\p{L}*\s+берег|пляжний\s+клуб|club\s+de\s+playa|plage\s+privée|strandclub|stabilimento|clube\s+de\s+praia|klub\s+plażowy|beach\s*kulüp|מועדון\s+חוף|نادي\s+شاطئي)(?![\p{L}\p{N}])|海滩俱乐部|ビーチクラブ|비치\s*클럽/iu,
    boost: 'LPM Nikki Beach Amara Mandolin yacht Bal Harbour South Beach',
    tags: ['lpm', 'nikki beach', 'amara', 'mandolin', 'yacht', 'bal harbour', 'south beach', 'mediterranean'],
    note: 'St-Tropez/Mykonos coastal vibe: focus on sunlit coastal and Mediterranean dining (LPM, Nikki Beach Miami Beach, Amara at Paraiso, Mandolin Aegean Bistro), white-deck yacht charter with swim stop, and sunset cocktails.'
  },
  {
    id: 'stealth-luxury',
    pattern: /(?<![\p{L}\p{N}])(?:stealth\s+wealth|quiet\s+luxury|old\s+money|understated|no\s+flash|refined|тихая\s+роскош|без\s+пафос|олд\s+мани|спокойн\p{L}*\s+люкс|интеллигентн|тиха\s+розкіш|lujo\s+silencioso|luxe\s+discret|stiller\s+luxus|lusso\s+discreto|luxo\s+discreto|cichy\s+luksus|sessiz\s+lüks|יוקרה\s+שקטה|فخامة\s+هادئة|لوکس\s+آرام)(?![\p{L}\p{N}])|低调奢华|静奢|クワイエットラグジュアリー|조용한\s*럭셔리/iu,
    boost: 'Bal Harbour Coconut Grove Coral Gables Carbone LPM Bentley Range Rover',
    tags: ['bal harbour', 'coconut grove', 'coral gables', 'carbone', 'lpm', 'bentley', 'range rover'],
    note: 'Quiet luxury / understated vibe: favor Bal Harbour, Coconut Grove, or Coral Gables; refined dining (Carbone, LPM, Michelin rooms) and understated comfort cars (Bentley/Range Rover/S-Class).'
  },
  {
    id: 'instagram-wow',
    pattern: /(?<![\p{L}\p{N}])(?:instagram(?:mable)?|photogenic|head[\s-]?turner|wow\s+factor|make\s+an\s+entrance|flashy|инстаграмн\p{L}*|вау[\s-]*эффект|для\s+фото|приковыва\p{L}*\s+взгляд|фотогеничн|іnstagram|efecto\s+wow|fotogénico|photogénique|blickfang|fotogenico|wrażenie|gösterişli|אינסטגרם|تأثير\s+مبهر)(?![\p{L}\p{N}])|出片|网红打卡|映える|인스타\s*감성/iu,
    boost: 'Lamborghini Huracan Urus Ferrari Sexy Fish Komodo Mila Queen Wynwood',
    tags: ['lamborghini', 'ferrari', 'urus', 'huracan', 'sexy fish', 'komodo', 'mila', 'wynwood'],
    note: 'Showstopping / photogenic vibe: feature dramatic exotics (Lamborghini Urus/Huracán, Ferrari) and visually iconic rooms (Sexy Fish, Komodo, Mila, Queen, Wynwood Walls).'
  },
  {
    id: 'wellness-chill',
    pattern: /(?<![\p{L}\p{N}])(?:relax(?:ing|ed)?|unwind|no\s+crowds|peaceful|chill\s+(?:day|weekend|beach)|spa\s+(?:day|vibe)|slow\s+morning|спокойн\p{L}*\s+отдых|без\s+толп|расслабит\p{L}*|тихий\s+пляж|перезагруз|спокійний\s+відпочинок|relajar|sin\s+multitudes|se\s+détendre|entspannen|ohne\s+trubel|rilassante|spokojny\s+wypoczynek|sakin\s+tatil|להירגע|استرخاء|آرامش)(?![\p{L}\p{N}])|放松|人少安静|リラックス|힐링|휴식/iu,
    boost: 'Bal Harbour Key Biscayne Surfside Coconut Grove Mandolin LPM Vizcaya',
    tags: ['bal harbour', 'key biscayne', 'surfside', 'coconut grove', 'mandolin', 'lpm', 'vizcaya'],
    note: 'Calm/uncrowded relaxation vibe: favor Bal Harbour, Surfside, Key Biscayne, or leafy Coconut Grove with unhurried coastal dining (Mandolin, LPM) and scenic Vizcaya or calm bay cruising.'
  },
  {
    id: 'first-time-miami',
    pattern: /(?<![\p{L}\p{N}])(?:first\s+time\s+in\s+miami|never\s+been\s+to\s+miami|must[\s-]?see|where\s+do\s+i\s+start|впервые\s+в\s+майами|первый\s+раз\s+в\s+майами|что\s+обязательно\s+посмотреть|вперше\s+в\s+маямі|primera\s+vez\s+en\s+miami|première\s+fois\s+à\s+miami|zum\s+ersten\s+mal\s+in\s+miami|prima\s+volta\s+a\s+miami|primeira\s+vez\s+em\s+miami|pierwszy\s+raz\s+w\s+miami|miami['’]ye\s+ilk\s+kez|פעם\s+ראשונה\s+במיאמי|أول\s+مرة\s+في\s+ميامي|اولین\s+بار\s+در\s+میامی)(?![\p{L}\p{N}])|第一次来迈阿密|初めてのマイアミ|마이애미\s*처음/iu,
    boost: 'South Beach Brickell Wynwood Design District Biscayne Bay Komodo LPM Vizcaya',
    tags: ['south beach', 'brickell', 'wynwood', 'design district', 'biscayne bay', 'vizcaya'],
    note: 'First-time Miami visitor: give an insider orientation comparing Brickell (modern skyline/dining), South Beach (Art Deco/ocean), Wynwood & Design District (art/luxury), and a Biscayne Bay sunset.'
  },
  {
    id: 'high-energy-party',
    pattern: /(?<![\p{L}\p{N}])(?:bottle\s+service|celebrity\s+(?:spot|scene|vibe)|high[\s-]?energy|party\s+vibe|clubbing|wild\s+night|тусовк|громк\p{L}*\s+вечеринк|вип[\s-]*стол|звёздн\p{L}*\s+мест|клубн\p{L}*\s+ноч|вечірк|fiesta|discoteca|boîte\s+de\s+nuit|feiern|nachtleben|discoteca|balada|impreza|gece\s+hayatı|מסיבה|מועדון|حفلة|سهر)(?![\p{L}\p{N}])|夜店|派对|ナイトクラブ|파티|클럽/iu,
    boost: 'Komodo Sexy Fish Papi Steak LIV E11EVEN Club Space',
    tags: ['komodo', 'sexy fish', 'papi steak', 'liv', 'e11even', 'club space', 'nightlife'],
    note: 'High-energy party/celebrity scene: start with lively Brickell/South Beach dinner (Komodo, Sexy Fish, Papi Steak) before peak club hours after midnight (LIV, E11EVEN, Club Space; strict upscale dress code).'
  }
];

/**
 * Detect luxury hospitality vibes & metaphors from user conversation text.
 */
export function detectSemanticVibes(text) {
  const input = String(text || '');
  if (!input.trim()) return { vibes: [], searchBoostTerms: '', promptNote: '', tags: [] };

  const matched = [];
  for (const item of VIBE_ARCHETYPES) {
    if (item.pattern.test(input)) {
      matched.push(item);
      if (matched.length >= 2) break;
    }
  }
  if (!matched.length) return { vibes: [], searchBoostTerms: '', promptNote: '', tags: [] };

  return {
    vibes: matched.map((m) => m.id),
    searchBoostTerms: matched.map((m) => m.boost).join(' '),
    promptNote: matched.map((m) => m.note).join(' '),
    tags: matched.flatMap((m) => m.tags || [])
  };
}
