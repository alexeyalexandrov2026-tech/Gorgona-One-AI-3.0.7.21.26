import '../../lib/savedServerCatalog.js';
// node --test tests/content/home-tickets.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { HOME_TICKETS, HOME_TICKET_IDS, smallPhoto } from '../../lib/homeTickets.js';
import { HOME_COPY, getHomeCopy } from '../../lib/homeCopy.js';
import { EVENT_CATEGORIES } from '../../lib/mockEventsData.js';
import { getTicketNetworkCatalogue } from '../../lib/ticketnetwork.js';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { savedSource, SAVED_MESSAGES } from '../../lib/savedCopy.js';

const LANGS = SUPPORTED_LANGUAGES.map((language) => language.code);
const publicFile = (path) => new URL(`../../public${path}`, import.meta.url);

test('every home ticket is a real Events subcategory with a live calendar', () => {
  // A ticket whose subcategory is gone is silently left off the page.
  assert.deepEqual(HOME_TICKETS.map((ticket) => ticket.id), HOME_TICKET_IDS);
  assert.ok(HOME_TICKETS.length >= 2, 'the block needs at least two tickets to turn');
  assert.equal(new Set(HOME_TICKETS.map((ticket) => ticket.href)).size, HOME_TICKETS.length, 'two tickets open the same page');
  for (const ticket of HOME_TICKETS) {
    const category = EVENT_CATEGORIES.find((item) => item.slug === ticket.category);
    assert.ok(category, ticket.id);
    assert.equal(ticket.href, `/events/category/${category.slug}`);
    assert.ok(['sports', 'concerts'].includes(ticket.group), `${ticket.id} group`);
    assert.ok(getTicketNetworkCatalogue(category.slug), `${ticket.id} has no ticket calendar`);
  }
});

test('home ticket photos ship with the build and stay light', () => {
  for (const ticket of HOME_TICKETS) {
    assert.match(ticket.image, /^\/images\//, `${ticket.id} photo must be a local file`);
    assert.ok(existsSync(publicFile(ticket.image)), `missing ${ticket.image}`);
    assert.ok(statSync(publicFile(ticket.image)).size <= 260 * 1024, `${ticket.image} is over 260 KB`);
    // The lighter copy phones are served.
    assert.ok(existsSync(publicFile(smallPhoto(ticket.image))), `missing ${smallPhoto(ticket.image)}`);
    assert.ok(statSync(publicFile(smallPhoto(ticket.image))).size <= 130 * 1024, `${smallPhoto(ticket.image)} is over 130 KB`);
    assert.ok(ticket.srcSet.includes(smallPhoto(ticket.image)) && ticket.srcSet.includes(`${ticket.image} ${ticket.size[0]}w`), `${ticket.id} srcSet`);
  }
});

test('the ticket block is written and translated for every language', () => {
  assert.deepEqual(Object.keys(HOME_COPY.en.tickets.lines).sort(), [...HOME_TICKET_IDS].sort());
  // No dates, prices or availability on the home page: the calendar knows them.
  for (const line of Object.values(HOME_COPY.en.tickets.lines)) assert.doesNotMatch(line, /\d|\$|sold out|available|from /i, line);
  for (const lang of LANGS) {
    const text = getHomeCopy(lang).tickets;
    assert.match(text.show, /\{n\}/, `${lang} show`);
    assert.match(text.show, /\{total\}/, `${lang} show`);
    for (const key of ['title', 'sub', 'get', 'all', 'label', 'pause', 'play']) {
      assert.ok(text[key].trim(), `${lang} ${key}`);
      // Short words can match English ("Pause" in German); sentences cannot.
      if (lang !== 'en' && ['title', 'sub'].includes(key)) assert.notEqual(text[key], HOME_COPY.en.tickets[key], `${lang} ${key} is still English`);
    }
    for (const id of HOME_TICKET_IDS) {
      assert.ok(text.lines[id].trim(), `${lang} line ${id}`);
      if (lang !== 'en') assert.notEqual(text.lines[id], HOME_COPY.en.tickets.lines[id], `${lang} line ${id} is still English`);
    }
  }
  // The pillar tag above each name is borrowed from the /events catalog; if
  // that source text is ever reworded, the tag would quietly stay English.
  const english = new Set(Object.values(SAVED_MESSAGES.en));
  for (const tag of ['Sports', 'Concerts']) assert.ok(english.has(tag), `"${tag}" is no longer in the saved catalog`);
  assert.notEqual(savedSource('ru', 'Sports'), 'Sports');
});
