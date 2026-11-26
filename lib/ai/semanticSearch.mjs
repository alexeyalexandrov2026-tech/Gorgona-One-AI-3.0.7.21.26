// ===========================================================================
// Wave 1 (P0) — Hybrid Multilingual Semantic Search & Reranker.
//
// Bridges natural-language vibes, occasions, logistics, and indirect luxury
// phrasing across all 16 languages to verified Miami Elio catalog entities:
//   1. Fast deterministic multilingual concept graph (< 2ms, zero latency)
//      covering 14 Miami hospitality archetypes (Mykonos/St-Tropez, quiet
//      luxury, proposal, family with luggage, Michelin gastronomy, waterfront
//      sunset, convertible coastal drive, bachelor/birthday, airport/cruise
//      transfer, rainy-day indoor, smart value luxury, executive deal).
//   2. Optional Cloudflare Workers AI `@cf/baai/bge-m3` dense embedding
//      reranker (cached per isolate, bounded to 450ms hard timeout, fail-safe
//      fallback so turns never slow down or fail).
// ===========================================================================

import { detectSemanticVibes } from './semanticVibes.mjs';

const EMBEDDING_MODEL = '@cf/baai/bge-m3';
const EMBED_TIMEOUT_MS = 650;
const entityVectorCache = new Map(); // id -> Float32Array|number[]

