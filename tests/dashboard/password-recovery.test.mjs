import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PASSWORD_RECOVERY_REDIRECT,
  normalizeRecoveryEmail,
  passwordRecoveryRedirect,
  requestPasswordRecovery
} from '../../lib/passwordRecovery.mjs';
import {
  PASSWORD_RECOVERY_LOCALES,
  getPasswordRecoveryCopy
} from '../../lib/passwordRecoveryCopy.mjs';

test('normalizes a valid email without changing the account identity', () => {
  assert.equal(normalizeRecoveryEmail('  Owner@Example.COM  '), 'Owner@Example.COM');
  for (const bad of ['', 'a', 'someone@', 'bad address@example.com', 'x'.repeat(255), null, undefined]) {
    assert.throws(() => normalizeRecoveryEmail(bad), /invalid_email/);
  }
});

test('redirect is limited to the same HTTPS origin and the existing setup page', () => {
  assert.equal(PASSWORD_RECOVERY_REDIRECT, '/account/setup');
  assert.equal(passwordRecoveryRedirect('https://gorgona-one.com'), 'https://gorgona-one.com/account/setup');
  assert.equal(passwordRecoveryRedirect('https://gorgona-one.com:443'), 'https://gorgona-one.com/account/setup');
  assert.equal(passwordRecoveryRedirect('http://localhost:3000'), 'http://localhost:3000/account/setup');
  for (const unsafe of ['javascript:alert(1)', 'http://evil.example', 'https://evil.example', 'https://gorgona-one.com.evil.example', 'https://evil.example/path', 'https://user:password@evil.example', 'https://gorgona-one.com?next=evil', 'https://gorgona-one.com/#token']) {
    assert.throws(() => passwordRecoveryRedirect(unsafe));
  }
});

test('sends an email request with exact redirect, never touches admin or user tables', async () => {
  const calls = [];
  const auth = { resetPasswordForEmail: async (email, opts) => {
    calls.push({email,opts});
    return { data: {}, error: null };
  } };
  assert.equal(await requestPasswordRecovery(auth, '  reader@example.com  ', 'https://gorgona-one.com'), true);
  assert.deepEqual(calls, [{email:'reader@example.com',opts:{redirectTo:'https://gorgona-one.com/account/setup'}}]);
});

test('provider errors are propagated so the UI can show a generic response', async () => {
  const error = Object.assign(new Error('rate limited'), {code:'over_email_send_rate_limit'});
  await assert.rejects(
    requestPasswordRecovery({resetPasswordForEmail:async()=>({data:null,error})},'a@example.com','https://gorgona-one.com'),
    value=>value===error
  );
  await assert.rejects(
    requestPasswordRecovery({resetPasswordForEmail:()=>{throw Error('not called');}},'bad email','https://gorgona-one.com'),
    /invalid_email/
  );
});

test('all supported site languages have complete self-service recovery copy', () => {
  const siteSource = readFileSync(new URL('../../lib/languages.js', import.meta.url),'utf8');
  const supported = [...siteSource.matchAll(/code: '([a-z]+)'/g)].map(match=>match[1]);
  assert.deepEqual([...PASSWORD_RECOVERY_LOCALES].sort(),supported.sort());
  const required=['link','title','description','email','submit','sending','sentTitle','sentBody','invalid','failed','back','expired'];
  for(const locale of PASSWORD_RECOVERY_LOCALES){
    const copy=getPasswordRecoveryCopy(locale);
    assert.deepEqual(Object.keys(copy),required);
    for(const key of required)assert.ok(typeof copy[key]==='string'&&copy[key].trim(),locale+': '+key);
  }
  assert.equal(getPasswordRecoveryCopy('unsupported').title,getPasswordRecoveryCopy('en').title);
});
