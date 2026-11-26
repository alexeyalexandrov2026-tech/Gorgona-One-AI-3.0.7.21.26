import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import load from './load.cjs';

const { alignPlanWithReply } = load('lib/ai/listingCards.mjs');
const read = (rel) => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

test('Step 1 Simplify: alignPlanWithReply aligns AiPlan car candidates to vehicles ELIO actually recommended', () => {
  const initialPlan = {
    version: 1,
    guests: 4,
    requestable: true,
    singleCarPackage: true,
    sections: [
      {
        href: '/rentals',
        label: 'Cars',
        candidates: [
          { kind: 'car', slug: 'lamborghini-urus-se', href: '/rentals/lamborghini-urus-se', title: 'Lamborghini Urus SE', price: '$1,500/day' }
        ]
      }
    ]
  };
  const reply = 'For 4 guests in Brickell, Cadillac Escalade ($400/day) and Mercedes G63 AMG ($800/day) fit luggage comfortably.';
  const aligned = alignPlanWithReply(initialPlan, reply, {
    extraEntities: [
      { type: 'Car', href: '/rentals/cadillac-escalade', title: 'Cadillac Escalade', price: '$400/day', subtitle: 'Miami, FL' },
      { type: 'Car', href: '/rentals/mercedes-g63-amg', title: 'Mercedes G63 AMG', price: '$800/day', subtitle: 'Miami, FL' }
    ]
  });
  assert.equal(aligned.sections[0].candidates[0].href, '/rentals/cadillac-escalade');
  assert.equal(aligned.sections[0].candidates[0].kind, 'car');
  assert.equal(aligned.sections[0].candidates[0].slug, 'cadillac-escalade');
  assert.equal(aligned.sections[0].candidates[1].href, '/rentals/mercedes-g63-amg');
});

test('Step 1 Simplify: mobile floating stack hidden, Google Play moved off mobile bar, calm ELIO & /discovery UX, dead AI files removed', () => {
  const css = read('app/ai-overlays.css');
  assert.match(css, /@media\s*\(max-width:\s*639px\)\s*\{\s*\.aitg,\s*\.aiwa\s*\{\s*display:\s*none;\s*\}\s*\}/);

  const header = read('app/components/Header.jsx');
  assert.match(header, /<GetTheApp className="hidden sm:inline-flex" \/>/);
  assert.match(header, /<GetTheApp className="inline-flex sm:hidden" \/>/);

  const room = read('app/components/ai/ConciergeRoom.jsx');
  assert.match(room, /\{hasThread && \(\s*<MiamiRouteMap/);
  assert.match(room, /section\.href !== '\/discovery'/);

  const card = read('app/components/ai/AiActionCard.jsx');
  assert.match(card, /data-pkg-toggle="true"/);
  assert.match(card, /data-timeline-toggle="true"/);

  const convo = read('app/components/ai/AiConversation.jsx');
  assert.match(convo, /data-share-toggle="true"/);

  const route = read('app/api/chat/route.js');
  assert.match(route, /alignPlanWithReply/);
  assert.doesNotMatch(route, /semanticRerankWithEmbeddings/, 'redundant post-LLM bge-m3 call must stay removed');

  assert.equal(fs.existsSync(new URL('../../app/components/ai/GorgonaOneAI.jsx', import.meta.url)), false);
  assert.equal(fs.existsSync(new URL('../../app/components/ai/DiscoveryRoom.jsx', import.meta.url)), false);
});
