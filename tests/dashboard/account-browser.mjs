import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium, expect } from '@playwright/test';

const origin = 'http://127.0.0.1:3048';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3048'], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit',
});
const user = { id: 'e874fc3c-c32b-41dd-a39c-0f54baa6f9c9', email: 'customer@example.com',
  aud: 'authenticated', role: 'authenticated', user_metadata: { name: 'Customer Fixture' } };
const expires = Math.floor(Date.now() / 1000) + 3600;
const claims = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = [claims({ alg: 'HS256', typ: 'JWT' }),
  claims({ sub: user.id, aud: 'authenticated', exp: expires }), 'fixture'].join('.');
const session = { user, access_token: accessToken, refresh_token: 'fixture', token_type: 'bearer', expires_in: 3600 };
const testPassword = 'FixturePassword2026!';
const redirectRequests = [];
let passwordUpdates = 0;
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    const ready = await fetch(origin + '/login', { signal: AbortSignal.timeout(1500) }).then(r => r.ok, () => false);
    if (ready) break;
    if (attempt === 60 || server.exitCode !== null) throw new Error('Account browser test server failed to start');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const executablePath = process.env.I18N_BROWSER_EXECUTABLE;
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });

  async function test(name, run) {
    const context = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => localStorage.setItem('gorgona-locale', 'en'));
    await context.route(url => url.hostname === 'placeholder.supabase.co', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const body = request.postDataJSON();
      const respond = (json, status = 200) => route.fulfill({ status, json, headers: { 'access-control-allow-origin': '*' } });
      switch (url.pathname) {
        case '/auth/v1/signup':
          redirectRequests.push(url.searchParams.get('redirect_to'));
          return respond(body.email.startsWith('confirm') ? { ...user, email: body.email, identities: [] } : session);
        case '/auth/v1/recover':
          redirectRequests.push(url.searchParams.get('redirect_to'));
          return respond({});
        case '/auth/v1/token':
          if (body.password !== testPassword) {
            return respond({ error_code: 'invalid_credentials', message: 'Invalid login credentials' }, 400);
          }
          return respond(session);
        case '/auth/v1/user':
          if (request.method() === 'PUT') {
            expect(body.password).toBe(testPassword);
            expect(request.headers().authorization).toBe('Bearer ' + accessToken);
            passwordUpdates++;
          }
          return respond(user);
        case '/rest/v1/profiles':
          return respond({ id: user.id, name: 'Customer Fixture', email: user.email, role: 'user', metadata: {} });
        default:
          return respond([]);
      }
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await run(page);
      expect(errors).toEqual([]);
      console.log('PASS ' + name);
    } finally {
      await context.close();
    }
  }

  async function register(page, email) {
    await page.goto(origin + '/register');
    await page.getByLabel('Your Name', { exact: true }).fill('Customer Fixture');
    await page.getByLabel('Email Address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByLabel('Confirm Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
    await expect.poll(() => redirectRequests.at(-1)).toBe(origin + '/profile');
  }

  await test('signup waits for email confirmation without a session', async page => {
    await register(page, 'confirm@example.com');
    await expect(page.getByText('Check your email for a confirmation link.')).toBeVisible();
    await expect(page).toHaveURL(origin + '/register');
  });

  await test('signup with a verified session opens the personal account', async page => {
    await register(page, user.email);
    await expect(page).toHaveURL(origin + '/profile');
    await expect(page.locator('main').getByText(/Customer Fixture/)).toBeVisible();
  });

  await test('sign-in displays invalid credentials and opens the verified account on retry', async page => {
    await page.goto(origin + '/login');
    const form = page.locator('main form');
    await form.getByLabel('Email Address', { exact: true }).fill(user.email);
    await form.getByLabel('Password', { exact: true }).fill('bad-password');
    await form.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(form.getByRole('alert')).toHaveText('The email or password is incorrect.');
    await form.getByLabel('Password', { exact: true }).fill(testPassword);
    await form.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(origin + '/profile');
    await expect(page.locator('main').getByText(/Customer Fixture/)).toBeVisible();
  });

  await test('password recovery requests email and updates the authenticated account', async page => {
    await page.goto(origin + '/login');
    await page.getByRole('link', { name: 'Forgot your password?' }).click();
    await expect(page).toHaveURL(origin + '/forgot-password');
    await page.getByLabel('Email Address', { exact: true }).fill(user.email);
    await page.getByRole('button', { name: 'Request a reset link' }).click();
    await expect(page.getByText('If an account exists for this email, we’ll send a password reset link.')).toBeVisible();
    expect(redirectRequests.at(-1)).toBe(origin + '/account/setup');
    await page.goto(origin + '/profile#' + new URLSearchParams({
      access_token: accessToken, refresh_token: 'fixture', expires_in: '3600', token_type: 'bearer', type: 'recovery',
    }));
    await expect(page).toHaveURL(origin + '/account/setup');
    const form = page.locator('main form');
    await form.locator('input[type=password]').nth(0).fill(testPassword);
    await expect.poll(() => new URL(page.url()).hash).toBe('');
    await form.locator('input[type=password]').nth(1).fill(testPassword);
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(origin + '/profile');
    expect(passwordUpdates).toBe(1);
  });

  await test('expired recovery link offers a fresh link', async page => {
    await page.goto(origin + '/account/setup#error=access_denied&error_code=otp_expired');
    await expect(page.getByRole('link', { name: 'Request a reset link' })).toHaveAttribute('href', '/forgot-password');
    await expect(page.locator('main form')).toHaveCount(0);
  });
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, 'exit');
    server.kill();
    await stopped;
  }
}
