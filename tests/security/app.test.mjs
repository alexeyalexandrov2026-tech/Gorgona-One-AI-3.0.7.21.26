import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './helpers/root.mjs';

const moduleUrl = (relativePath) => pathToFileURL(join(ROOT, relativePath)).href;

// Outgoing email is captured here instead of being sent.
const sentEmails = [];
class FakeResend {
  constructor() {
    this.emails = {
      send: async (message) => {
        sentEmails.push(message);
        return { data: { id: 'test' }, error: null };
      }
    };
  }
}
mock.module('resend', { namedExports: { Resend: FakeResend } });

// The browser-side Supabase client, answering from `fake` instead of the network.
const fake = { session: null, profile: null };
function query() {
  const q = {
    select: () => q, insert: () => q, update: () => q, eq: () => q, order: () => q, limit: () => q,
    single: () => q, maybeSingle: () => q,
    then: (resolve, reject) => Promise.resolve({ data: fake.profile, error: null }).then(resolve, reject)
  };
  return q;
}
const supabaseStub = {
  from: () => query(),
  auth: { getSession: async () => ({ data: { session: fake.session } }) }
};
mock.module(moduleUrl('lib/supabase.js'), { namedExports: { supabase: supabaseStub } });

const post = (path, body, headers = {}) =>
  new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });

describe('API routes', () => {
  test('the public seed route is gone', () => {
    assert.equal(existsSync(join(ROOT, 'app/api/seed/route.js')), false);
  });

  test('GET /api/chat does not reveal internal endpoints or models', async () => {
    const { GET } = await import(moduleUrl('app/api/chat/route.js'));
    const text = await (await GET()).text();
    assert.doesNotMatch(text, /localhost|127\.0\.0\.1|:20128|"model"|"url"/i);
  });

  test('POST /api/book never emails the address a visitor typed', async () => {
    const { POST } = await import(moduleUrl('app/api/book/route.js'));
    sentEmails.length = 0;
    process.env.RESEND_API_KEY = 'test-key';
    delete process.env.ADMIN_EMAIL;
    const response = await POST(post('/api/book', {
      name: 'Visitor', email: 'someone@example.com', dates: 'Dec 4-6', itemTitle: 'Yacht'
    }));
    assert.equal(response.status, 200);
    const toVisitor = sentEmails.filter((m) => [].concat(m.to).includes('someone@example.com'));
    assert.equal(toVisitor.length, 0);
  });

  test('POST /api/book escapes HTML in the admin email', async () => {
    const { POST } = await import(moduleUrl('app/api/book/route.js'));
    sentEmails.length = 0;
    process.env.RESEND_API_KEY = 'test-key';
    process.env.ADMIN_EMAIL = 'owner@example.com';
    await POST(post('/api/book', {
      name: '<img src=x onerror=alert(1)>', email: 'guest@example.com', dates: 'Dec 4-6', itemTitle: 'Yacht'
    }));
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, 'owner@example.com');
    assert.doesNotMatch(sentEmails[0].html, /<img/i);
  });

  test('POST /api/notify refuses callers who are not signed-in partners', async () => {
    const { POST } = await import(moduleUrl('app/api/notify/route.js'));
    sentEmails.length = 0;
    process.env.RESEND_API_KEY = 'test-key';
    process.env.ADMIN_EMAIL = 'owner@example.com';
    const response = await POST(post('/api/notify', { event: 'new_listing', partner: 'anyone', filesCount: 1 }));
    assert.equal(response.status, 401);
    assert.equal(sentEmails.length, 0);
  });
});

describe('sessions', () => {
  test('the role comes from profiles, not from user metadata', async () => {
    fake.session = {
      access_token: 'token',
      user: { id: 'u1', email: 'u1@example.com', user_metadata: { role: 'admin' } }
    };
    fake.profile = { role: 'user', name: 'U1', company_name: null, metadata: {} };
    const { getSession } = await import(moduleUrl('lib/auth.js'));
    const session = await getSession();
    assert.equal(session.role, 'user');
  });
});

describe('repository hygiene', () => {
  test('the footer has no public link to the admin dashboard', () => {
    const footer = readFileSync(join(ROOT, 'app/components/Footer.jsx'), 'utf8');
    assert.doesNotMatch(footer, /href:\s*['"]\/admin['"]/);
  });

  test('local secret files are ignored by git', () => {
    const lines = readFileSync(join(ROOT, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => l.trim());
    for (const pattern of ['.env', '.env.*', '.dev.vars']) {
      assert.ok(lines.includes(pattern), `${pattern} is not in .gitignore`);
    }
  });

  test('the example env file ships no default secret', () => {
    const example = readFileSync(join(ROOT, '.env.example'), 'utf8');
    assert.doesNotMatch(example, /^GORGONA_AI_API_KEY=\S+/m);
  });

  test('the ai-router test script has no hard-coded API key', (t) => {
    const file = join(ROOT, 'ai-router/scripts/test-combo-autoswitch.mjs');
    if (!existsSync(file)) {
      t.skip('ai-router is not checked out here');
      return;
    }
    assert.doesNotMatch(readFileSync(file, 'utf8'), /\bsk-[A-Za-z0-9_-]{16,}/);
  });
});
