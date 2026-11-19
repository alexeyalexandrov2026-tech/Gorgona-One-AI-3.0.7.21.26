// Establish a short-lived session in the debug app without putting credentials in the APK.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const staging = 'https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev';
const project = 'kaxslgjbrarapeyoifdh';
const workspace = fs.realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const secretName = process.env.MIAMIELIO_STAGING_SECRETS;
const serial = process.argv[2];

async function main() {
  if (process.argv.length !== 3 || !serial || !/^[A-Za-z0-9_.:\-[\]]+$/.test(serial) || serial.startsWith('-')) {
    throw new Error('Specify one device serial from adb devices.');
  }
  if (!secretName || !path.isAbsolute(secretName)) {
    throw new Error('Set MIAMIELIO_STAGING_SECRETS to an absolute private JSON file path.');
  }
  const file = fs.realpathSync(secretName);
  const relative = path.relative(workspace, file);
  if (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) {
    throw new Error('Keep the staging secret file outside the worktree.');
  }
  if (process.platform !== 'win32' && (fs.statSync(file).mode & 0o077) !== 0) {
    throw new Error('Set permissions on the private staging secret file to 600.');
  }
  let secret;
  try { ({ DASHBOARD_STAGING_ACCESS_SECRET: secret } = JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch { throw new Error('The private staging secret file could not be read.'); }
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('The staging access secret is missing.');
  const health = await fetch(staging + '/__dashboard_staging/health', {
    headers: { Authorization: 'Basic ' + Buffer.from('preview:' + secret).toString('base64') },
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  if (!health.ok) throw new Error('Staging health returned HTTP ' + health.status + '.');
  const identity = await health.json();
  if (identity.environment !== 'dashboard-staging' || identity.projectRef !== project || !/^[a-f0-9]{40}$/.test(identity.commit)) {
    throw new Error('Staging reported an unexpected environment.');
  }
  const session = health.headers.getSetCookie().map(cookie => cookie.split(';', 1)[0])
    .map(cookie => /^__Host-miami-staging=(\d{10}\.[a-f0-9]{64})$/.exec(cookie)?.[1]).find(Boolean);
  if (!session) throw new Error('Staging did not issue a session cookie.');
  const adb = process.env.MIAMIELIO_ADB || 'adb';
  const app = 'com.miamielio.app.debug';
  const command = "run-as " + app + " sh -c 'umask 077 && mkdir -p files && cat > files/miami-staging-session.tmp && mv files/miami-staging-session.tmp files/miami-staging-session'";
  const result = spawnSync(adb, ['-s', serial, 'shell', '-T', command], {
    input: session, stdio: ['pipe', 'ignore', 'ignore'], timeout: 15_000, windowsHide: true,
  });
  const check = spawnSync(adb, ['-s', serial, 'shell', 'run-as', app, 'test', '-s', 'files/miami-staging-session'], {
    stdio: 'ignore', timeout: 15_000, windowsHide: true,
  });
  if (result.status !== 0 || check.status !== 0) {
    throw new Error('Could not provision the debug app. Confirm that the target has the debug APK.');
  }
  console.log('Staging session provisioned for commit ' + identity.commit + '. Relaunch Miami Elio Test.');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
