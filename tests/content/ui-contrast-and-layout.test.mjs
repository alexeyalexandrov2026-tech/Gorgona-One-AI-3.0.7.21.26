import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('globals.css keeps active filter pills legible on dark ocean surfaces', () => {
  const css = read('app/globals.css');
  assert.match(
    css,
    /body \.bg-g1-card:not\(\[data-light-surface\],\s*\[data-light-surface\] \*,\s*\[aria-current="page"\],\s*\[aria-pressed="true"\]\)/,
    'active chip pills must not have their light background overridden by the dark glass gradient'
  );
  assert.match(
    css,
    /body select:not\(\[data-light-surface\],\s*\[data-light-surface\] \*\) option/,
    'native dark select dropdown options must define explicit contrast colors'
  );
});

test('g1 Icon registry includes heart path required by SaveButton', () => {
  const icons = read('app/components/g1/icons.jsx');
  assert.match(icons, /\bheart\s*:\s*<path\b/, 'SaveButton renders <Icon name="heart" />, so icons.jsx must define heart');
});

test('Experiences catalogue uses compact cards and 4-column desktop grid', () => {
  const content = read('app/experiences/ExperiencesContent.jsx');
  assert.match(content, /xl:grid-cols-4/);
  assert.match(content, /<ExperienceCard[^>]*\bcompact\b/);
  const showcase = read('app/experiences/ExperienceShowcase.jsx');
  assert.doesNotMatch(showcase, /460px/, 'Experiences hero showcase should stay compact');
});

test('dark-surface events and trip components avoid low-contrast dark-on-dark or white-on-white styles', () => {
  const eventsFeed = read('app/events/TicketNetworkEvents.jsx');
  assert.doesNotMatch(eventsFeed, /\[color-scheme:light\]/);
  assert.match(eventsFeed, /\[color-scheme:dark\]/);
  assert.doesNotMatch(eventsFeed, /\bbg-villa-obsidian\b/);

  const providers = read('app/events/TicketProviders.jsx');
  assert.doesNotMatch(providers, /\bbg-white\b[^\n]*\btext-villa-obsidian\b/);

  const categoryPage = read('app/events/category/[category]/page.js');
  assert.doesNotMatch(categoryPage, /\bbg-white\b[^\n]*\btext-villa-obsidian\b/);

  const tripRoom = read('app/components/dashboard/LiveTripRoom.jsx');
  assert.doesNotMatch(tripRoom, /\bbg-white(?:\/\d+)?\b[^\n]*\btext-villa-obsidian\b/);
});
