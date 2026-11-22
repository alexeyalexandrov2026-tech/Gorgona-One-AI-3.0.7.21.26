// Reusable VIP Golden Eval Suite against authenticated staging (/api/chat).
// Never prints secrets; reads DASHBOARD_STAGING_ACCESS_SECRET from
// CONCIERGE_PRIVATE_DIR (worker-secrets.json) or ~/.miami-elio-private/staging-gate.json.
//
// Usage:
//   node scripts/concierge/golden-eval.mjs --quick   (10 high-signal VIP scenarios)
//   node scripts/concierge/golden-eval.mjs           (full suite, respect staging quota)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const STAGING_BASE = process.env.CONCIERGE_TEST_BASE || 'https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev';
assert.equal(STAGING_BASE, 'https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev', 'Golden eval runs strictly against staging.');

function loadGateSecret() {
  const candidates = [
    process.env.CONCIERGE_PRIVATE_DIR && path.join(process.env.CONCIERGE_PRIVATE_DIR, 'worker-secrets.json'),
    path.join(os.homedir(), '.miami-elio-private', 'staging-gate.json')
  ].filter(Boolean);
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const secret = JSON.parse(fs.readFileSync(file, 'utf8'))?.DASHBOARD_STAGING_ACCESS_SECRET;
    if (typeof secret === 'string' && secret.length >= 32) return secret;
  }
  throw new Error('Missing staging gate secret. Set CONCIERGE_PRIVATE_DIR or save ~/.miami-elio-private/staging-gate.json.');
}

const secret = loadGateSecret();
const basicAuth = 'Basic ' + Buffer.from('preview:' + secret).toString('base64');
let stagingCookie = null;

function authHeaders(forceBasic = false) {
  return (!forceBasic && stagingCookie) ? { Cookie: stagingCookie } : { Authorization: basicAuth };
}

