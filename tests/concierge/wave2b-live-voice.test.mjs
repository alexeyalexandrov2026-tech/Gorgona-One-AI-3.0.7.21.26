import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { getStage3Copy } from '../../lib/ai/stage3Copy.mjs';
import { resetTtsRateLimitForTests, ttsHandlers } from '../../lib/server/ttsHandler.mjs';

const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

test('Wave 2B: Live Voice dialogue labels cover all 16 locales without forbidden concierge wording', () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    const copy = getStage3Copy(code);
    assert.ok(copy.liveVoiceListening && copy.liveVoiceListening.length >= 4, `missing liveVoiceListening in ${code}`);
    assert.ok(copy.liveVoiceThinking && copy.liveVoiceThinking.length >= 4, `missing liveVoiceThinking in ${code}`);
    assert.ok(copy.liveVoiceSpeaking && copy.liveVoiceSpeaking.length >= 4, `missing liveVoiceSpeaking in ${code}`);
    assert.ok(copy.liveVoiceReady && copy.liveVoiceReady.length >= 4, `missing liveVoiceReady in ${code}`);
    assert.doesNotMatch(JSON.stringify(copy), /\bconcierge\b|консьерж/i, `forbidden concierge term in ${code}`);
  }
});

test('Wave 2B: ChatProvider and AiConversation wire hands-free Live Voice loop, barge-in interrupt, and safe no-speech stop', () => {
  const provider = read('app/components/ai/ChatProvider.jsx');
  assert.match(provider, /const voiceMode = options\?\.voiceMode === true;/);
  assert.match(provider, /conversationSummary,\s*voiceMode/);

  const convo = read('app/components/ai/AiConversation.jsx');
  assert.match(convo, /onEnded = null/);
  assert.match(convo, /finishNaturally\(\)/);
  assert.match(convo, /data-live-voice-bar="true"/);
  assert.match(convo, /noSpeechStreakRef\.current >= 2/);
  assert.match(convo, /startVoiceCapture\(true\)/);
  assert.match(convo, /send\(content,\s*\{\s*voiceMode:\s*inVoiceMode\s*\}\)/);
});

test('Wave 2B: TTS handler supports multi-turn live voice sessions (20+ turns) while still enforcing rate limit at 30', async () => {
  resetTtsRateLimitForTests();
  const fakeAi = { run: async () => new Uint8Array(512).fill(5).buffer };
  const handler = ttsHandlers(
    { APP_ENV: 'production', CONCIERGE_AI: fakeAi },
    { clock: () => 1700000000000 }
  );

  for (let i = 0; i < 20; i += 1) {
    const res = await handler.speak(new Request('https://gorgona-one.com/api/tts', {
      method: 'POST',
      headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.77' },
      body: JSON.stringify({ text: `Live voice turn number ${i + 1} in Miami.`, locale: 'en' })
    }));
    assert.equal(res.status, 200, `turn ${i + 1} should succeed inside live voice budget`);
  }

  // Remaining 10 succeed, 31st is rate-limited cleanly with 429
  for (let i = 20; i < 30; i += 1) {
    const res = await handler.speak(new Request('https://gorgona-one.com/api/tts', {
      method: 'POST',
      headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.77' },
      body: JSON.stringify({ text: `Live voice turn number ${i + 1} in Miami.`, locale: 'en' })
    }));
    assert.equal(res.status, 200);
  }
  const blocked = await handler.speak(new Request('https://gorgona-one.com/api/tts', {
    method: 'POST',
    headers: { origin: 'https://gorgona-one.com', 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.77' },
    body: JSON.stringify({ text: 'Turn 31 should hit rate limit.', locale: 'en' })
  }));
  assert.equal(blocked.status, 429);
});
