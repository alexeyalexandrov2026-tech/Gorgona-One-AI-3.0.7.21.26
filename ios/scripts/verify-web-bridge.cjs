// Checks the page script the iOS app injects into the site, and the site's
// app-mode styling, in an iPhone-sized browser. The script is read straight
// out of the Swift source, so what is tested is what ships.
//
//   npx next build && npx next start -p 3100 &
//   node ios/scripts/verify-web-bridge.cjs [screenshot-folder]
//
// BASE_URL overrides the address (default http://localhost:3100).
// CHROMIUM_PATH uses an already installed Chromium instead of Playwright's download.
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const repo = path.resolve(__dirname, '..', '..');
const swift = fs.readFileSync(path.join(repo, 'ios/MiamiElio/Web/WebViewModel.swift'), 'utf8');
const policy = fs.readFileSync(path.join(repo, 'ios/MiamiElioKit/Sources/MiamiElioKit/RoutePolicy.swift'), 'utf8');
const start = swift.indexOf('return """', swift.indexOf('private static func bootstrapScript')) + 'return """'.length;
const template = swift.slice(start, swift.indexOf('"""', start));
const restricted = [...policy.slice(policy.indexOf('defaultRestrictedPaths = ['), policy.indexOf(']', policy.indexOf('defaultRestrictedPaths = ['))).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const script = (locale) => template
  .replace('\\(hostList)', `'${host}'`)
  .replace('\\(restrictedList)', restricted.map((p) => `'${p}'`).join(','))
  .replace('\\(messageChannel)', 'miamiElio')
  .replace('\\(SiteLocale.storageKey)', 'gorgona-locale')
  .replace('\\(locale)', locale);

const base = (process.env.BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
const host = new URL(base).hostname;
const out = process.argv[2];
if (/\\\(/.test(script('ru'))) throw new Error('unresolved Swift interpolation left in the script');
const shot = (page, name) => (out ? page.screenshot({ path: path.join(out, name) }) : Promise.resolve());
const visible = (page, selector) => page.locator(selector).first().isVisible().catch(() => false);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

(async () => {
  // CHROMIUM_PATH points at a browser when Playwright's own download is not installed.
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const iphone = { ...devices['iPhone 15'] };

  // --- 1. Plain browser: nothing may change. ---
  const plain = await browser.newContext(iphone);
  const web = await plain.newPage();
  await web.goto(base + '/', { waitUntil: 'networkidle' });
  check('browser: document is not marked', (await web.evaluate(() => document.documentElement.dataset.app)) === undefined);
  check('browser: concierge sphere is shown', await visible(web, 'button[data-app-hidden]:not(.aidock)'));
  check('browser: AI pill is shown', await visible(web, 'button.aidock'));
  check('browser: hero lede and sample requests are shown', (await visible(web, 'main p[data-app-hidden]')) && (await visible(web, 'main div[data-app-hidden] button')));
  check('browser: section rail lists nine sections', (await web.locator('ul.g1-rail a').count()) === 9);
  check('browser: sportsbook row is shown', await visible(web, 'li[data-app-hidden] a[href="/sportsbook"]'));
  check('browser: sportsbook section is shown', await visible(web, 'section[data-app-hidden]'));
  const plainHeight = await web.evaluate(() => document.documentElement.scrollHeight);
  await shot(web, 'web-home.png');
  await plain.close();

  // --- 2. Inside the app. ---
  const app = await browser.newContext({ ...iphone, userAgent: iphone.userAgent.replace('Safari/604.1', 'MiamiElioApp/1.0') });
  await app.addInitScript(() => {
    window.__messages = [];
    window.webkit = { messageHandlers: { miamiElio: { postMessage: (m) => window.__messages.push(m) } } };
  });
  await app.addInitScript(script('ru'));
  const page = await app.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/', { waitUntil: 'networkidle' });

  check('app: document is marked data-app="ios"', (await page.evaluate(() => document.documentElement.dataset.app)) === 'ios');
  check('app: marker survives hydration', (await page.evaluate(() => document.documentElement.getAttribute('data-app'))) === 'ios');
  check('app: concierge sphere is hidden', !(await visible(page, 'button[data-app-hidden]:not(.aidock)')));
  check('app: AI pill is hidden', !(await visible(page, 'button.aidock')));
  check('app: hero lede and sample requests are hidden', (await page.locator('main [data-app-hidden]:visible').count()) === 0);
  check('app: section rail lists nine sections', (await page.locator('ul.g1-rail a:visible').count()) === 9);
  check('app: hero search is still there', await visible(page, '#g1-hero-q'));
  check('app: sportsbook row is hidden', !(await visible(page, 'li[data-app-hidden] a[href="/sportsbook"]')));
  check('app: sportsbook section is hidden', !(await visible(page, 'section[data-app-hidden]')));
  check('app: other world rows remain', await visible(page, 'a.g1-dir-row[href="/yachts"]'));
  const appHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  check('app: page is shorter without the hidden section', appHeight < plainHeight, `${appHeight} < ${plainHeight}`);

  const cookies = await app.cookies(base);
  const locale = cookies.find((c) => c.name === 'gorgona-locale');
  check('app: language cookie seeded from the device', locale?.value === 'ru', JSON.stringify(locale?.value));
  await page.waitForFunction(() => document.documentElement.lang === 'ru', null, { timeout: 10000 }).catch(() => {});
  const lang = await page.evaluate(() => document.documentElement.lang);
  check('app: site switched to the seeded language', lang === 'ru', lang);
  const reported = await page.evaluate(() => window.__messages.filter((m) => m.locale).map((m) => m.locale));
  check('app: page reported its language to the app', reported.includes('ru'), JSON.stringify(reported));

  // Menu: sportsbook entry hidden, others present.
  await page.locator('header button[aria-expanded]').last().click();
  await page.waitForTimeout(600);
  check('app: menu shows Yachts', await visible(page, 'header nav a[href="/yachts"]:visible'));
  check('app: menu hides Sportsbooks', !(await visible(page, 'header nav a[href="/sportsbook"]:visible')));
  await shot(page, 'app-menu.png');
  await page.locator('header button[aria-expanded]').last().click();
  await shot(page, 'app-home.png');

  // A sportsbook link that is still on a page must be stopped and handed over.
  await page.goto(base + '/stores', { waitUntil: 'networkidle' });
  const link = page.locator('a[href^="/sportsbook"]:visible').first();
  const present = await link.count();
  if (present) {
    await page.evaluate(() => { window.__messages.length = 0; });
    await link.click();
    await page.waitForTimeout(800);
    const opened = await page.evaluate(() => window.__messages.filter((m) => m.open).map((m) => m.open));
    check('app: sportsbook link is intercepted', opened.length === 1 && opened[0] === base + '/sportsbook', JSON.stringify(opened));
    check('app: page did not navigate to the sportsbook', new URL(page.url()).pathname === '/stores', page.url());
  } else {
    check('app: found a sportsbook link on /stores to test interception', false, 'none visible');
  }

  // An ordinary link still works.
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('a.g1-dir-row[href="/yachts"]').click();
  await page.waitForURL('**/yachts', { timeout: 15000 });
  check('app: ordinary links still navigate', new URL(page.url()).pathname === '/yachts');
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('ul.g1-rail a[href="/experiences"]').click();
  await page.waitForURL('**/experiences', { timeout: 15000 });
  check('app: a section in the rail opens its page', new URL(page.url()).pathname === '/experiences');
  check('app: marker survives client-side navigation', (await page.evaluate(() => document.documentElement.dataset.app)) === 'ios');
  check('app: no script errors on the pages visited', errors.length === 0, errors.join(' | ').slice(0, 300));

  // Second launch: a language already chosen on the site is not overwritten.
  const page2 = await app.newPage();
  await page2.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page2.evaluate(() => { document.cookie = 'gorgona-locale=es; path=/; max-age=31536000; SameSite=Lax'; localStorage.setItem('gorgona-locale', 'es'); });
  await page2.reload({ waitUntil: 'networkidle' });
  const kept = (await app.cookies(base)).find((c) => c.name === 'gorgona-locale')?.value;
  check('app: a language the guest chose is kept', kept === 'es', kept);

  // The web concierge (the hero search opens it) offers no sportsbook in the
  // app. The English starters have one, so this runs in English. Cards come
  // from the local matcher, so the AI backend does not have to answer.
  const sportsbookStarter = 'main button:has-text("sportsbook")';
  const askConcierge = async (target) => {
    const input = target.locator('main form input').first();
    await input.fill('best sportsbook bonus and a yacht');
    await input.press('Enter');
    await target.locator('main a[href="/yachts"].group').first().waitFor({ timeout: 20000 }).catch(() => {});
  };
  const plainConcierge = await browser.newContext(iphone);
  const webAi = await plainConcierge.newPage();
  await webAi.goto(base + '/discovery', { waitUntil: 'networkidle' });
  check('browser: concierge offers the sportsbook starter', await visible(webAi, sportsbookStarter));
  await askConcierge(webAi);
  check('browser: concierge shows a sportsbook card', await visible(webAi, 'main a[href="/sportsbook"]'));
  await plainConcierge.close();

  const appEn = await browser.newContext({ ...iphone, userAgent: iphone.userAgent.replace('Safari/604.1', 'MiamiElioApp/1.0') });
  await appEn.addInitScript(() => { window.webkit = { messageHandlers: { miamiElio: { postMessage: () => {} } } }; });
  await appEn.addInitScript(script('en'));
  const appAi = await appEn.newPage();
  await appAi.goto(base + '/discovery', { waitUntil: 'networkidle' });
  check('app: concierge still offers the other starters', await visible(appAi, 'main button:has-text("yacht")'));
  check('app: concierge hides the sportsbook starter', !(await visible(appAi, sportsbookStarter)));
  await askConcierge(appAi);
  check('app: concierge still shows the yacht card', await visible(appAi, 'main a[href="/yachts"].group'));
  check('app: concierge page hides every sportsbook link', (await appAi.locator('main a[href^="/sportsbook"]:visible').count()) === 0);
  await shot(appAi, 'app-concierge.png');

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
