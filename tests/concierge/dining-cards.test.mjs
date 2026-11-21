import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const {listingCards} = load('lib/ai/listingCards.mjs');
const {explicitBooking, bookingAnswer} = load('lib/ai/catalogueAnswer.mjs');
const {navigationItem, safeBooking} = load('lib/ai/session.mjs');
const {CATALOGUE} = load('lib/dining/catalogue.mjs');

const venueCards = query => listingCards(query, {sections: ['/restaurants-nightlife']});
const CONFIRMS = /\b(?:confirmed|booked for you|reserved for you|your table is)\b|забронировал|подтвердил|confirmad[oa]/iu;

test('dining answers offer at most three venues, each with its own booking page or Maps and a directory filter', () => {
  for (const query of ['romantic dinner restaurant', 'michelin restaurant', 'cheap restaurant', 'nightclub tonight', 'романтический ужин ресторан']) {
    const cards = venueCards(query);
    assert.ok(cards.length >= 1 && cards.length <= 3, query);
    for (const card of cards) {
      assert.ok(card.href.startsWith('/restaurants-nightlife/'), query);
      assert.ok(['book', 'maps'].includes(card.booking?.kind), query);
      assert.equal(new URL(card.booking.href).protocol, 'https:');
      assert.ok(card.more.startsWith('/restaurants-nightlife'), query);
    }
  }
});

test('a collection word keeps venue cards inside that collection', () => {
  const ids = name => CATALOGUE.find(venue => venue.name === name);
  for (const [query, collection] of [['michelin restaurant', 'michelin'], ['romantic dinner restaurant', 'date-night'], ['cheap restaurant', 'budget']]) {
    const cards = venueCards(query);
    assert.ok(cards.length, query);
    for (const card of cards) assert.ok(ids(card.title).collections.includes(collection), `${query}: ${card.title}`);
    assert.ok(cards.every(card => card.more === `/restaurants-nightlife?collection=${collection}`));
  }
});

test('a booking request is still a hand-off with the disclaimer, never a confirmation', () => {
  for (const [text, locale] of [['Book a table at Komodo for 4 on Friday', 'en'], ['Забронируй столик в Komodo на пятницу', 'ru'], ['Reserva una mesa en Komodo', 'es']]) {
    assert.equal(explicitBooking(text), true, text);
    const reply = bookingAnswer([{href: '/restaurants-nightlife/komodo-miami', title: 'Komodo'}], locale);
    assert.ok(!CONFIRMS.test(reply), reply);
  }
});

test('chat cards keep only https booking links and on-site filter links', () => {
  const base = {href: '/restaurants-nightlife/komodo-miami', title: 'Komodo'};
  const kept = navigationItem({...base, booking: {kind: 'book', href: 'https://www.sevenrooms.com/reservations/komodo', platform: 'sevenrooms'}, more: '/restaurants-nightlife?collection=michelin'});
  assert.equal(kept.booking.platform, 'sevenrooms');
  assert.equal(kept.more, '/restaurants-nightlife?collection=michelin');
  for (const href of ['javascript:alert(1)', 'http://www.sevenrooms.com/x', 'https://user:pw@example.com/', 'data:text/html,x'])
    assert.equal(safeBooking({kind: 'book', href}), null, href);
  assert.equal(safeBooking({kind: 'pay', href: 'https://example.com/'}), null);
  const stripped = navigationItem({...base, booking: {kind: 'book', href: 'javascript:alert(1)'}, more: 'https://evil.test/'});
  assert.equal(stripped.booking, undefined);
  assert.equal(stripped.more, undefined);
});
