import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mode = process.argv[2];
if (!['dev', 'build', 'start'].includes(mode)) throw new Error('Expected dev, build or start');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), mode,
  ...(['dev', 'start'].includes(mode) ? ['-p', '3100'] : [])], {
  stdio: 'inherit',
  env: { ...process.env, MIAMI_I18N_PILOT: '1', NEXT_TELEMETRY_DISABLED: '1',
    ...(mode === 'build' ? { NEXT_PRIVATE_STANDALONE: 'true' } : {}) }
});
child.once('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
