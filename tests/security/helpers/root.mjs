import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The code under test. Defaults to this checkout; SECURITY_TEST_ROOT points
// the same tests at another tree, e.g. an export of main, to show which
// checks fail before the fixes.
export const ROOT = process.env.SECURITY_TEST_ROOT
  ? resolve(process.env.SECURITY_TEST_ROOT)
  : resolve(fileURLToPath(new URL('../../../', import.meta.url)));

export const HARDENED = existsSync(join(ROOT, 'database/02_security_hardening.sql'));
