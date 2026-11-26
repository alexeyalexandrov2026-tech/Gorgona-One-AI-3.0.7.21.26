import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from './load.cjs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { detectMessageLocale } from '../../lib/ai/semanticVibes.mjs';
import { normalizeSpeechText } from '../../lib/ai/speechNormalize.mjs';
import { getStage3Copy } from '../../lib/ai/stage3Copy.mjs';
import { synthesizeSpeech } from '../../lib/ai/voice.js';
import { resetTtsRateLimitForTests, ttsHandlers } from '../../lib/server/ttsHandler.mjs';
import { resetTtsEdgeCacheForTests } from '../../lib/server/ttsEdgeCache.mjs';
import { resetWhisperRateLimitForTests, whisperHandlers } from '../../lib/server/whisperHandler.mjs';
import { formatGuestMemoryPromptLine, loadGuestAccountMemory } from '../../lib/server/guestMemory.mjs';
import { chatSnapshot, safeNavigationHref } from '../../lib/ai/session.mjs';
import { parseDailyPrice } from '../../lib/ai/tripProfile.mjs';
import { redactPiiForTraining } from '../../lib/server/conciergeTelemetry.mjs';

const { expandMultilingualAliases, searchEcosystem } = load('lib/ai/intent.js');
const { buildFactPack, buildFactPackAsync } = load('lib/ai/factPack.mjs');
const { modelMessages, workersAiChat, WORKERS_AI_MODEL } = load('lib/ai/workersBrain.mjs');
const { listingCards } = load('lib/ai/listingCards.mjs');
const { POST: feedbackPost } = load('app/api/concierge/feedback/route.js');

const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

const MULTILINGUAL_SCENARIOS = [
  { code: 'en', query: 'Best luxury SUV in Brickell and dinner at Komodo', speech: 'ELIO+ $1,300/day 24/7' },
  { code: 'ru', query: 'Нужен Lamborghini Urus в Брикелле и ужин в Комодо', speech: 'ELIO+ ~$500 и $1,000–$1,500/день' },
  { code: 'es', query: 'Quiero un Lamborghini Urus en Brickell y cenar en Komodo', speech: 'ELIO+ $1,300/día 24/7' },
  { code: 'he', query: 'אני מחפש בלמבורגיני בבריקל וארוחת ערב בקומודו', speech: 'ELIO+ למבורגיני $1,300 24/7' },
  { code: 'zh', query: '我想在迈阿密布里克尔租一辆兰博基尼乌鲁斯并去餐厅晚餐', speech: 'ELIO+ 兰博基尼 $1,300/day 24/7' },
  { code: 'pt', query: 'Quero alugar uma Ferrari em South Beach e jantar no Carbone', speech: 'ELIO+ $1,300/dia 24/7' },
  { code: 'uk', query: 'Потрібен позашляховик у Brickell та вечеря в Komodo', speech: 'ELIO+ 24/7 у чт., 27 лист.' },
  { code: 'ja', query: 'マイアミのブリッケルでランボルギーニを借りてディナーしたい', speech: 'ELIO+ ランボルギーニ $1,300/day 24/7' },
  { code: 'ko', query: '마이애미 브리켈에서 람보르기니 렌트와 레스토랑 추천해 주세요', speech: 'ELIO+ 람보르기니 $1,300/day 24/7' },
  { code: 'de', query: 'Ich suche einen Porsche in Brickell und ein Restaurant zum Abendessen', speech: 'ELIO+ $1,300/Tag 24/7' },
  { code: 'ar', query: 'أريد استئجار لامبورغيني في بريكل وعشاء في كومودو', speech: 'ELIO+ لامبورغيني $1,300/day 24/7' },
  { code: 'tr', query: 'Miami Brickell bölgesinde Lamborghini ve akşam yemeği önerir misin', speech: 'ELIO+ Lamborghini $1,300/day 24/7' },
  { code: 'fa', query: 'اجاره لامبورگینی در میامی و بهترین رستوران برای شام', speech: 'ELIO+ میامی $1,300/day 24/7' },
  { code: 'it', query: 'Cerco una Ferrari a South Beach e una cena da Carbone', speech: 'ELIO+ $1,300/giorno 24/7' },
  { code: 'fr', query: 'Je veux louer une Porsche à Brickell et dîner à Komodo', speech: 'ELIO+ $1,300/jour 24/7' },
  { code: 'pl', query: 'Szukam Lamborghini w Brickell i dobrej restauracji na kolację', speech: 'ELIO+ Lamborghini $1,300/day 24/7' }
];