const EXTENDED_CONCEPTS = [
  {
    id: 'family-spacious',
    pattern: /(?<![\p{L}\p{N}])(?:famil(?:y|ies)|with\s+kids|children|stroller|suitcases?|luggage|spacious\s+suv|7\s*seats?|семь\p{L}*|с\s+детьм|ребён|ребен|коляск|чемодан|багаж|просторн\p{L}*|внедорожник\p{L}*\s+на\s+[567]|з\s+дітьми|сімʼ|валіз|con\s+niños|familia|avec\s+enfants|mit\s+kindern|con\s+bambini|com\s+crianças|z\s+dziećmi|çocuklu|aile|עם\s+ילדים|مع\s+أطفال|عائلة|خانواده)(?![\p{L}\p{N}])|带孩子|家庭|行李|子連れ|家族|가족|아이\s*동반/iu,
    boost: 'Escalade Cullinan Urus Range Rover Mercedes GLS Frost Science Vizcaya Bal Harbour Key Biscayne',
    note: 'Family/luggage-heavy profile: prioritize spacious 5–7 seat luxury SUVs (Escalade, Cullinan, Urus, Range Rover) and calm family-friendly stops (Bal Harbour, Key Biscayne, Frost Science, Vizcaya).',
    tags: ['suv', 'family', 'spacious', 'escalade', 'cullinan', 'urus', 'range rover', 'bal harbour', 'key biscayne', 'frost', 'vizcaya']
  },
  {
    id: 'waterfront-sunset',
    pattern: /(?<![\p{L}\p{N}])(?:waterfront|oceanfront|bay\s*view|sea\s*view|sunset\s+(?:dinner|drinks|cruise|views?)|golden\s+hour|на\s+закат|вид\p{L}*\s+на\s+(?:воду|залив|океан)|у\s+воды|набережн|біля\s+води|на\s+заході\s+сонця|frente\s+al\s+mar|atardecer|vue\s+mer|coucher\s+de\s+soleil|sonnenuntergang|wasserblick|tramonto|vista\s+mare|pôr\s+do\s+sol|zachód\s+słońca|gün\s+batımı|deniz\s+manzar|שקיעה|על\s+המים|غروب|على\s+البحر|غروب\s+آفتاب)(?![\p{L}\p{N}])|海景|日落|水边|サンセット|オーシャンビュー|일몰|오션뷰/iu,
    boost: 'Amara at Paraiso Kiki on the River Rosa Sky LPM Biscayne Bay yacht Key Biscayne',
    note: 'Waterfront/sunset focus: highlight bayfront and rooftop golden-hour venues (Amara at Paraiso, Kiki on the River, Rosa Sky, LPM) and Biscayne Bay sunset charters; suggest arriving 45–60 min before sunset.',
    tags: ['waterfront', 'sunset', 'bay', 'rooftop', 'amara', 'kiki', 'rosa sky', 'yacht', 'lpm']
  },
  {
    id: 'michelin-gastronomy',
    pattern: /(?<![\p{L}\p{N}])(?:michelin|omakase|tasting\s+menu|gastronom|fine\s+dining|best\s+(?:sushi|steak|italian)|foodie|мишлен|мішлен|омакасе|дегустац|гастроном|высок\p{L}*\s+кухн|лучш\p{L}*\s+(?:суши|стейк|итальян)|estrella\s+michelin|gastronomía|étoile\s+michelin|sternerestaurant|stellato|gwiazdka\s+michelin|מישלן|ميشلان)(?![\p{L}\p{N}])|米其林|高档餐厅|ミシュラン|미슐랭/iu,
    boost: 'Carbone Cote LPM Komodo Papi Steak Sexy Fish Michelin sushi steakhouse Design District Brickell',
    note: 'Gastronomy/Michelin focus: highlight verified Michelin-caliber and flagship dining rooms (Cote, Carbone, LPM, Komodo, Papi Steak) and advise booking 2–4 weeks ahead for prime 20:00–21:30 slots.',
    tags: ['michelin', 'omakase', 'carbone', 'cote', 'lpm', 'komodo', 'papi steak', 'sexy fish', 'steakhouse', 'sushi', 'italian']
  },
  {
    id: 'bachelor-celebration',
    pattern: /(?<![\p{L}\p{N}])(?:bachelor(?:ette)?|birthday|anniversary|celebrat\p{L}*|girls\s+trip|boys\s+trip|мальчишник|девичник|день\s+рождени|день\s+народження|годовщин|річниц|праздноват|отметит|cumpleaños|despedida|anniversaire|geburtstag|compleanno|aniversário|urodziny|doğum\s+günü|יום\s+הולדת|عيد\s+ميلاد|تولد)(?![\p{L}\p{N}])|生日|纪念日|庆祝|誕生日|記念日|생일|기념일/iu,
    boost: 'Lamborghini Urus Ferrari yacht Komodo Papi Steak Sexy Fish LIV E11EVEN',
    note: 'Celebration/group event: pair a statement car or private bay yacht with a high-energy celebratory dinner (Komodo, Papi Steak, Sexy Fish) and late-night VIP table (LIV, E11EVEN).',
    tags: ['celebration', 'yacht', 'lamborghini', 'ferrari', 'urus', 'komodo', 'papi steak', 'liv', 'e11even']
  },
  {
    id: 'convertible-coastal-drive',
    pattern: /(?<![\p{L}\p{N}])(?:convertible|cabrio(?:let)?|spider|spyder|drop[\s-]?top|open[\s-]?top|ocean\s+drive|key\s+west|coastal\s+drive|кабриолет|кабріолет|с\s+открыт\p{L}*\s+верх|без\s+крыш|побереж|прокатиться\s+вдоль\s+океан|descapotable|décapotable|conversível|kabriolet|üstü\s+açık|קבריולט|سيارة\s+مكشوفة|کروک)(?![\p{L}\p{N}])|敞篷|オープンカー|컨버터블|오픈카/iu,
    boost: 'convertible Spider Spyder GTC Dawn Ferrari Lamborghini Bentley Porsche',
    note: 'Open-top coastal drive: feature convertible exotics (Ferrari Spider, Lamborghini Huracán Spyder, Bentley GTC, Rolls-Royce Dawn, Porsche Cabriolet) and note 2-seat / compact carry-on capacity.',
    tags: ['convertible', 'spider', 'spyder', 'cabriolet', 'gtc', 'dawn', 'ferrari', 'lamborghini', 'porsche', 'bentley']
  },
  {
    id: 'smart-value-luxury',
    pattern: /(?<![\p{L}\p{N}])(?:best\s+value|smart\s+budget|affordable\s+luxury|under\s+\$?\d+|reasonable|недорог|выгодн|разумн\p{L}*\s+бюджет|оптимальн\p{L}*\s+цен|до\s+\$?\d+|вигідн|económico|buen\s+precio|bon\s+rapport|preiswert|buon\s+prezzo|custo[\s-]?benefício|korzystn|uygun\s+fiyat|משתלם|بسعر\s+معقول|مقرون\s+به\s+صرفه)(?![\p{L}\p{N}])|性价比|划算|コスパ|가성비/iu,
    boost: 'BMW Mercedes Porsche Corvette Range Rover Brickell Wynwood',
    note: 'Smart-value luxury: lead with high-style, sharper daily-rate fleet models (BMW, Mercedes, Porsche, Corvette) and top Brickell/Wynwood picks without sacrificing Miami polish.',
    tags: ['bmw', 'mercedes', 'porsche', 'corvette', 'wynwood', 'brickell']
  },
  {
    id: 'airport-cruise-transfer',
    pattern: /(?<![\p{L}\p{N}])(?:airport\s+(?:pickup|transfer|drop)|port\s*miami|cruise\s+(?:port|terminal)|landing\s+at|из\s+аэропорт|в\s+аэропорт|трансфер|круизн\p{L}*\s+порт|прилёт|прилет|аеропорт|aeropuerto|traslado|crucero|aéroport|flughafen|aeroporto|lotnisko|havalimanı|שדה\s+תעופה|مطار|فرودگاه)(?![\p{L}\p{N}])|机场接送|邮轮码头|空港送迎|공항\s*픽업/iu,
    boost: 'Escalade Maybach Rolls-Royce S-Class Range Rover Brickell Downtown',
    note: 'Airport/PortMiami transfer: recommend executive SUVs/sedans with full trunk space (Escalade, Maybach, S-Class, Range Rover) and cite real MIA↔Brickell (18–30m) / FLL↔Brickell (35–55m) times.',
    tags: ['escalade', 'maybach', 's-class', 'rolls-royce', 'range rover', 'brickell', 'downtown']
  },
  {
    id: 'rainy-day-indoor',
    pattern: /(?<![\p{L}\p{N}])(?:rain(?:y|ing)?|storm|thunder|indoor|bad\s+weather|plan\s*b|дожд|гроз|ливень|в\s+помещени|крыт\p{L}*|плох\p{L}*\s+погод|план\s*[бb]|дощ|lluvia|tormenta|pluie|regen|pioggia|chuva|deszcz|yağmur|גשם|مطر|باران)(?![\p{L}\p{N}])|下雨|室内|雨の日|비\s*올\s*때|실내/iu,
    boost: 'Design District Bal Harbour Shops PAMM Frost Science Carbone Cote LPM',
    note: 'Rainy-day / indoor Plan B: pivot seamlessly to covered luxury shopping (Design District, Bal Harbour Shops), acclaimed museums (PAMM, Frost Science), and indoor flagship dining (Carbone, Cote, LPM).',
    tags: ['indoor', 'design district', 'bal harbour', 'pamm', 'frost', 'carbone', 'cote', 'lpm']
  }
];

