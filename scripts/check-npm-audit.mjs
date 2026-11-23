import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const severities = ['info', 'low', 'moderate', 'high', 'critical'];

// Strict fail-closed npm audit gate: zero high or critical vulnerabilities.
// The temporary picomatch (GHSA-fc5q-39xc-vjpf) exception was retired after
// GitHub formally withdrew the advisory on 2026-11-18.
export function assessAudit(result) {
  if (result.error || result.signal || ![0, 1].includes(result.status)) {
    throw new Error('npm audit did not complete successfully');
  }
  const report = JSON.parse(result.stdout);
  if (report.error || report.auditReportVersion !== 2 || !report.vulnerabilities
      || typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities)) {
    throw new Error('Unsupported or unsuccessful npm audit report');
  }
  const entries = Object.entries(report.vulnerabilities);
  for (const [name, entry] of entries) {
    if (!entry || entry.name !== name || !severities.includes(entry.severity) || !Array.isArray(entry.via)) {
      throw new Error('Invalid vulnerability entry in npm audit report');
    }
    for (const via of entry.via) {
      const referenced = typeof via === 'string' ? report.vulnerabilities[via] : via;
      if (!referenced || !severities.includes(referenced.severity)
          || severities.indexOf(referenced.severity) > severities.indexOf(entry.severity)) {
        throw new Error('Invalid or inconsistent advisory in npm audit report');
      }
    }
  }
  const high = entries.filter(([, entry]) => entry.severity === 'high');
  const critical = entries.filter(([, entry]) => entry.severity === 'critical');
  if (report.metadata?.vulnerabilities?.high !== high.length
      || report.metadata?.vulnerabilities?.critical !== critical.length
      || result.status !== Number(high.length + critical.length > 0)) {
    throw new Error('npm audit status and vulnerability counts are inconsistent');
  }
  if (high.length || critical.length) {
    throw new Error('Unexcepted high or critical vulnerabilities ' + [...high, ...critical].map(([name]) => name).join(', '));
  }
  return { high: 0, critical: 0, excepted: [] };
}

function main() {
  const windows = process.platform === 'win32';
  const command = windows ? 'cmd.exe' : 'npm';
  const args = windows
    ? ['/d', '/s', '/c', 'npm.cmd audit --json --audit-level=high']
    : ['audit', '--json', '--audit-level=high'];
  const result = spawnSync(command, args, {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const decision = assessAudit(result);
  console.log(JSON.stringify(decision));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