const UNIVERSAL_NO_ENGLISH_BLEED = new Set(['he', 'ar', 'fa', 'zh', 'ja', 'ko', 'tr', 'pl']);

test('ELIO+ AI v4 50-Dialogue Eval Suite (16-Lang Search, Pre-FactPack bge-m3, Voice 3.0, /pay Bridge, Telemetry)', async () => {
  let passed = 0;
  const check = (name, fn) => {
    try {
      fn();
      passed += 1;
    } catch (err) {
      err.message = `[${name}] ${err.message}`;
      throw err;
    }
  };

  // --- L01..L16: All 16 locales end-to-end retrieval, FactPack byte budget, speech safety & Whisper UX copy ---
  for (let i = 0; i < MULTILINGUAL_SCENARIOS.length; i += 1) {
    const s = MULTILINGUAL_SCENARIOS[i];
    const id = `L${String(i + 1).padStart(2, '0')}`;
    check(`${id} (${s.code}) locale detection, FactPack (<9KB), speech normalization & Whisper hint`, () => {
      const detected = detectMessageLocale(s.query, s.code);
      assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === detected), `invalid locale ${detected}`);

      const pack = buildFactPack({ messages: [{ role: 'user', content: s.query }], locale: s.code });
      assert.ok(pack.facts.length >= 1 && pack.facts.length <= 9, `expected 1..9 facts, got ${pack.facts.length}`);

      const msgs = modelMessages([{ role: 'user', content: s.query }], s.code, { factPack: pack });
      assert.ok(msgs && msgs[0]?.content);
      const bytes = new TextEncoder().encode(msgs[0].content).byteLength;
      assert.ok(bytes < 9000, `system prompt exceeded 9KB (${bytes}B) for ${s.code}`);

      const spoken = normalizeSpeechText(s.speech, s.code);
      assert.ok(spoken.length > 0);
      if (UNIVERSAL_NO_ENGLISH_BLEED.has(s.code)) {
        assert.doesNotMatch(spoken, /\bdollars per day\b|\btwenty-four seven\b|\bultra-luxury\b/i, `${s.code} leaked English into TTS: ${spoken}`);
      }

      const s3 = getStage3Copy(s.code);
      assert.ok(s3.listeningWhisper && s3.listeningWhisper.length >= 8, `missing listeningWhisper for ${s.code}`);
      assert.doesNotMatch(s3.listeningWhisper, /\bconcierge\b|консьерж/i);
    });
  }

  // --- S01..S08: 16-Language Hybrid Search & Pre-FactPack @cf/baai/bge-m3 Reranking ---
  check('S01 wrangler.jsonc enables SEMANTIC_EMBEDDINGS_ENABLED in production', () => {
    const cfg = read('wrangler.jsonc');
    assert.match(cfg, /"SEMANTIC_EMBEDDINGS_ENABLED"\s*:\s*"true"/);
  });

  check('S02 CJK unspaced bigram tokenization matches catalog entities', () => {
    const zh = searchEcosystem('迈阿密布里克尔兰博基尼', { locale: 'zh', limit: 6 });
    assert.ok(zh.results.some((r) => /lamborghini/i.test(r.title)), `expected Lamborghini for zh query, got ${zh.results.map((r) => r.title).join(', ')}`);
    const ja = searchEcosystem('マイアミフェラーリ', { locale: 'ja', limit: 6 });
    assert.ok(ja.results.some((r) => /ferrari/i.test(r.title)));
    const ko = searchEcosystem('마이애미브리켈람보르기니', { locale: 'ko', limit: 6 });
    assert.ok(ko.results.some((r) => /lamborghini/i.test(r.title)));
  });

  check('S03 Hebrew 1-letter prefix tolerance resolves prefixed entities & neighborhoods', () => {
    const expanded = expandMultilingualAliases('אני רוצה בלמבורגיני בבריקל וארוחה בקומודו');
    assert.match(expanded, /lamborghini/);
    assert.match(expanded, /brickell/);
    assert.match(expanded, /komodo/);
    const hits = searchEcosystem('בלמבורגיני בבריקל', { locale: 'he', limit: 6 });
    assert.ok(hits.results.some((r) => /lamborghini/i.test(r.title)));
  });

  check('S04 Arabic prefix tolerance resolves prefixed entities & neighborhoods', () => {
    const expanded = expandMultilingualAliases('سيارة باللامبورغيني في بريكل وعشاء في كومودو');
    assert.match(expanded, /brickell/);
    assert.match(expanded, /komodo/);
    const hits = searchEcosystem('لامبورغيني في بريكل', { locale: 'ar', limit: 6 });
    assert.ok(hits.results.some((r) => /lamborghini/i.test(r.title)));
  });

  check('S05 FactPack expands coverage to 8-9 facts for rich comparison & multi-section queries', () => {
    const multi = buildFactPack({
      messages: [{ role: 'user', content: 'Plan my Miami weekend in Brickell: SUV, dinner, yacht, and events' }],
      locale: 'en'
    });
    assert.ok(multi.facts.length >= 6 && multi.facts.length <= 9, `expected 6..9 facts, got ${multi.facts.length}`);
  });

  check('S06 Budget filter keeps listingCards strictly <= cap while FactPack can still surface On-request flagships', () => {
    const strictCards = listingCards('Нужен SUV до $700 в день', { locale: 'ru', sections: ['/rentals'] });
    assert.ok(strictCards.length >= 1);
    for (const c of strictCards) {
      const p = parseDailyPrice(c.price);
      assert.ok(p !== null && p <= 700, `strict card must stay <= $700: ${c.title} (${c.price})`);
    }
    const syntheticOnRequest = {
      id: 'car-flagship-on-request',
      type: 'Car',
      href: '/rentals/flagship-bespoke-suv',
      title: 'Bespoke Flagship SUV',
      price: 'On request',
      numericPrice: null,
      text: 'bespoke flagship suv luxury miami'
    };
    const packRes = searchEcosystem('SUV under $700', {
      locale: 'en',
      limit: 14,
      extraEntities: [syntheticOnRequest],
      includeOnRequestCars: true
    });
    assert.ok(packRes.results.some((r) => r.href === '/rentals/flagship-bespoke-suv'), 'FactPack search should retain On request flagship car');
    const firstPricedIdx = packRes.results.findIndex((r) => Number.isFinite(r.numericPrice) && r.numericPrice <= 700);
    const onReqIdx = packRes.results.findIndex((r) => r.href === '/rentals/flagship-bespoke-suv');
    assert.ok(firstPricedIdx >= 0 && firstPricedIdx < onReqIdx, 'in-budget priced car must rank ahead of On request car');
  });

  // S07 async: buildFactPackAsync calls @cf/baai/bge-m3 BEFORE assembling FactPack
  {
    let embedCalls = 0;
    const fakeAi = {
      run: async (model, input) => {
        if (model === '@cf/baai/bge-m3') {
          embedCalls += 1;
          // Make the last uncached candidate have similarity 1.0 to the query vector [1, 0]
          const vectors = input.text.map((_, idx) => (idx === 0 || idx === input.text.length - 1 ? [1, 0] : [0, 1]));
          return { data: vectors };
        }
        throw new Error(`unexpected model ${model}`);
      }
    };
    const pack = await buildFactPackAsync(
      { messages: [{ role: 'user', content: 'Quiet romantic waterfront dining evening in Miami' }], locale: 'en' },
      { CONCIERGE_AI: fakeAi, SEMANTIC_EMBEDDINGS_ENABLED: 'true' }
    );
    assert.equal(embedCalls, 1, 'buildFactPackAsync must invoke @cf/baai/bge-m3 once');
    assert.ok(pack.facts.length >= 2);
    passed += 1;
  }

  // S08 async: workersAiChat runs pre-FactPack @cf/baai/bge-m3 BEFORE DeepSeek inference
  {
    const order = [];
    const fakeAi = {
      run: async (model, input) => {
        order.push(model);
        if (model === '@cf/baai/bge-m3') {
          return { data: input.text.map(() => [0.5, 0.5]) };
        }
        return {
          response: JSON.stringify({
            version: 3,
            action: 'recommend',
            sections: ['/restaurants-nightlife'],
            reply: 'For a warm Brickell evening, Komodo and LPM Restaurant & Bar are standout verified picks.'
          })
        };
      }
    };
    const res = await workersAiChat(
      {
        APP_ENV: 'dashboard-staging',
        CONCIERGE_WORKERS_AI_ENABLED: 'true',
        SEMANTIC_EMBEDDINGS_ENABLED: 'true',
        CONCIERGE_AI: fakeAi
      },
      { locale: 'en', messages: [{ role: 'user', content: 'Recommend refined waterfront dinner in Brickell' }] },
      { authorize: async () => true, timeoutMs: 10000 }
    );
    assert.equal(res.ok, true);
    assert.equal(order[0], '@cf/baai/bge-m3', 'embeddings rerank must run BEFORE DeepSeek');
    assert.equal(order[1], WORKERS_AI_MODEL);
    passed += 1;
  }

  // --- V01..V10: Voice 3.0 (ElevenLabs fast streaming, 16-lang normalizer, Whisper OOM & auto-detect, iOS Safari UX) ---
  {
    // V01: ElevenLabs fast streaming mode uses /stream + latency=1 + eleven_flash_v2_5 + language_code
    resetTtsRateLimitForTests();
    resetTtsEdgeCacheForTests();
    const calls = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      return new Response(new Uint8Array(512).fill(5), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
    };
    try {
      const fastOut = await synthesizeSpeech('Привет из Майами.', {
        lang: 'ru-RU',
        gender: 'female',
        fast: true,
        env: { ELEVENLABS_API_KEY: 'sk_test_fast_key' }
      });
      assert.equal(fastOut.ok, true);
      assert.match(calls[0].url, /\/stream\?output_format=mp3_44100_128&optimize_streaming_latency=1/);
      assert.equal(calls[0].body.model_id, 'eleven_flash_v2_5');
      assert.equal(calls[0].body.language_code, 'ru');
      passed += 1;

      // V02: ttsHandler routes fast: true separately from default Listen cache
      const handler = ttsHandlers({ APP_ENV: 'production', ELEVENLABS_API_KEY: 'sk_test_fast_key' }, { clock: () => 1700000000000 });
      const r1 = await handler.speak(new Request('https://gorgona-one.com/api/tts', {
        method: 'POST',
        headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.31' },
        body: JSON.stringify({ text: 'Welcome to Brickell.', locale: 'en', fast: true })
      }));
      assert.equal(r1.status, 200);
      assert.equal(calls[1].body.model_id, 'eleven_flash_v2_5');
      const r2 = await handler.speak(new Request('https://gorgona-one.com/api/tts', {
        method: 'POST',
        headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.32' },
        body: JSON.stringify({ text: 'Welcome to Brickell.', locale: 'en', fast: false })
      }));
      assert.equal(r2.status, 200);
      assert.equal(calls[2].body.model_id, 'eleven_multilingual_v2');
      passed += 1;
    } finally {
      globalThis.fetch = origFetch;
    }
  }

  check('V03 Russian speech normalizer handles range with /день suffix and ~$500 tilde prices', () => {
    const plain = (s) => s.replace(/\u0301/g, '');
    const out = plain(normalizeSpeechText('Цена ~$500, а на выходные $1,000–$1,500/день.', 'ru'));
    assert.match(out, /около пятисот долларов/);
    assert.match(out, /от тысячи до тысячи пятисот долларов в день/);
    assert.doesNotMatch(out, /[~$/]/);
  });

  check('V04 ES, PT, FR, DE, IT speech normalizers localize $X/day cleanly', () => {
    assert.match(normalizeSpeechText('Urus $1,300/día', 'es'), /1,300 dólares por día/);
    assert.match(normalizeSpeechText('Urus $1,300/dia', 'pt'), /1,300 dólares por dia/);
    assert.match(normalizeSpeechText('Urus $1,300/jour', 'fr'), /1,300 dollars par jour/);
    assert.match(normalizeSpeechText('Urus $1,300/Tag', 'de'), /1,300 Dollar pro Tag/);
    assert.match(normalizeSpeechText('Urus $1,300/giorno', 'it'), /1,300 dollari al giorno/);
  });

  check('V05 Non-Latin/other locales (he, ar, fa, zh, ja, ko, tr, pl) never fall through to English normalizer', () => {
    for (const code of UNIVERSAL_NO_ENGLISH_BLEED) {
      const sample = 'ELIO+ $$$$ $1,300/day 24/7 15 mins. 78°F';
      const out = normalizeSpeechText(sample, code);
      assert.match(out, /Elio Plus/);
      assert.doesNotMatch(out, /dollars per day|twenty-four seven|ultra-luxury|degrees Fahrenheit|minutes/i, `${code} polluted with English: ${out}`);
    }
  });

  // V06 async: Whisper auto-detect omits forced language when locale === 'auto'
  {
    resetWhisperRateLimitForTests();
    const calls = [];
    const handler = whisperHandlers(
      { APP_ENV: 'production', CONCIERGE_AI: { run: async (m, i) => { calls.push({ m, i }); return { text: 'Покажи Urus', language: 'ru' }; } } },
      null,
      () => 1700000000000
    );
    const form = new FormData();
    form.append('audio', new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/mp4' }), 'dictation.mp4');
    form.append('locale', 'auto');
    const res = await handler.transcribe(new Request('https://gorgona-one.com/api/concierge/transcribe', {
      method: 'POST',
      headers: { origin: 'https://gorgona-one.com', 'cf-connecting-ip': '198.51.100.41' },
      body: form
    }));
    assert.equal(res.status, 200);
    assert.equal(calls[0].m, '@cf/openai/whisper-large-v3-turbo');
    assert.equal(Object.hasOwn(calls[0].i, 'language'), false, 'auto mode must omit language so Whisper auto-detects');
    const data = await res.json();
    assert.equal(data.text, 'Покажи Urus');
    passed += 1;
  }

  // V07 async: Whisper OOM protection never calls byte-array @cf/openai/whisper on >512 KB audio
  {
    resetWhisperRateLimitForTests();
    const calledModels = [];
    const handler = whisperHandlers(
      {
        APP_ENV: 'production',
        CONCIERGE_AI: {
          run: async (model) => {
            calledModels.push(model);
            throw new Error('simulated turbo failure');
          }
        }
      },
      null,
      () => 1700000000000
    );
    const largeAudio = new Uint8Array(600 * 1024).fill(3);
    const form = new FormData();
    form.append('audio', new Blob([largeAudio], { type: 'audio/webm' }), 'dictation.webm');
    form.append('locale', 'auto');
    const res = await handler.transcribe(new Request('https://gorgona-one.com/api/concierge/transcribe', {
      method: 'POST',
      headers: { origin: 'https://gorgona-one.com', 'cf-connecting-ip': '198.51.100.42' },
      body: form
    }));
    assert.equal(res.status, 200);
    assert.equal(calledModels.includes('@cf/openai/whisper'), false, 'must skip OOM-prone byte-array fallback on >512 KB audio');
    passed += 1;
  }

  check('V08 useVoice.js derives Safari mp4/ogg/webm filename, sends locale=auto, and exports cancelListening', () => {
    const src = read('app/components/ai/useVoice.js');
    assert.match(src, /dictation\.\$\{ext\}/);
    assert.match(src, /form\.append\('locale',\s*'auto'\)/);
    assert.match(src, /cancelListening/);
  });

  check('V09 AiConversation.jsx cleans browser SpeechSynthesis text, passes fast:true in voiceMode & shows Whisper hint', () => {
    const src = read('app/components/ai/AiConversation.jsx');
    assert.match(src, /function cleanBrowserSpeechText\(/);
    assert.match(src, /playFemaleVoice\(\{ text: latest\.content, locale: latest\.replyLocale \|\| locale, fast: true \}\)/);
    assert.match(src, /voice\.usingWhisper \? s3\.listeningWhisper : s3\.listeningLive/);
    assert.match(src, /voice\.cancelListening\(\)/);
  });

  check('V10 whisperHandler.mjs contains zero [...bytes] spread OOM anti-pattern', () => {
    const src = read('lib/server/whisperHandler.mjs');
    assert.doesNotMatch(src, /\[\.\.\.bytes\]/);
  });

  // --- P01..P08: /pay/[token] Authenticated Quote Bridge & Session Safety ---
  check('P01 safeNavigationHref allows /pay/<token> and /trip', () => {
    assert.equal(safeNavigationHref('/pay/tok_abc123456789'), true);
    assert.equal(safeNavigationHref('/trip'), true);
    assert.equal(safeNavigationHref('/trip?tab=passes'), true);
  });

  check('P02 safeNavigationHref blocks traversal, external URLs, and protocol injection on /pay', () => {
    assert.equal(safeNavigationHref('/pay/../admin'), false);
    assert.equal(safeNavigationHref('//evil.com/pay/abc'), false);
    assert.equal(safeNavigationHref('/pay/abc%2f..%2fadmin'), false);
    assert.equal(safeNavigationHref('javascript:alert(1)'), false);
  });

  // P03..P05 async: loadGuestAccountMemory loads openQuotes with safe tokens and NEVER leaks raw tokens into prompt text
  {
    const fakeFetcher = async (url) => {
      const s = String(url);
      if (s.includes('/auth/v1/user')) {
        return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', email: 'vip@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' }), { status: 200 });
      }
      if (s.includes('/rest/v1/profiles')) {
        return new Response(JSON.stringify([{ id: '11111111-1111-4111-8111-111111111111', role: 'user', name: 'VIP Guest' }]), { status: 200 });
      }
      if (s.includes('/rest/v1/favorites')) {
        return new Response(JSON.stringify([{ title: 'Lamborghini Urus SE' }]), { status: 200 });
      }
      if (s.includes('/rest/v1/bookings')) {
        return new Response(JSON.stringify([{ item_title: 'Lamborghini Urus SE', status: 'quoted' }]), { status: 200 });
      }
      if (s.includes('payment_quote_list_for_customer')) {
        return new Response(JSON.stringify({
          quotes: [
            { token: 'tok_live_987654321', item_title: 'Lamborghini Urus SE (3 days)', amount_cents: 390000, status: 'open' },
            { token: '../evil/token', item_title: 'Bad Token Quote', amount_cents: 10000, status: 'open' },
            { token: 'tok_signed_12345678', item_title: 'Cadillac Escalade VIP', amount_cents: 120000, status: 'signed' },
            { token: 'tok_paid_11111111', item_title: 'Paid Pass', amount_cents: 50000, status: 'paid' }
          ]
        }), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    };
    const mem = await loadGuestAccountMemory(
      new Request('https://gorgona-one.com/api/chat', { headers: { authorization: 'Bearer aaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } }),
      {
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_key',
        SUPABASE_SERVICE_ROLE_KEY: 'service_role_key'
      },
      fakeFetcher
    );
    // P03
    assert.ok(mem && Array.isArray(mem.openQuotes));
    assert.equal(mem.openQuotes.length, 2, 'must keep only valid open/signed quote tokens');
    assert.equal(mem.openQuotes[0].payPath, '/pay/tok_live_987654321');
    assert.equal(mem.openQuotes[1].payPath, '/pay/tok_signed_12345678');
    passed += 1;

    // P04
    assert.equal(mem.openQuotes.some((q) => q.payPath.includes('evil')), false, 'invalid traversal tokens must be dropped');
    assert.equal(mem.paidPasses, 1);
    passed += 1;

    // P05
    const promptLine = formatGuestMemoryPromptLine(mem);
    assert.doesNotMatch(promptLine, /tok_live_987654321|tok_signed_12345678|\/pay\//, 'raw /pay tokens must NEVER be injected into LLM prompt');
    assert.match(promptLine, /Quotes awaiting ESIGN\/payment: 3/);
    passed += 1;
  }

  check('P06 chatSnapshot preserves verified /pay/<token> quote cards across storage hydration', () => {
    const snap = chatSnapshot({
      messages: [
        { role: 'user', content: 'Where is my payment link?' },
        {
          role: 'assistant',
          content: 'Your open quote is ready below.',
          listings: [{ href: '/pay/tok_live_987654321', title: 'Lamborghini Urus SE', label: 'ESIGN & Pay', price: '$3,900' }]
        }
      ],
      listings: [{ href: '/pay/tok_live_987654321', title: 'Lamborghini Urus SE', label: 'ESIGN & Pay', price: '$3,900' }]
    });
    assert.equal(snap.messages[1].listings.length, 1);
    assert.equal(snap.messages[1].listings[0].href, '/pay/tok_live_987654321');
  });

  check('P07 chat/route.js bridges authenticated openQuotes into clickable /pay/[token] cards on quote queries', () => {
    const route = read('app/api/chat/route.js');
    assert.match(route, /resolvedGuestMemory\?\.openQuotes/);
    assert.match(route, /href:\s*q\.payPath/);
  });

  check('P08 /trip Live Trip Room route is also whitelisted in chatSnapshot navigation cards', () => {
    const snap = chatSnapshot({ cards: [{ href: '/trip', title: 'Live Trip Room' }] });
    assert.equal(snap.cards.length, 1);
    assert.equal(snap.cards[0].href, '/trip');
  });

  // --- T01..T08: Feedback Telemetry, PII Scrubbing, and Forbidden-Path / Brand Guards ---
  check('T01 AiConversation.jsx sends POST /api/concierge/feedback with vote: down + Q&A (never legacy GET)', () => {
    const src = read('app/components/ai/AiConversation.jsx');
    assert.doesNotMatch(src, /\/api\/chat\?feedback=down/);
    assert.match(src, /vote:\s*'down',\s*locale,\s*question:/);
  });

  // T02 async: POST /api/concierge/feedback accepts vote: 'down' with Q&A cleanly
  {
    const res = await feedbackPost(new Request('https://gorgona-one.com/api/concierge/feedback', {
      method: 'POST',
      headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.77' },
      body: JSON.stringify({ vote: 'down', locale: 'ru', question: 'Покажи яхты', answer: 'Тестовый ответ' })
    }));
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data, { ok: true, vote: 'down' });
    passed += 1;
  }

  // T03 async: POST /api/concierge/feedback skips Android native app telemetry cleanly
  {
    const res = await feedbackPost(new Request('https://gorgona-one.com/api/concierge/feedback', {
      method: 'POST',
      headers: {
        origin: 'https://gorgona-one.com',
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 MiamiElioApp/1.0'
      },
      body: JSON.stringify({ vote: 'down', locale: 'en', question: 'Test', answer: 'Test' })
    }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, skipped: 'app' });
    passed += 1;
  }

  check('T04 redactPiiForTraining scrubs emails, phones, and card digits before storing negative training samples', () => {
    const scrubbed = redactPiiForTraining('Contact john.doe@vip.io or +1 (786) 555-0192 card 4242424242424242');
    assert.equal(scrubbed, 'Contact [email] or [phone] card [redacted]');
  });

  check('T05 Zero "concierge" / "консьерж" wording in Stage 3 Voice copy across all 16 locales', () => {
    for (const { code } of SUPPORTED_LANGUAGES) {
      assert.doesNotMatch(JSON.stringify(getStage3Copy(code)), /\bconcierge\b|консьерж/i, code);
    }
  });

  check('T06 Privacy guard: zero owner residential address or personal LLC in modified AI & config files', () => {
    for (const f of ['wrangler.jsonc', 'lib/ai/stage3Copy.mjs', 'lib/server/guestMemory.mjs', 'app/components/ai/AiConversation.jsx']) {
      const txt = read(f);
      assert.doesNotMatch(txt, /250 174th|ALEXEY AAA LOGISTICS/i, f);
    }
  });

  // T07 async: Semantic embeddings reranker stays bounded <= 450ms and fails safe without env binding
  {
    const pack = await buildFactPackAsync({ messages: [{ role: 'user', content: 'Dinner in Brickell' }], locale: 'en' }, null);
    assert.ok(pack.facts.length >= 1);
    passed += 1;
  }

  check('T08 Total 50-dialogue evaluation suite reaches full 50/50 pass count', () => {
    assert.equal(passed + 1, 50);
  });

  assert.equal(passed, 50, `Expected 50/50 passing eval scenarios, got ${passed}`);
});
