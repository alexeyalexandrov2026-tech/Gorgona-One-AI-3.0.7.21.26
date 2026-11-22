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

  // Non-Latin scripts are unmistakable even in short phrases
  if (/[\u0400-\u04ff]/.test(raw)) {
    return /[іїєґ]/i.test(raw) ? 'uk' : 'ru';
  }
  if (/[\u0590-\u05ff]/.test(raw)) return 'he';
  if (/[\u0600-\u06ff]/.test(raw)) {
    return /[پچژگیک]/.test(raw) ? 'fa' : 'ar';
  }
  if (/[\u3040-\u30ff]/.test(raw)) return 'ja';
  if (/[\uac00-\ud7af]/.test(raw)) return 'ko';
  if (/[\u4e00-\u9fff]/.test(raw)) return 'zh';

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
    id: 'executive-quiet',
    pattern: /(?<![\p{L}\p{N}])(?:investor\p{L}*|boardroom|negotiation\p{L}*|quiet\s+(?:dining|dinner|restaurant|place|spot)|private\s+(?:room|dining)|business\s+dinner|deal\s+dinner|переговор\p{L}*|инвестор\p{L}*|тихо\p{L}*\s+мест|без\s+громк\p{L}*\s+музык|приватн\p{L}*\s+комнат|делов\p{L}*\s+ужин|negocios|réunion\s+d'affaires)(?![\p{L}\p{N}])/iu,
    boost: 'LPM Carbone Cote Nuna Maybach Rolls-Royce Bentley',
    note: 'Executive/quiet-talk vibe: prioritize refined, conversation-friendly rooms (LPM, Carbone, Cote, Nuna; ask venue about private dining) and chauffeur-grade sedans (Rolls-Royce/Maybach/Bentley).'
  },
  {
    id: 'proposal-unforgettable',
    pattern: /(?<![\p{L}\p{N}])(?:proposal|propose|engagement|pop\s+the\s+question|once\s+in\s+a\s+lifetime|breathtaking|unforgettable|предложени\p{L}*\s+рук|помолвк|запомнил\p{L}*\s+на\s+всю\s+жизнь|перехватил\p{L}*\s+дыхани|незабываем|propuesta\s+de\s+matrimonio|demande\s+en\s+mariage)(?![\p{L}\p{N}])/iu,
    boost: 'helicopter sunset yacht Vizcaya LPM Rosa Sky',
    note: 'Proposal/once-in-a-lifetime vibe: pair a golden-hour private yacht or sunset helicopter flight with an intimate waterfront/garden table (LPM, Vizcaya, Rosa Sky) away from loud club crowds.'
  },
  {
    id: 'miami-vice-cinematic',
    pattern: /(?<![\p{L}\p{N}])(?:miami\s+vice|scarface|like\s+a\s+movie|cinematic|adrenaline|showstopper|как\s+в\s+кино|майами\s+вайс|адреналин|драйв|эффектн\p{L}*\s+появлен|киношн\p{L}*)(?![\p{L}\p{N}])/iu,
    boost: 'Lamborghini Ferrari convertible helicopter speedboat Komodo LIV',
    note: 'Cinematic Miami Vice vibe: pair a convertible/supercar (Lamborghini/Ferrari) with a golden-hour helicopter or Biscayne speedboat, Brickell/South Beach sunset drinks, and high-energy dinner (Komodo/Papi Steak).'
  },
  {
    id: 'st-tropez-beach-club',
    pattern: /(?<![\p{L}\p{N}])(?:st[\s.-]?tropez|saint[\s.-]?tropez|mykonos|ibiza|riviera|beach\s+club|mediterranean\s+chic|сен[\s-]*тропе|миконос|ибиц|пляжн\p{L}*\s+клуб|лазурн\p{L}*\s+берег)(?![\p{L}\p{N}])/iu,
    boost: 'LPM Milos Kiki yacht Bal Harbour South Beach',
    note: 'St-Tropez/Mykonos coastal vibe: focus on sunlit waterfront dining (LPM, Kiki on the River, Bal Harbour/South Beach), white-deck yacht charter with swim stop, and sunset cocktails.'
  },
  {
    id: 'stealth-luxury',
    pattern: /(?<![\p{L}\p{N}])(?:stealth\s+wealth|quiet\s+luxury|old\s+money|understated|no\s+flash|refined|тихая\s+роскош|без\s+пафос|олд\s+мани|спокойн\p{L}*\s+люкс|интеллигентн)(?![\p{L}\p{N}])/iu,
    boost: 'Bal Harbour Coconut Grove Coral Gables Carbone LPM Bentley Range Rover',
    note: 'Quiet luxury / understated vibe: favor Bal Harbour, Coconut Grove, or Coral Gables; refined dining (Carbone, LPM, Michelin rooms) and understated comfort cars (Bentley/Range Rover/S-Class).'
  },
  {
    id: 'high-energy-party',
    pattern: /(?<![\p{L}\p{N}])(?:bottle\s+service|celebrity\s+(?:spot|scene|vibe)|high[\s-]?energy|party\s+vibe|clubbing|wild\s+night|тусовк|громк\p{L}*\s+вечеринк|вип[\s-]*стол|звёздн\p{L}*\s+мест|клубн\p{L}*\s+ноч)(?![\p{L}\p{N}])/iu,
    boost: 'Komodo Sexy Fish Papi Steak LIV E11EVEN Club Space',
    note: 'High-energy party/celebrity scene: start with lively Brickell/South Beach dinner (Komodo, Sexy Fish, Papi Steak) before peak club hours after midnight (LIV, E11EVEN, Club Space; strict upscale dress code).'
  }
];

/**
 * Detect luxury hospitality vibes & metaphors from user conversation text.
 */
export function detectSemanticVibes(text) {
  const input = String(text || '');
  if (!input.trim()) return { vibes: [], searchBoostTerms: '', promptNote: '' };

  const matched = [];
  for (const item of VIBE_ARCHETYPES) {
    if (item.pattern.test(input)) {
      matched.push(item);
      if (matched.length >= 2) break;
    }
  }
  if (!matched.length) return { vibes: [], searchBoostTerms: '', promptNote: '' };

  return {
    vibes: matched.map((m) => m.id),
    searchBoostTerms: matched.map((m) => m.boost).join(' '),
    promptNote: matched.map((m) => m.note).join(' ')
  };
}
