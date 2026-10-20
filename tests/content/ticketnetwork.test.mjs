import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTicketNetworkUrl, getTicketNetworkCatalogue, getTicketNetworkFallback, TICKETNETWORK_PID } from '../../lib/ticketnetwork.js';
import { parseTicketNetworkQuery, buildTicketNetworkSearch, normalizeTicketNetworkResults, ticketNetworkToday } from '../../lib/ticketnetworkSearch.js';
import { EVENT_CATEGORIES, EVENT_CATEGORY_GROUPS } from '../../lib/mockEventsData.js';
import { GET } from '../../app/api/events/ticketnetwork/route.js';

const now = new Date('2026-10-20T12:00:00Z');
const query = params => parseTicketNetworkQuery(new URLSearchParams({ category: 'nba', ...params }), now);

test('CJ tracking keeps the verified property, unique campaigns and complete encoded destination', () => {
  const destination = 'https://www.ticketnetwork.com/tickets/123?one=1&two=2';
  const url = new URL(buildTicketNetworkUrl(destination, 'GorgonaSports'));
  assert.equal(TICKETNETWORK_PID, '101825540');
  assert.equal(url.origin + url.pathname, 'https://www.tkqlhce.com/click-101825540-10793961');
  assert.equal(url.searchParams.get('url'), destination);
  assert.equal(url.searchParams.get('sid'), 'GorgonaSports');
  for (const target of ['https://example.com', 'https://www.ticketnetwork.com.evil.test/', 'http://www.ticketnetwork.com/', 'javascript:alert(1)', 'https://user:pass@www.ticketnetwork.com/', 'https://www.ticketnetwork.com:8443/']) assert.throws(() => buildTicketNetworkUrl(target));
  for (const sid of ['', 'sports&url=other', '<script>', 'a'.repeat(101)]) assert.throws(() => buildTicketNetworkUrl(undefined, sid));
});

test('every visible category and the Events overview has a unique tracked catalogue and a Miami default', () => {
  const sids = new Set();
  for (const category of [{ slug: 'events' }, ...EVENT_CATEGORY_GROUPS, ...EVENT_CATEGORIES]) {
    const catalogue = getTicketNetworkCatalogue(category.slug);
    assert.ok(catalogue, category.slug);
    assert.ok(!sids.has(catalogue.sid)); sids.add(catalogue.sid);
    const search = buildTicketNetworkSearch(query({ category: category.slug }));
    assert.match(search.get('filter_by'), /venue_state_province_short:=FL/);
    for (const city of ['Miami', 'Miami Gardens', 'Sunrise', 'Fort Lauderdale']) assert.ok(search.get('filter_by').includes(`\`${city}\``));
    assert.match(search.get('filter_by'), /tickets_available:>0/);
    assert.equal(new URL(getTicketNetworkFallback(category.slug)).searchParams.get('sid'), catalogue.sid);
  }
  assert.equal(new URL(getTicketNetworkFallback('events')).searchParams.get('url'), 'https://www.ticketnetwork.com/');
  for (const invalid of ['constructor', '__proto__', 'made-up']) assert.equal(getTicketNetworkCatalogue(invalid), null);
});

test('the new search preserves sports, mixed-genre and Formula 1 category boundaries', () => {
  const expected = { nba: 'major_category:=`NBA`', nfl: 'major_category:=`NFL`', nhl: 'major_category:=`NHL`', mls: 'grandchild_category:=`Professional (MLS)`', nascar: 'grandchild_category:=NASCAR', 'pop-rock': 'child_category:=`Pop / Rock`' };
  for (const [category, filter] of Object.entries(expected)) assert.ok(buildTicketNetworkSearch(query({ category })).get('filter_by').includes(filter));
  for (const category of ['hip-hop-rnb', 'classical-opera', 'festivals', 'other-live']) assert.match(buildTicketNetworkSearch(query({ category })).get('filter_by'), / \|\| /);
  assert.equal(buildTicketNetworkSearch(query({ category: 'formula-1' })).get('q'), 'Formula 1');
  assert.equal(buildTicketNetworkSearch(query({ category: 'formula-1', performer: 'Miami' })).get('q'), 'Formula 1 Miami');
});

