import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {postLoginPath, safeNextPath} from '../../lib/postLoginPath.mjs';

test('each verified role lands on its own workspace', () => {
  assert.equal(postLoginPath('user', null), '/profile');
  assert.equal(postLoginPath('partner', null), '/partner');
  assert.equal(postLoginPath('admin', null), '/admin');
  assert.equal(postLoginPath(undefined, null), '/profile');
  assert.equal(postLoginPath('owner', null), '/profile', 'unknown roles never open a privileged page');
});

test('a same-site next path wins and keeps its query', () => {
  assert.equal(postLoginPath('user', '/account/delete'), '/account/delete');
  assert.equal(postLoginPath('partner', '/yachts/sunseeker-95?dates=1#book'), '/yachts/sunseeker-95?dates=1#book');
});

test('next can never leave the site or loop back to sign-in', () => {
  for (const next of ['https://evil.example/', '//evil.example', '/\\evil.example', '/\\/evil.example', 'javascript:alert(1)', 'profile', '', '/login', '/login?next=/admin', '/\u0000x', '/x\\y', '/'.repeat(600)]) {
    assert.equal(safeNextPath(next), null, JSON.stringify(next));
  }
  assert.equal(postLoginPath('admin', '//evil.example'), '/admin');
});

test('the sign-in page uses the verified role, and the partner agreement links to partner sign-up', () => {
  const login = fs.readFileSync(new URL('../../app/login/page.js', import.meta.url), 'utf8');
  assert.match(login, /postLoginPath\(session\?\.role, next\)/);
  assert.match(login, /const session = await auth\?\.refresh\(\)/);
  const agreement = fs.readFileSync(new URL('../../app/partner-agreement/page.js', import.meta.url), 'utf8');
  assert.match(agreement, /href="\/register\/partner"/);
});
