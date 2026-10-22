import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '3101'], {
  env: { ...process.env, MIAMI_I18N_PILOT: '0', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk; });
server.stderr.on('data', (chunk) => { serverOutput += chunk; });
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
try {
  let response;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    response = await fetch('http://127.0.0.1:3101/i18n-pilot', { signal: AbortSignal.timeout(3000) }).catch(() => null);
    if (response) break;
    await delay(100);
  }
  assert.ok(response, `Next server did not start: ${serverOutput}`);
  assert.equal(response.status, 404, 'Pilot must be inaccessible in the default build');
  const yachts = await fetch('http://127.0.0.1:3101/yachts');
  assert.equal(yachts.status, 200);
  assert.match(await yachts.text(), /yatr-catalogue/);
  for (const file of (await files('.next/static/chunks')).filter((file) => file.endsWith('.js'))) {
    const content = await readFile(file, 'utf8');
    assert.doesNotMatch(content, /General Translation|gt-next|GtInternalTranslateJsx|api\.gtx\.dev/,
      `GT runtime found in the disabled client build: ${file}`);
  }
  console.log('Default build: pilot 404, yachts 200, no GT runtime in client chunks.');
} finally {
  server.kill('SIGTERM');
}