test('geography changes only when requested, dates use the Miami calendar day, and pagination stays bounded', () => {
  assert.equal(ticketNetworkToday(new Date('2026-10-20T02:00:00Z')), '2026-10-19');
  const florida = buildTicketNetworkSearch(query({ area: 'florida', performer: 'Panthers', from: '2026-11-01', to: '2026-11-30', page: '2' }));
  assert.match(florida.get('filter_by'), /venue_state_province_short:=FL/);
  assert.doesNotMatch(florida.get('filter_by'), /venue_city/);
  assert.equal(florida.get('q'), 'Panthers'); assert.equal(florida.get('page'), '2');
  assert.match(florida.get('filter_by'), new RegExp(`event_local_timestamp:<${Date.parse('2026-12-01') / 1000}`));
  const all = buildTicketNetworkSearch(query({ area: 'all', city: 'New York' }));
  assert.doesNotMatch(all.get('filter_by'), /venue_state_province_short/);
  assert.match(all.get('filter_by'), /venue_city:=`New York`/);
  assert.equal(all.get('per_page'), '10');
});

test('invalid dates, injection, raw upstream parameters and duplicate query fields are rejected', async () => {
  for (const params of [
    { category: '__proto__' }, { area: 'somewhere' }, { from: '2026-02-30' }, { from: '2026-10-19' },
    { from: '2026-12-01', to: '2026-11-01' }, { to: '2031-01-01' }, { city: 'Miami` || tickets_available:>0' },
    { performer: 'a'.repeat(101) }, { city: 'bad\ncity' }, { page: '0' }, { page: '101' }, { page: '2.5' },
    { filter_by: 'arbitrary' }, { url: 'http://internal/' }, { consumerKey: 'anything' }
  ]) assert.throws(() => query(params), JSON.stringify(params));
  assert.throws(() => parseTicketNetworkQuery(new URLSearchParams('category=nba&category=nhl'), now));
  const response = await GET(new Request('https://gorgona-one.com/api/events/ticketnetwork?category=__proto__'));
  assert.equal(response.status, 400); assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('supplier rows become tracked links with venue-local dates and no invented price or scarcity claims', () => {
  const data = normalizeTicketNetworkResults({ found: 11, hits: [{ document: {
    event_id: 123, event_name: 'TEST fixture <event>', event_local_timestamp: Date.parse('2026-11-02T19:30:00Z') / 1000,
    venue_name: 'TEST venue', venue_city: 'Miami', venue_state_province_short: 'FL', min_ticket_price: 99,
    slugs: { event_name: 'test-event', event_date_weekday_month_day: 'mon-nov-2', venue_name: 'test-venue' }
  } }], facet_counts: [{ field_name: 'venue_city', counts: [{ value: 'Miami' }] }] }, query({}));
  assert.equal(data.events[0].localDateTime, '2026-11-02T19:30:00');
  const url = new URL(data.events[0].url);
  assert.equal(url.searchParams.get('sid'), 'Gorgonanba');
  assert.equal(url.searchParams.get('url'), 'https://www.ticketnetwork.com/tickets/123/test-event-tickets-mon-nov-2-2026-test-venue');
  assert.ok(!Object.hasOwn(data.events[0], 'price'));
  assert.equal(data.hasMore, true); assert.deepEqual(data.cities, ['Miami']);
  assert.throws(() => normalizeTicketNetworkResults({ found: 1, hits: [{ document: {} }], facet_counts: [] }, query({})));
  assert.throws(() => normalizeTicketNetworkResults({ message: 'upstream failed' }, query({})));
  assert.throws(() => normalizeTicketNetworkResults({ found: 3, hits: [], facet_counts: [] }, query({})), /Incomplete/);
});
