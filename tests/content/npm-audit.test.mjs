import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessAudit } from '../../scripts/check-npm-audit.mjs';

const now = Date.parse('2026-11-17T20:00:00Z');
const files = Object.fromEntries(['package-lock.json', 'tailwind.config.js', 'next.config.js'].map(file => [
  file, readFileSync(new URL('../../' + file, import.meta.url), 'utf8')
]));
const knownAdvisory = {
  source: 1247710, name: 'picomatch', dependency: 'picomatch',
  url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
  severity: 'high', range: '<=4.0.7'
};
function execution(vulnerabilities) {
  const entries = Object.values(vulnerabilities);
  const high = entries.filter(entry => entry.severity === 'high').length;
  const critical = entries.filter(entry => entry.severity === 'critical').length;
  return {
    status: Number(high + critical > 0),
    stdout: JSON.stringify({ auditReportVersion: 2, vulnerabilities, metadata: { vulnerabilities: { high, critical } } })
  };
}
function known() {
  return {
    picomatch: { name: 'picomatch', severity: 'high', via: [{ ...knownAdvisory }] },
    micromatch: { name: 'micromatch', severity: 'high', via: ['picomatch'] },
    tailwindcss: { name: 'tailwindcss', severity: 'high', via: ['micromatch'] }
  };
}

test('only the reviewed advisory and its dependency chain receive the temporary exception', () => {
  const result = assessAudit(execution(known()), files, now);
  assert.deepEqual(result.excepted, ['picomatch', 'micromatch', 'tailwindcss']);
  assert.equal(result.high, 3);
  assert.equal(result.expiresAt, '2026-12-01T05:00:00Z');
});

test('equivalent Windows line endings preserve the reviewed scope', () => {
  const windowsFiles = Object.fromEntries(Object.entries(files).map(([name, text]) => [
    name, text.replace(/\r?\n/g, '\r\n')
  ]));
  assert.equal(assessAudit(execution(known()), windowsFiles, now).excepted.length, 3);
});

for (const file of Object.keys(files)) {
  test('a change to ' + file + ' invalidates the exception', () => {
    assert.throws(() => assessAudit(execution(known()), { ...files, [file]: files[file] + '\n' }, now), /scope changed/);
  });
}

for (const time of ['2026-12-01T05:00:00Z', '2026-12-02T00:00:00Z']) {
  test('the exception is refused at ' + time, () => {
    assert.throws(() => assessAudit(execution(known()), files, Date.parse(time)), /expired/);
  });
}

test('the exception remains valid immediately before its New York deadline', () => {
  assert.equal(assessAudit(execution(known()), files, Date.parse('2026-12-01T04:59:59Z')).excepted.length, 3);
});

test('a clean audit passes after expiry without depending on the exception scope', () => {
  assert.deepEqual(assessAudit(execution({}), {}, Date.parse('2026-12-02T00:00:00Z')).excepted, []);
});

test('the original high severity threshold remains in effect for unrelated moderate findings', () => {
  const report = { other: { name: 'other', severity: 'moderate', via: [] } };
  assert.deepEqual(assessAudit(execution(report), files, now).excepted, []);
});

test('a second advisory on picomatch blocks the check', () => {
  const report = known();
  report.picomatch.via.push({ ...knownAdvisory, source: 9999999, url: 'https://github.com/advisories/another-advisory' });
  assert.throws(() => assessAudit(execution(report), files, now), /Unexcepted/);
});

test('the exact reviewed advisory scope is required', () => {
  for (const change of [{ source: 999 }, { range: '<=4.0.8' }, { dependency: 'other' }]) {
    const report = known();
    Object.assign(report.picomatch.via[0], change);
    assert.throws(() => assessAudit(execution(report), files, now), /Unexcepted/);
  }
});

test('a high severity advisory on another dependency blocks the check', () => {
  const report = { ...known(), other: { name: 'other', severity: 'high', via: [knownAdvisory] } };
  assert.throws(() => assessAudit(execution(report), files, now), /Unexcepted/);
});

test('critical findings remain blocking', () => {
  const report = {
    picomatch: { name: 'picomatch', severity: 'critical', via: [{ ...knownAdvisory, severity: 'critical' }] }
  };
  assert.throws(() => assessAudit(execution(report), files, now), /Unexcepted/);
});

test('cycles and missing dependency findings fail closed', () => {
  for (const via of ['tailwindcss', 'missing']) {
    const report = known();
    report.picomatch.via = [via];
    assert.throws(() => assessAudit(execution(report), files, now), /Unexcepted|inconsistent advisory/);
  }
});

test('an advisory cannot hide a higher severity behind a lower aggregate entry', () => {
  for (const severity of ['high', 'critical']) {
    const report = { other: { name: 'other', severity: 'moderate', via: [{ ...knownAdvisory, severity }] } };
    assert.throws(() => assessAudit(execution(report), files, now), /inconsistent advisory/);
  }
});

test('invalid advisory shapes and unknown severities fail closed', () => {
  for (const via of [null, {}, { severity: 'unknown' }]) {
    const report = { other: { name: 'other', severity: 'moderate', via: [via] } };
    assert.throws(() => assessAudit(execution(report), files, now), /inconsistent advisory/);
  }
  const report = { other: { name: 'other', severity: 'moderate' } };
  assert.throws(() => assessAudit(execution(report), files, now), /Invalid vulnerability/);
});

test('missing scope files and invalid clocks fail closed', () => {
  assert.throws(() => assessAudit(execution(known()), {}, now), /Missing reviewed/);
  assert.throws(() => assessAudit(execution(known()), files, NaN), /expired/);
});

test('registry failures, timeouts and unsuccessful process exits fail closed', () => {
  for (const result of [{ error: new Error('network') }, { status: null, signal: 'SIGTERM' }, { status: 2 }]) {
    assert.throws(() => assessAudit(result, files, now), /did not complete/);
  }
  assert.throws(() => assessAudit({ status: 1, stdout: '{"error":{"code":"ENOAUDIT"}}' }, files, now), /unsuccessful/);
});

test('invalid, incomplete and inconsistent audit reports fail closed', () => {
  assert.throws(() => assessAudit({ status: 0, stdout: 'not json' }, files, now), SyntaxError);
  for (const value of [{}, { auditReportVersion: 2, vulnerabilities: [] }]) {
    assert.throws(() => assessAudit({ status: 0, stdout: JSON.stringify(value) }, files, now), /Unsupported/);
  }
  const result = execution(known());
  const report = JSON.parse(result.stdout);
  report.metadata.vulnerabilities.high = 0;
  assert.throws(() => assessAudit({ ...result, stdout: JSON.stringify(report) }, files, now), /inconsistent/);
  assert.throws(() => assessAudit({ ...execution(known()), status: 0 }, files, now), /inconsistent/);
});
