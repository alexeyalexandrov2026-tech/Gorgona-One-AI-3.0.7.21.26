import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const advisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
// Owner-approved temporary scope, expiring at midnight in New York on December 1.
// The reviewed Tailwind chain is build-only. The package itself remains vulnerable.
const expiresAt = '2026-12-01T05:00:00Z';
const scopeHashes = {
  'package-lock.json': '12940a2b33486baaf6733131d75b7355700517e78e201ea266d5715e87c43ff8',
  'tailwind.config.js': '948826b0bd1f30a62298f81b55157acbb2ad789212dd61a0aa6f90f0a1831b89',
  'next.config.js': 'e0f153f15766de1cedc71637b5fc00f624bdbcaf77455f3b520f3bd214a74bbe'
};
const coveredPackages = new Set([
  'picomatch', 'anymatch', 'fdir', 'micromatch', 'fast-glob',
  'tailwindcss', 'readdirp', 'chokidar', 'tinyglobby', 'sucrase'
]);
const severities = ['info', 'low', 'moderate', 'high', 'critical'];

export function assessAudit(result, files, now = Date.now()) {
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
  if (!high.length && !critical.length) {
    return { high: 0, critical: 0, excepted: [] };
  }
  if (!Number.isFinite(now) || now >= Date.parse(expiresAt)) {
    throw new Error('The temporary picomatch exception has expired');
  }
  for (const [file, expectedHash] of Object.entries(scopeHashes)) {
    if (typeof files[file] !== 'string') {
      throw new Error('Missing reviewed audit scope file ' + file);
    }
    // Git may check out the same text with CRLF on Windows and LF on Linux.
    const hash = createHash('sha256').update(files[file].replace(/\r\n/g, '\n')).digest('hex');
    if (hash !== expectedHash) {
      throw new Error('The reviewed audit scope changed in ' + file);
    }
  }

  const checked = new Map();
  const visiting = new Set();
  function isCovered(name) {
    if (checked.has(name)) return checked.get(name);
    if (visiting.has(name)) return false;
    const entry = report.vulnerabilities[name];
    if (!coveredPackages.has(name) || entry?.severity !== 'high'
        || !Array.isArray(entry.via) || !entry.via.length) return false;
    visiting.add(name);
    const covered = entry.via.every(via => {
      if (typeof via === 'string') return isCovered(via);
      return name === 'picomatch' && via?.source === 1247710
        && via.url === advisory && via.name === 'picomatch'
        && via.dependency === 'picomatch' && via.severity === 'high'
        && via.range === '<=4.0.7';
    });
    visiting.delete(name);
    checked.set(name, covered);
    return covered;
  }
  const blocked = [...high, ...critical].filter(([name]) => !isCovered(name));
  if (blocked.length) {
    throw new Error('Unexcepted high or critical vulnerabilities ' + blocked.map(([name]) => name).join(', '));
  }
  return { high: high.length, critical: 0, excepted: high.map(([name]) => name), advisory, expiresAt };
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
  // Preserve the complete findings in CI, including the accepted advisory.
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  let files = {};
  if (result.status === 1) {
    files = Object.fromEntries(Object.keys(scopeHashes).map(file => [
      file, readFileSync(path.join(root, file), 'utf8')
    ]));
  }
  const decision = assessAudit(result, files);
  if (decision.excepted.length) {
    console.warn('TEMPORARY RISK ACCEPTANCE for ' + advisory + ', expiring ' + expiresAt);
  }
  console.log(JSON.stringify(decision));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
