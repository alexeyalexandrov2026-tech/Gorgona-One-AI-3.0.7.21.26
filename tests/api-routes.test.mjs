// Calls the real route handlers with Request objects - no server needed.
// Supabase is unconfigured here (no NEXT_PUBLIC_SUPABASE_* env), and every
// outbound fetch is stubbed per test, so nothing leaves the machine.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Keep the local AI brain off so the chat route never probes 127.0.0.1:8000.
process.env.GORGONA_AI_ENABLED = 'off';

const { POST: book } = await import('../app/api/book/route.js');
const { POST: notify } = await import('../app/api/notify/route.js');
const chat = await import('../app/api/chat/route.js');

const realFetch = globalThis.fetch;
const savedEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of ['RESEND_API_KEY', 'ADMIN_EMAIL', 'NOTIFICATIONS_FROM_EMAIL', 'NODE_ENV', 'GORGONA_AI_DIAGNOSTICS']) {
    if (key in savedEnv) process.env[key] = savedEnv[key];
    else delete process.env[key];
  }
});

function post(path, body, headers = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

// Records outbound requests and answers them with `respond(url, init)`.
function stubFetch(respond) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init, body: init.body ? JSON.parse(init.body) : null });
    return respond(String(url), init);
  };
  return calls;
}

const booking = {
  name: '<img src=x onerror=alert(1)>',
  email: 'guest@example.com',
  phone: '+1 305 555 0100',
  dates: 'Oct 12 - Oct 15',
  itemSlug: 'lamborghini-urus-se',
  itemTitle: 'Urus\r\nBcc: x@evil.example'
};

// --- /api/book ---------------------------------------------------------------

test('book: rejects bodies that are not valid JSON or miss fields', async () => {
  assert.equal((await book(post('/api/book', 'nope'))).status, 400);
  assert.equal((await book(post('/api/book', { name: 'Ada' }))).status, 400);
  assert.equal((await book(post('/api/book', { ...booking, email: 'not-an-email' }))).status, 400);
});

test('book: answers 503 when the request could be neither stored nor emailed', async () => {
  const res = await book(post('/api/book', booking));
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /could not submit/i);
});

test('book: emails ADMIN_EMAIL only, with escaped content and the guest as reply-to', async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  const calls = stubFetch(() => Response.json({ id: 'email_1' }));

  const res = await book(post('/api/book', booking));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).success, true);

  assert.equal(calls.length, 1);
  const email = calls[0].body;
  assert.match(calls[0].url, /\/emails$/);
  assert.deepEqual([email.to].flat(), ['admin@example.com']);
  assert.deepEqual([email.reply_to].flat(), ['guest@example.com']);
  assert.ok(!email.html.includes('<img'), 'guest markup must not reach the email');
  assert.ok(email.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!/[\r\n]/.test(email.subject), 'subject must be a single line');
});

test('book: a rejected email is a failure, not a success', async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  stubFetch(() => Response.json({ name: 'validation_error', statusCode: 403, message: 'not allowed' }, { status: 403 }));
  assert.equal((await book(post('/api/book', booking))).status, 503);
});

test('book: honeypot submissions look successful but send nothing', async () => {
  process.env.RESEND_API_KEY = 're_test';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  const calls = stubFetch(() => Response.json({ id: 'email_1' }));
  const res = await book(post('/api/book', { ...booking, website: 'http://spam.example' }));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

// --- /api/notify -------------------------------------------------------------

test('notify: requires a signed-in user', async () => {
  const calls = stubFetch(() => Response.json({ id: 'email_1' }));
  assert.equal((await notify(post('/api/notify', { event: 'new_listing' }))).status, 401);
  assert.equal(
    (await notify(post('/api/notify', { event: 'new_listing' }, { authorization: 'Bearer forged' }))).status,
    401
  );
  assert.equal(calls.length, 0);
});

// --- /api/chat ---------------------------------------------------------------

test('chat: GET hides engine details in production', async () => {
  process.env.NODE_ENV = 'production';
  assert.deepEqual(await (await chat.GET()).json(), { ok: true });

  process.env.GORGONA_AI_DIAGNOSTICS = 'on';
  const detailed = await (await chat.GET()).json();
  assert.ok(detailed.local && detailed.router, 'diagnostics can be switched on');
});

test('chat: rejects requests without a usable user message', async () => {
  for (const messages of [undefined, [], [null], [{ role: 'user', content: { text: 'hi' } }], [{ role: 'system', content: 'hi' }]]) {
    assert.equal((await chat.POST(post('/api/chat', { messages }))).status, 400, JSON.stringify(messages));
  }
});

test('chat: skips malformed turns and still answers when no engine is reachable', async () => {
  stubFetch(() => {
    throw new TypeError('fetch failed');
  });
  const res = await chat.POST(
    post('/api/chat', { messages: [null, 7, { role: 'user', content: 'a yacht for 10 people' }], locale: 'en' })
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.error, true);
  assert.ok(body.reply.length > 0, 'the guest always gets a reply');
  assert.ok(body.cards.some((card) => card.href === '/yachts'), 'navigation still works offline');
});
