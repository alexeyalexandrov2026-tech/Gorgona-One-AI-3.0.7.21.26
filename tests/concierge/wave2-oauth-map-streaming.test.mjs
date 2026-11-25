import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from './load.cjs';
const { extractPartialJsonReply, workersAiChat } = load('lib/ai/workersBrain.mjs');
import {
  projectMiamiCoord,
  haversineKm,
  estimateMiamiMinutes,
  resolveMiamiRouteStops,
  MIAMI_MAP_COPY
} from '../../lib/ai/miamiMapData.mjs';
import { SOCIAL_AUTH_COPY } from '../../lib/socialAuthCopy.mjs';
import {
  DISPLAY_CURRENCIES,
  formatDisplayCurrency,
  CORPORATE_CHECKOUT_COPY
} from '../../lib/legal/corporateCheckout.mjs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';

test('Wave 2: incremental JSON reply streaming decodes partial UTF-8 & escaped text cleanly', () => {
  assert.equal(extractPartialJsonReply('{"version":3,"action":"plan","rep'), '');
  assert.equal(extractPartialJsonReply('{"version":3,"reply":"Уикенд в Майами'), 'Уикенд в Майами');
  assert.equal(
    extractPartialJsonReply('{"version":3,"reply":"Line 1\\n\\"VIP\\" \\u00241,200\\'),
    'Line 1\n"VIP" $1,200'
  );
  assert.equal(
    extractPartialJsonReply('{"version":3,"reply":"Done","sections":["/yachts"]}'),
    'Done'
  );
});

test('Wave 2: workersAiChat streams live deltas from ReadableStream SSE while keeping grounded validation', async () => {
  const jsonPayload = JSON.stringify({
    version: 3,
    action: 'recommend',
    sections: ['/rentals'],
    reply: 'We have Lamborghini Urus options in Miami ready for your weekend.'
  });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const part1 = jsonPayload.slice(0, 58);
      const part2 = jsonPayload.slice(58, 92);
      const part3 = jsonPayload.slice(92);
      for (const part of [part1, part2, part3]) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: part } }] })}\n\n`));
      }
      controller.enqueue(enc.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  const deltas = [];
  const env = {
    APP_ENV: 'dashboard-staging',
    CONCIERGE_WORKERS_AI_ENABLED: 'true',
    CONCIERGE_AI: {
      run: async (_model, input) => {
        assert.equal(input.stream, true);
        return stream;
      }
    }
  };
  const result = await workersAiChat(
    env,
    { messages: [{ role: 'user', content: 'Show me Lamborghini Urus in Miami' }], locale: 'en' },
    {
      authorize: async () => true,
      onReplyDelta: (chunk) => deltas.push(chunk)
    }
  );
  assert.equal(result.ok, true);
  assert.ok(deltas.length >= 2, 'must emit incremental deltas before stream ends');
  assert.equal(deltas.join(''), 'We have Lamborghini Urus options in Miami ready for your weekend.');
});

test('Wave 2: Offline-First GPS Miami Route Map projection, distances, free nav links, and 16-language copy', () => {
  const opf = { lat: 25.9070, lng: -80.2784 };
  const komodo = { lat: 25.7662, lng: -80.1912 };
  const p = projectMiamiCoord(opf.lat, opf.lng);
  assert.equal(p.inBounds, true);
  assert.ok(p.x > 12 && p.x < 468);
  assert.ok(p.y > 12 && p.y < 528);

  const km = haversineKm(opf, komodo);
  assert.ok(km > 15 && km < 22, `expected ~18 km OPF->Brickell, got ${km}`);
  const mins = estimateMiamiMinutes(opf, komodo, 'car');
  assert.ok(mins >= 25 && mins <= 60);

  const sig = resolveMiamiRouteStops({ locale: 'ru' });
  assert.equal(sig.isSignaturePreview, true);
  assert.equal(sig.stops.length, 4);
  assert.match(sig.stops[0].nav.appleMaps, /^https:\/\/maps\.apple\.com\//);
  assert.match(sig.stops[0].nav.googleMaps, /^https:\/\/www\.google\.com\/maps\/dir\//);
  assert.match(sig.stops[0].nav.waze, /^https:\/\/waze\.com\/ul\?/);

  const custom = resolveMiamiRouteStops({
    messages: [{ role: 'user', content: 'OPF FBO arrival, Lamborghini Urus, Miami Beach Marina yacht and Komodo dinner' }],
    locale: 'ru'
  });
  assert.equal(custom.isSignaturePreview, false);
  assert.ok(custom.stops.length >= 3);
});

test('Social OAuth, Multicurrency, Corporate Checkout 16-language integrity & middleware GPS/auth rules', () => {
  const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
  for (const [label, dict] of [
    ['MIAMI_MAP_COPY', MIAMI_MAP_COPY],
    ['SOCIAL_AUTH_COPY', SOCIAL_AUTH_COPY],
    ['CORPORATE_CHECKOUT_COPY', CORPORATE_CHECKOUT_COPY]
  ]) {
    const enKeys = Object.keys(dict.en).sort();
    for (const lang of langs) {
      assert.ok(dict[lang], `${label} missing ${lang}`);
      assert.deepEqual(Object.keys(dict[lang]).sort(), enKeys, `${label}.${lang}`);
      for (const key of enKeys) {
        assert.ok(dict[lang][key].trim().length > 0, `${label}.${lang}.${key} empty`);
        assert.equal(/concierge|консьерж/i.test(dict[lang][key]), false, `${label}.${lang}.${key} contains concierge`);
      }
    }
  }

  assert.equal(DISPLAY_CURRENCIES.length, 5);
  assert.equal(formatDisplayCurrency(100000, 'USD'), '$1,000');
  assert.equal(formatDisplayCurrency(100000, 'EUR'), '≈ €920');
  assert.equal(formatDisplayCurrency(100000, 'GBP'), '≈ £790');

  const mw = fs.readFileSync(new URL('../../middleware.js', import.meta.url), 'utf8');
  assert.match(mw, /geolocation=\(self\)/);
  assert.match(mw, /'\/auth'/);
});
