import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { HOME_PROMPT_LOCALES, getHomePromptPool, pickFreshHomeChips } from '../../lib/homePromptPool.mjs';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('homePromptPool covers all 16 site languages with 16 unique concise prompts each', () => {
  const expected = SUPPORTED_LANGUAGES.map((l) => l.code).sort();
  assert.deepEqual([...HOME_PROMPT_LOCALES].sort(), expected);
  for (const code of expected) {
    const pool = getHomePromptPool(code);
    assert.equal(pool.length, 16, `locale ${code} should have 16 prompts`);
    assert.equal(new Set(pool).size, 16, `locale ${code} prompts must be unique`);
    for (const item of pool) {
      assert.ok(typeof item === 'string' && item.trim().length >= 4 && item.length <= 42, `unexpected length in ${code}: ${item}`);
    }
  }
});

test('pickFreshHomeChips returns fresh, non-repeating batches and rotates smoothly', () => {
  let seed = 0.17;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const first = pickFreshHomeChips('ru', 4, { random: rng });
  assert.equal(first.length, 4);
  assert.equal(new Set(first).size, 4);

  const second = pickFreshHomeChips('ru', 4, { exclude: first, random: rng });
  assert.equal(second.length, 4);
  assert.equal(new Set(second).size, 4);
  for (const item of second) {
    assert.ok(!first.includes(item), `second batch should not repeat first batch item: ${item}`);
  }

  const mobileBatch = pickFreshHomeChips('ru', 8, { random: rng });
  assert.equal(mobileBatch.length, 8);
  assert.equal(new Set(mobileBatch).size, 8);
});

test('HomeHero wires auto-drift marquees for both suggestion chips and bottom picks without hiding Telegram/Sphere', () => {
  const hero = read('app/components/home/HomeHero.jsx');
  assert.match(hero, /pickFreshHomeChips/);
  assert.match(hero, /const suggRail = useAutoDriftRail\(/);
  assert.match(hero, /const picksRail = useAutoDriftRail\(/);
  assert.doesNotMatch(hero, /heroBarVisible/);

  const css = read('app/design-system.css');
  assert.match(css, /\.g1-hero-sugg\s*\{[^}]*flex-wrap:\s*nowrap;/);
  assert.match(css, /\.g1-hero-sugg\.is-looping\s*\{[^}]*justify-content:\s*flex-start;/);
  assert.match(css, /\.g1-hero-picks\.is-looping\s*\{[^}]*justify-content:\s*flex-start;/);

  const overlays = read('app/ai-overlays.css');
  assert.doesNotMatch(overlays, /data-hero-bar-visible/);
});
