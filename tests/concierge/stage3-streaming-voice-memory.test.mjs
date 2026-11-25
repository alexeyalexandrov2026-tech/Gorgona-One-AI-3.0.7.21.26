import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from './load.cjs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import {
  chatCacheKey,
  isCacheableChatTurn,
  readCachedChatReply,
  resetChatEdgeCacheForTests,
  writeCachedChatReply
} from '../../lib/server/chatEdgeCache.mjs';
import { formatGuestMemoryPromptLine } from '../../lib/server/guestMemory.mjs';
import { resetWhisperRateLimitForTests, whisperHandlers } from '../../lib/server/whisperHandler.mjs';
import { cleanSpeechText, resetTtsRateLimitForTests, ttsHandlers } from '../../lib/server/ttsHandler.mjs';
import { resetTtsEdgeCacheForTests } from '../../lib/server/ttsEdgeCache.mjs';
import { getTtsConfig, synthesizeSpeech } from '../../lib/ai/voice.js';
import {
  getConciergeMetricsSnapshot,
  recordChatTurn,
  recordFeedbackVote,
  redactPiiForTraining,
  resetConciergeMetrics
} from '../../lib/server/conciergeTelemetry.mjs';
import { getStage3Copy } from '../../lib/ai/stage3Copy.mjs';

const { POST: chatPost } = load('app/api/chat/route.js');
const { modelMessages } = load('lib/ai/workersBrain.mjs');
const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

test('Stage 3 copy covers all 16 locales without concierge wording', () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    const copy = getStage3Copy(code);
    assert.ok(copy.stop && copy.listen && copy.stopAudio && copy.transcribing && copy.listeningLive && copy.voiceModeOn && copy.voiceModeOff, code);
    assert.doesNotMatch(JSON.stringify(copy), /\bconcierge\b|консьерж/i, code);
  }
});

