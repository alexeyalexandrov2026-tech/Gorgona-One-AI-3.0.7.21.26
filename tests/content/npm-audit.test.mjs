import test from 'node:test';
import assert from 'node:assert/strict';
import { assessAudit } from '../../scripts/check-npm-audit.mjs';

const sampleAdvisory = {
  source: 999001, name: 'example-pkg', dependency: 'example-pkg',
  url: 'https://github.com/advisories/GHSA-0000-0000-0000',
  severity: 'high', range: '<=1.0.0'
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

test('a clean audit passes with zero exceptions', () => {
  assert.deepEqual(assessAudit(execution({})), { high: 0, critical: 0, excepted: [] });
});

test('the high severity threshold remains in effect for moderate and low findings', () => {
  const report = {
    modPkg: { name: 'modPkg', severity: 'moderate', via: [] },
    lowPkg: { name: 'lowPkg', severity: 'low', via: [] }
  };
  assert.deepEqual(assessAudit(execution(report)), { high: 0, critical: 0, excepted: [] });
});

test('any high or critical advisory blocks the check with no temporary exceptions', () => {
  const highReport = {
    'example-pkg': { name: 'example-pkg', severity: 'high', via: [{ ...sampleAdvisory }] }
  };
  assert.throws(() => assessAudit(execution(highReport)), /Unexcepted high or critical/);

  const criticalReport = {
    'example-pkg': { name: 'example-pkg', severity: 'critical', via: [{ ...sampleAdvisory, severity: 'critical' }] }
  };
  assert.throws(() => assessAudit(execution(criticalReport)), /Unexcepted high or critical/);
});

test('an advisory cannot hide a higher severity behind a lower aggregate entry', () => {
  for (const severity of ['high', 'critical']) {
    const report = { other: { name: 'other', severity: 'moderate', via: [{ ...sampleAdvisory, severity }] } };
    assert.throws(() => assessAudit(execution(report)), /inconsistent advisory/);
  }
});

test('invalid advisory shapes, missing references and unknown severities fail closed', () => {
  for (const via of [null, {}, { severity: 'unknown' }, 'missing']) {
    const report = { other: { name: 'other', severity: 'moderate', via: [via] } };
    assert.throws(() => assessAudit(execution(report)), /inconsistent advisory/);
  }
  const report = { other: { name: 'other', severity: 'moderate' } };
  assert.throws(() => assessAudit(execution(report)), /Invalid vulnerability/);
});

test('registry failures, timeouts and unsuccessful process exits fail closed', () => {
  for (const result of [{ error: new Error('network') }, { status: null, signal: 'SIGTERM' }, { status: 2 }]) {
    assert.throws(() => assessAudit(result), /did not complete/);
  }
  assert.throws(() => assessAudit({ status: 1, stdout: '{"error":{"code":"ENOAUDIT"}}' }), /unsuccessful/);
});

test('invalid, incomplete and inconsistent audit reports fail closed', () => {
  assert.throws(() => assessAudit({ status: 0, stdout: 'not json' }), SyntaxError);
  for (const value of [{}, { auditReportVersion: 2, vulnerabilities: [] }]) {
    assert.throws(() => assessAudit({ status: 0, stdout: JSON.stringify(value) }), /Unsupported/);
  }
  const highReport = execution({ 'example-pkg': { name: 'example-pkg', severity: 'high', via: [{ ...sampleAdvisory }] } });
  const parsed = JSON.parse(highReport.stdout);
  parsed.metadata.vulnerabilities.high = 0;
  assert.throws(() => assessAudit({ ...highReport, stdout: JSON.stringify(parsed) }), /inconsistent/);
  assert.throws(() => assessAudit({ ...highReport, status: 0 }), /inconsistent/);
});
