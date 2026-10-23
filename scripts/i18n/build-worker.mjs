import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, '.open-next');

export function checkWorkerAssets(directory = output) {
  const functions = path.join(directory, 'server-functions');
  const handlers = fs.readdirSync(functions, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(functions, entry.name, 'handler.mjs'))
    .filter(file => fs.existsSync(file));
  if (!handlers.length) throw new Error('The Cloudflare output contains no server handler.');

  const references = new Set();
  for (const handler of handlers) {
    const code = fs.readFileSync(handler, 'utf8');
    for (const reference of code.matchAll(/static\/chunks\/[A-Za-z0-9_\/\[\]-]+-[a-f0-9]{16}\.js|static\/css\/[a-f0-9]+\.css/g)) {
      references.add(reference[0]);
    }
  }
  if (!references.size) throw new Error('The Cloudflare output contains no recognizable client asset references.');
  const missing = [...references].filter(reference =>
    !fs.existsSync(path.join(directory, 'assets', '_next', reference)));
  if (missing.length) throw new Error(`Cloudflare handlers reference missing client assets:\n${missing.join('\n')}`);
  return { handlers: handlers.length, clientAssets: references.size };
}

function main() {
  // A previous output can retain an embedded manifest after its assets change.
  fs.rmSync(output, { recursive: true, force: true });
  const packageDirectory = path.join(root, 'node_modules', '@opennextjs', 'cloudflare');
  const metadata = JSON.parse(fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'));
  const binary = path.join(packageDirectory, metadata.bin['opennextjs-cloudflare']);
  const result = spawnSync(process.execPath, [binary, 'build', '--skipNextBuild', '--openNextConfigPath', 'open-next.config.mjs'], {
    cwd: root, stdio: 'inherit', env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return;
  }
  const report = checkWorkerAssets();
  console.log(`Cloudflare package checked: ${report.handlers} handler(s), ${report.clientAssets} referenced client assets.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