test('Stage 3 Edge Cache caches eligible starter prompts and rejects volatile/personalized turns', async () => {
  resetChatEdgeCacheForTests();
  assert.equal(isCacheableChatTurn({ messages: [{ role: 'user', content: 'Show me Lamborghini Urus' }] }), true);
  assert.equal(isCacheableChatTurn({ messages: [{ role: 'user', content: 'What is the weather today?' }] }), false);
  assert.equal(isCacheableChatTurn({ messages: [{ role: 'user', content: 'Show me Lamborghini Urus' }], hasAuth: true }), false);
  assert.equal(isCacheableChatTurn({ messages: [{ role: 'user', content: 'Show me Lamborghini Urus' }], savedPrefs: { neighborhood: 'Brickell' } }), false);
  assert.equal(isCacheableChatTurn({ messages: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hi' }, { role: 'user', content: 'Urus' }] }), false);

  const key = await chatCacheKey('ru', 'Покажи Lamborghini Urus');
  assert.equal(await readCachedChatReply(key), null);
  await writeCachedChatReply(key, {
    reply: 'Вот доступные Lamborghini Urus в Майами.',
    decidedBy: 'model',
    action: 'recommend',
    cards: [{ href: '/rentals', title: 'Cars' }],
    suggestions: [],
    listings: []
  });
  const hit = await readCachedChatReply(key);
  assert.ok(hit);
  assert.equal(hit.source, 'edge-cache');
  assert.match(hit.reply, /Lamborghini Urus/);
});

test('Stage 3 POST /api/chat supports SSE Accept: text/event-stream while preserving JSON contract', async () => {
  const sseReq = new Request('https://gorgona-one.com/api/chat', {
    method: 'POST',
    headers: {
      origin: 'https://gorgona-one.com',
      'content-type': 'application/json',
      accept: 'text/event-stream'
    },
    body: JSON.stringify({
      locale: 'en',
      messages: [{ role: 'user', content: 'Hello!' }]
    })
  });
  const sseRes = await chatPost(sseReq);
  assert.equal(sseRes.status, 200);
  assert.match(sseRes.headers.get('content-type') || '', /text\/event-stream/);
  const raw = await sseRes.text();
  assert.match(raw, /event: delta/);
  assert.match(raw, /event: done/);

  const jsonReq = new Request('https://gorgona-one.com/api/chat', {
    method: 'POST',
    headers: {
      origin: 'https://gorgona-one.com',
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      locale: 'en',
      messages: [{ role: 'user', content: 'Hello!' }]
    })
  });
  const jsonRes = await chatPost(jsonReq);
  assert.equal(jsonRes.status, 200);
  assert.match(jsonRes.headers.get('content-type') || '', /application\/json/);
  const body = await jsonRes.json();
  assert.equal(typeof body.reply, 'string');
});

test('Stage 3 Voice 2.0 Whisper fallback transcribes audio via Workers AI binding with rate limit', async () => {
  resetWhisperRateLimitForTests();
  const aiCalls = [];
  const fakeAi = {
    run: async (model, input) => {
      aiCalls.push({ model, input });
      return { text: 'Show me yachts for 8 guests this Saturday' };
    }
  };
  const handler = whisperHandlers({ APP_ENV: 'production', CONCIERGE_AI: fakeAi }, null, () => 1700000000000);

  const badOrigin = await handler.transcribe(new Request('https://gorgona-one.com/api/concierge/transcribe', {
    method: 'POST',
    headers: { origin: 'https://evil.example', 'content-type': 'audio/webm' },
    body: new Uint8Array([1, 2, 3, 4])
  }));
  assert.equal(badOrigin.status, 403);

  const form = new FormData();
  form.append('audio', new Blob([new Uint8Array([10, 20, 30, 40])], { type: 'audio/webm' }), 'voice.webm');
  form.append('locale', 'ru');
  const okRes = await handler.transcribe(new Request('https://gorgona-one.com/api/concierge/transcribe', {
    method: 'POST',
    headers: { origin: 'https://gorgona-one.com', 'cf-connecting-ip': '198.51.100.7' },
    body: form
  }));
  assert.equal(okRes.status, 200);
  const data = await okRes.json();
  assert.equal(data.text, 'Show me yachts for 8 guests this Saturday');
  assert.equal(aiCalls[0].model, '@cf/openai/whisper-large-v3-turbo');
  assert.equal(aiCalls[0].input.language, 'ru');
});

test('Stage 3 Female Voice TTS (/api/tts) enforces female gender and supports Workers AI Luna speaker', async () => {
  resetTtsRateLimitForTests();
  const ttsCalls = [];
  const fakeMp3 = new Uint8Array(512).fill(7);
  const fakeAi = {
    run: async (model, input) => {
      ttsCalls.push({ model, input });
      return fakeMp3.buffer;
    }
  };
  const handler = ttsHandlers({ APP_ENV: 'production', CONCIERGE_AI: fakeAi }, { clock: () => 1700000000000 });

  const statusRes = await handler.status();
  assert.deepEqual(await statusRes.json(), { available: true, voice: 'female', provider: 'workers-ai' });

  const speakRes = await handler.speak(new Request('https://gorgona-one.com/api/tts', {
    method: 'POST',
    headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.9' },
    body: JSON.stringify({ text: 'Welcome to Miami Elio.', locale: 'en' })
  }));
  assert.equal(speakRes.status, 200);
  assert.equal(speakRes.headers.get('x-elio-voice'), 'female');
  assert.equal(speakRes.headers.get('content-type'), 'audio/mpeg');
  assert.equal(ttsCalls[0].model, '@cf/deepgram/aura-2-en');
  assert.equal(ttsCalls[0].input.speaker, 'luna');
});

test('ElevenLabs TTS auto-activates from Cloudflare env secret with female Sarah multilingual v2 voice and 24h edge cache', async () => {
  resetTtsRateLimitForTests();
  resetTtsEdgeCacheForTests();
  const cfg = getTtsConfig({ ELEVENLABS_API_KEY: 'sk_test_demo_key' });
  assert.equal(cfg.provider, 'elevenlabs');
  assert.equal(cfg.voiceIdFemale, 'EXAVITQu4vr4xnSDxMaL');
  assert.equal(cfg.modelId, 'eleven_multilingual_v2');
  assert.equal(getTtsConfig({ ELEVENLABS_API_KEY: 'sk_test_demo_key', TTS_PROVIDER: 'off' }).provider, 'off');

  const fetchCalls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return new Response(new Uint8Array(600).fill(9), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
  };
  try {
    const handler = ttsHandlers(
      { APP_ENV: 'production', ELEVENLABS_API_KEY: 'sk_test_demo_key' },
      { clock: () => 1700000000000 }
    );
    const statusRes = await handler.status();
    assert.deepEqual(await statusRes.json(), { available: true, voice: 'female', provider: 'elevenlabs' });

    const speakRes = await handler.speak(new Request('https://gorgona-one.com/api/tts', {
      method: 'POST',
      headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.11' },
      body: JSON.stringify({ text: 'Добро пожаловать в Miami Elio.', locale: 'ru' })
    }));
    assert.equal(speakRes.status, 200);
    assert.equal(speakRes.headers.get('x-elio-tts-provider'), 'elevenlabs');
    assert.equal(speakRes.headers.get('x-elio-tts-cache'), 'MISS');
    assert.equal(speakRes.headers.get('x-elio-voice'), 'female');
    assert.equal(fetchCalls.length, 1);
    assert.match(fetchCalls[0].url, /api\.elevenlabs\.io\/v1\/text-to-speech\/EXAVITQu4vr4xnSDxMaL\?output_format=mp3_44100_128/);
    assert.equal(fetchCalls[0].init.headers['xi-api-key'], 'sk_test_demo_key');
    const body = JSON.parse(fetchCalls[0].init.body);
    assert.equal(body.model_id, 'eleven_multilingual_v2');
    assert.equal(body.voice_settings.use_speaker_boost, true);
    assert.ok(body.voice_settings.stability >= 0.4 && body.voice_settings.stability <= 0.55, 'balanced stability preserves warm prosody with crisp diction');
    assert.ok(body.voice_settings.style >= 0.2 && body.voice_settings.style <= 0.35, 'moderate style avoids slurred syllables on numerals');
    assert.ok(body.voice_settings.speed >= 0.9 && body.voice_settings.speed <= 1.0, 'calm host pacing avoids clipped consonants');
    assert.doesNotMatch(fetchCalls[0].url, /optimize_streaming_latency=[2-4]/, 'aggressive streaming latency degrades numeral pronunciation');

    // Speech text preprocessor inserts natural sentence breaks on bullet/newline lists
    const spoken = cleanSpeechText('Привет! 🌴\n• Komodo — Brickell\n• Carbone — South Beach\nhttps://gorgona-one.com');
    assert.equal(spoken, 'Привет! Komodo — Brickell. Carbone — South Beach.');

    // CSP media-src must allow blob: and data: or every browser blocks ElevenLabs Audio(blobUrl)
    const mw = read('middleware.js');
    assert.match(mw, /media-src[^"]*blob:/);
    assert.match(mw, /media-src[^"]*data:/);

    // Client player unlocks iOS Safari audio synchronously BEFORE await fetch('/api/tts')
    // and never self-cancels playback on ttsState transitions (loading -> playing).
    const convo = read('app/components/ai/AiConversation.jsx');
    assert.match(convo, /function unlockSafariAudio\(/);
    assert.match(convo, /SILENT_WAV_DATA_URI/);
    assert.match(convo, /decodeAudioData/);
    assert.match(convo, /playElementWithTimeout/);
    assert.doesNotMatch(convo, /if\s*\(ttsState\s*!==\s*'idle'\)\s*stopActiveVoicePlayback\(\);\s*\},\s*\[ttsState\]\)/);
    assert.ok(
      convo.indexOf('unlockSafariAudio()') < convo.indexOf("fetch('/api/tts'"),
      'Safari audio unlock must execute synchronously before awaiting /api/tts'
    );

    // Second identical request is served from 24h edge cache with ZERO extra ElevenLabs calls!
    const cachedRes = await handler.speak(new Request('https://gorgona-one.com/api/tts', {
      method: 'POST',
      headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.12' },
      body: JSON.stringify({ text: 'Добро пожаловать в Miami Elio.', locale: 'ru' })
    }));
    assert.equal(cachedRes.status, 200);
    assert.equal(cachedRes.headers.get('x-elio-tts-cache'), 'HIT');
    assert.equal(cachedRes.headers.get('x-elio-tts-provider'), 'elevenlabs');
    assert.equal(fetchCalls.length, 1, 'cached reply must not spend additional ElevenLabs credits');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('Stage 3 guest account memory injects into system prompt and telemetry scrubs PII for ELIO-1', () => {
  const memLine = formatGuestMemoryPromptLine({
    favorites: ['Lamborghini Urus SE', 'Komodo'],
    paidPasses: 1,
    pendingEsign: 1,
    bookings: ['Lamborghini Urus SE (quoted)']
  });
  assert.match(memLine, /Lamborghini Urus SE/);
  assert.match(memLine, /Confirmed Live Trip Room passes: 1/);
  assert.match(memLine, /Quotes awaiting ESIGN/);

  const promptMsgs = modelMessages([{ role: 'user', content: 'What is next for my trip?' }], 'en', { guestMemoryLine: memLine });
  assert.ok(promptMsgs[0].content.includes(memLine));

  const scrubbed = redactPiiForTraining('Email me at vip@example.com or call +1 (305) 555-0199 about Urus');
  assert.equal(scrubbed, 'Email me at [email] or call [phone] about Urus');

  resetConciergeMetrics();
  recordChatTurn({ decidedBy: 'model', action: 'recommend', locale: 'ru', cached: true, ms: 42 });
  recordFeedbackVote('up');
  recordFeedbackVote('down');
  const snap = getConciergeMetricsSnapshot();
  assert.equal(snap.cacheHits, 1);
  assert.equal(snap.feedbackUp, 1);
  assert.equal(snap.feedbackDown, 1);

  const sql = read('supabase/migrations/20261124020000_elio_telemetry_and_feedback.sql');
  assert.match(sql, /elio_telemetry_events/);
  assert.match(sql, /elio_training_samples/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /elio_metrics_summary_7d/);
});