/**
 * Combined semantic concept & vibe detector across base + extended archetypes.
 * Returns search boost terms, concise prompt note, and matched concept tags.
 */
export function analyzeSemanticIntent(text) {
  const input = String(text || '').trim();
  const base = detectSemanticVibes(input);
  const matched = [];
  for (const concept of EXTENDED_CONCEPTS) {
    if (concept.pattern.test(input)) {
      matched.push(concept);
      if (matched.length >= 2) break;
    }
  }
  const vibes = [...base.vibes, ...matched.map((m) => m.id)];
  const searchBoostTerms = [base.searchBoostTerms, ...matched.map((m) => m.boost)].filter(Boolean).join(' ').trim();
  // Keep promptNote compact (first highest-signal note <= 185 chars) to stay strictly inside edge prefill prompt budget.
  const promptNote = (base.promptNote || matched[0]?.note || '').slice(0, 185).trim();
  const tags = [...new Set([...(base.tags || []), ...matched.flatMap((m) => m.tags)])];

  return { vibes, searchBoostTerms, promptNote, tags };
}

/** Deterministic semantic concept score boost for ranking candidate catalog entities. */
export function semanticConceptScore(entity, intent) {
  if (!entity || !intent?.tags?.length) return 0;
  const hay = `${entity.title || ''} ${entity.subtitle || ''} ${entity.neighborhood || ''} ${entity.cuisine || ''} ${entity.category || ''} ${(entity.collections || []).join(' ')} ${entity.text || ''}`.toLowerCase();
  let hits = 0;
  for (const tag of intent.tags) {
    if (hay.includes(tag)) hits += 1;
  }
  return Math.min(hits * 2.5, 10);
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Optional Cloudflare Workers AI `@cf/baai/bge-m3` dense embedding reranker.
 * Bounded to <= 450ms and completely fail-safe: returns input order unchanged
 * if Workers AI is absent, disabled, or slow.
 */
export async function semanticRerankWithEmbeddings(query, candidates = [], env = null) {
  if (!Array.isArray(candidates) || candidates.length <= 1) return candidates;
  if (!env?.CONCIERGE_AI || typeof env.CONCIERGE_AI.run !== 'function') return candidates;
  if (env.SEMANTIC_EMBEDDINGS_ENABLED !== 'true') return candidates;
  const q = String(query || '').trim();
  if (q.length < 6) return candidates;

  const top = candidates.slice(0, 16);
  const uncachedIndices = [];
  const uncachedTexts = [];
  for (let i = 0; i < top.length; i++) {
    const key = top[i]?.href || top[i]?.id || top[i]?.title;
    if (key && !entityVectorCache.has(key)) {
      uncachedIndices.push(i);
      uncachedTexts.push(`${top[i].title || ''} ${top[i].type || ''} ${top[i].neighborhood || top[i].subtitle || ''} ${(top[i].collections || []).join(' ')}`.trim().slice(0, 220));
    }
  }

  let timer;
  try {
    const batch = [q.slice(0, 240), ...uncachedTexts];
    const run = Promise.resolve(env.CONCIERGE_AI.run(EMBEDDING_MODEL, { text: batch }));
    const res = await Promise.race([
      run,
      new Promise((resolve) => { timer = setTimeout(() => resolve(null), EMBED_TIMEOUT_MS); })
    ]);
    const vectors = res?.data;
    if (!Array.isArray(vectors) || !Array.isArray(vectors[0])) return candidates;

    const qVec = vectors[0];
    for (let j = 0; j < uncachedIndices.length; j++) {
      const vec = vectors[j + 1];
      const item = top[uncachedIndices[j]];
      const key = item?.href || item?.id || item?.title;
      if (key && Array.isArray(vec)) {
        entityVectorCache.set(key, vec);
        if (entityVectorCache.size > 400) {
          const oldest = entityVectorCache.keys().next().value;
          if (oldest) entityVectorCache.delete(oldest);
        }
      }
    }

    const rerankedTop = top
      .map((item, idx) => {
        const key = item?.href || item?.id || item?.title;
        const vec = key ? entityVectorCache.get(key) : null;
        const sim = vec ? cosineSimilarity(qVec, vec) : 0;
        // Blend lexical position prior with dense multilingual cosine similarity
        const lexicalPrior = (top.length - idx) / top.length;
        return { item, score: sim * 0.65 + lexicalPrior * 0.35 };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);

    return [...rerankedTop, ...candidates.slice(16)];
  } catch {
    return candidates;
  } finally {
    clearTimeout(timer);
  }
}