async function sendChat(messages, locale, { forceBasic = false } = {}) {
  const t0 = performance.now();
  const res = await fetch(`${STAGING_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(forceBasic) },
    body: JSON.stringify({ locale, messages }),
    redirect: 'error',
    signal: AbortSignal.timeout(25000)
  });
  const ttfbMs = Math.round(performance.now() - t0);
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && setCookie.startsWith('__Host-miami-staging=')) {
    stagingCookie = setCookie.split(';')[0];
  }
  const data = await res.json().catch(() => null);
  const totalMs = Math.round(performance.now() - t0);
  return { status: res.status, ttfbMs, totalMs, cfRay: res.headers.get('cf-ray'), data };
}

const SCENARIOS = [
  { id: 'E01-ru-football', quick: true, locale: 'ru', turns: ['Найди два билета на футбол в воскресенье'], expectSection: '/events', expectListingIn: ['/events/category/mls', '/events/category/nfl'], expectModel: true },
  { id: 'E02-en-heat-live', quick: true, locale: 'en', turns: ['Miami Heat tickets this weekend'], expectSection: '/events', expectListingPrefix: '/events/category/nba', expectModel: true },
  { id: 'E03-es-concert', quick: true, locale: 'es', turns: ['Quiero entradas para un concierto en Miami'], expectSection: '/events', expectListingPrefix: '/events/category/concerts', expectModel: true },
  { id: 'C01-ru-lambo', quick: true, locale: 'ru', turns: ['Найди Lamborghini на три дня'], expectSection: '/rentals', expectDistinctCarFamilies: 3, expectModel: true },
  { id: 'C02-ru-suv-budget', quick: true, locale: 'ru', turns: ['Нужен SUV до $700 в день'], expectSection: '/rentals', expectMaxCarPrice: 700, expectModel: true },
  { id: 'X01-ru-helicopter', quick: true, locale: 'ru', turns: ['Хочу вертолёт над Майами'], expectSection: '/experiences', expectFirstHref: '/experiences/viator/231628p7', expectModel: true },
  { id: 'D01-ru-brickell-michelin', quick: true, locale: 'ru', turns: ['Посоветуй ресторан', 'в Brickell, с Мишленом'], expectSection: '/restaurants-nightlife', expectFirstHref: '/restaurants-nightlife/elcielo-miami', expectModel: true },
  { id: 'S01-ru-session-memory', quick: true, locale: 'ru', turns: ['Нас шестеро, прилетаем в пятницу, живём в Brickell, бюджет на авто до $800/день', 'Посоветуй ресторан', 'И подбери внедорожник'], expectSection: '/rentals', expectMaxCarPrice: 800, expectModel: true },
  { id: 'F01-ru-art-basel', quick: true, locale: 'ru', turns: ['Когда Art Basel?'], expectFact: true, expectText: /2026/ },
  { id: 'B01-ru-book-yacht', quick: true, locale: 'ru', turns: ['Забронируй яхту и спиши с карты'], expectHandoff: true, expectSection: '/yachts', expectListingsCount: 0, expectModel: true },
  { id: 'Y01-ru-yacht-8', quick: false, locale: 'ru', turns: ['Мне нужна яхта на субботу для восьми человек'], expectSection: '/yachts', expectModel: true },
  { id: 'T01-ru-flights', quick: false, locale: 'ru', turns: ['Нужны авиабилеты бизнес-классом в Майами'], expectSection: '/travel', expectListingPrefix: '/travel/ovago', expectModel: true },
  { id: 'J01-ru-private-jet', quick: false, locale: 'ru', turns: ['Найди частный самолёт из Майами в Нью-Йорк завтра'], expectSection: '/private-jets', expectModel: true },
  { id: 'G01-ru-neighborhoods', quick: false, locale: 'ru', turns: ['Чем отличаются Brickell, South Beach и Design District?'], expectAction: 'guide', expectModel: true },
  { id: 'P01-en-plan-rain', quick: false, locale: 'en', turns: ['Plan 2 days in Miami with kids', 'What if it rains?'], expectAction: 'plan', expectModel: true },
  { id: 'F02-ru-mixed-basel-lambo', quick: false, locale: 'ru', turns: ['Когда Art Basel и найди Lamborghini на эти даты'], expectSection: '/rentals', expectText: /Art Basel/i, expectModel: true }
];

const quick = process.argv.includes('--quick');
const coldFirst = process.argv.includes('--cold-first');
const selected = quick ? SCENARIOS.filter((s) => s.quick) : SCENARIOS;

if (!coldFirst) {
  const health = await fetch(`${STAGING_BASE}/__dashboard_staging/health`, { headers: { Authorization: basicAuth }, redirect: 'error', signal: AbortSignal.timeout(15000) });
  assert.equal(health.status, 200, `Staging health failed: ${health.status}`);
  const cookie = health.headers.get('set-cookie')?.split(';')[0];
  if (cookie?.startsWith('__Host-miami-staging=')) stagingCookie = cookie;
}

const results = [];
for (let idx = 0; idx < selected.length; idx++) {
  const sc = selected[idx];
  const history = [];
  let last = null;
  const turns = [];
  for (let t = 0; t < sc.turns.length; t++) {
    const text = sc.turns[t];
    history.push({ role: 'user', content: text });
    last = await sendChat(history, sc.locale, { forceBasic: coldFirst && idx === 0 && t === 0 });
    turns.push({
      user: text, status: last.status, ttfbMs: last.ttfbMs, totalMs: last.totalMs,
      source: last.data?.source, decidedBy: last.data?.decidedBy, action: last.data?.action,
      handoff: Boolean(last.data?.handoff),
      cards: (last.data?.cards || []).map((c) => c.href),
      listings: (last.data?.listings || []).map((l) => ({ href: l.href, title: l.title, price: l.price })),
      reply: last.data?.reply
    });
    if (last.data?.reply && last.data?.error !== true) history.push({ role: 'assistant', content: last.data.reply });
  }
  const d = last.data || {};
  const cards = (d.cards || []).map((c) => c.href);
  const listings = d.listings || [];
  const hrefs = listings.map((l) => l.href);
  const issues = [];
  if (last.status !== 200) issues.push(`HTTP ${last.status}`);
  if (sc.expectFact && d.decidedBy !== 'fact') issues.push(`expected fact, got ${d.decidedBy}`);
  if (sc.expectHandoff && d.handoff !== true) issues.push('expected handoff=true');
  if (sc.expectSection && !cards.includes(sc.expectSection)) issues.push(`missing card ${sc.expectSection}`);
  if (sc.expectAction && d.action !== sc.expectAction) issues.push(`expected action ${sc.expectAction}, got ${d.action}`);
  if (sc.expectFirstHref && hrefs[0] !== sc.expectFirstHref) issues.push(`expected first href ${sc.expectFirstHref}, got ${hrefs[0]}`);
  if (sc.expectListingPrefix && !hrefs.some((h) => h.startsWith(sc.expectListingPrefix))) issues.push(`missing listing prefix ${sc.expectListingPrefix} in ${JSON.stringify(hrefs)}`);
  if (sc.expectListingIn && !sc.expectListingIn.every((h) => hrefs.some((got) => got === h || got.startsWith(h + '#')))) issues.push(`missing ${JSON.stringify(sc.expectListingIn)} in ${JSON.stringify(hrefs)}`);
  if (sc.expectListingsCount !== undefined && hrefs.length !== sc.expectListingsCount) issues.push(`expected ${sc.expectListingsCount} listings, got ${hrefs.length}`);
  if (sc.expectDistinctCarFamilies) {
    const fams = new Set(listings.map((l) => (l.title.match(/urus|hurac|aventador|revuelto|gallardo|temerario/i)?.[0] || l.title).toLowerCase()));
    if (fams.size < sc.expectDistinctCarFamilies) issues.push(`expected ${sc.expectDistinctCarFamilies} car families`);
  }
  if (sc.expectMaxCarPrice) {
    if (!listings.length) issues.push('expected >=1 car within budget');
    for (const l of listings) {
      const m = String(l.price || '').match(/(\d{1,3}(?:,\d{3})+|\d{2,6})/);
      const num = m ? Number(m[1].replace(/,/g, '')) : null;
      if (!num || num > sc.expectMaxCarPrice) issues.push(`car ${l.title} (${l.price}) exceeded $${sc.expectMaxCarPrice}`);
    }
  }
  if (sc.expectText && !sc.expectText.test(d.reply || '')) issues.push(`reply mismatch ${sc.expectText}`);
  const modelHit = sc.expectModel ? d.source === 'workers-ai' : null;
  const entry = { id: sc.id, pass: issues.length === 0, modelHit, ttfbMs: last.ttfbMs, source: d.source, decidedBy: d.decidedBy, action: d.action, issues, turns };
  results.push(entry);
  const tag = entry.pass ? (modelHit === false ? 'WARN(fallback)' : 'PASS') : 'FAIL';
  console.log(`${tag.padEnd(14)} ${sc.id.padEnd(26)} TTFB=${String(last.ttfbMs).padStart(4)}ms src=${String(d.source).padEnd(10)} dec=${String(d.decidedBy).padEnd(7)} act=${String(d.action).padEnd(9)} ${issues.join('; ')}`);
}

const health = await fetch(`${STAGING_BASE}/__dashboard_staging/health`, { headers: authHeaders(), redirect: 'error', signal: AbortSignal.timeout(15000) });
const healthBody = await health.json().catch(() => null);
const modelChecked = results.filter((r) => r.modelHit !== null);
const modelHits = modelChecked.filter((r) => r.modelHit).length;
const llmTimes = results.filter((r) => r.source === 'workers-ai').map((r) => r.ttfbMs).sort((a, b) => a - b);
const summary = {
  base: STAGING_BASE,
  commit: healthBody?.commit || null,
  measuredAt: new Date().toISOString(),
  total: results.length,
  pass: results.filter((r) => r.pass).length,
  fail: results.filter((r) => !r.pass).length,
  modelHits,
  modelChecked: modelChecked.length,
  modelHitRate: modelChecked.length ? Number((modelHits / modelChecked.length).toFixed(3)) : null,
  llmTtfbP50Ms: llmTimes.length ? llmTimes[Math.floor(llmTimes.length * 0.5)] : null,
  llmTtfbP95Ms: llmTimes.length ? llmTimes[Math.min(llmTimes.length - 1, Math.floor(llmTimes.length * 0.95))] : null
};

if (process.env.GOLDEN_EVAL_OUTPUT) {
  fs.mkdirSync(path.dirname(process.env.GOLDEN_EVAL_OUTPUT), { recursive: true });
  fs.writeFileSync(process.env.GOLDEN_EVAL_OUTPUT, JSON.stringify({ summary, results }, null, 2) + '\n');
}
console.log('\nSUMMARY:', JSON.stringify(summary, null, 2));
if (summary.fail > 0) process.exit(1);
