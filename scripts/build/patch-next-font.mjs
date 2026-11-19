// Keeps `next build` from failing at random on Google Fonts.
//
// Google Fonts sometimes answers with font addresses that have no file
// extension (https://fonts.gstatic.com/l/font?kit=...). Next.js 15 reads the
// extension with a pattern that then matches nothing and crashes the build:
// "TypeError: Cannot read properties of null (reading '1')" in next/font.
// It happens to roughly one stylesheet in fifty; the site loads eight, so
// about one build in seven failed, in CI and on deploy alike.
//
// Next.js 16 fixed this upstream. This script applies the same rule to the
// installed Next.js 15 after every install: take the extension from the
// address when it has one, otherwise woff2, which is the format the loader
// asks Google for. Delete this script and its `postinstall` entry when the
// project moves to Next.js 16.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LOADER = 'node_modules/next/dist/compiled/@next/font/dist/google/loader.js';
const CRASHING = "const ext = /\\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1];";

// The extension of a Google Fonts file address; woff2 when it has none.
export function fontExtension(address) {
  return (/\.(woff|woff2|eot|ttf|otf)$/.exec(address.split(/[?#]/, 1)[0]) || [])[1] || 'woff2';
}

// The function above is written into the loader as is, so the rule that is
// tested is the rule that runs.
const SAFE = `const ext = (${fontExtension})(googleFontFileUrl);`;

// 'patched'   the crashing line was replaced
// 'already'   the safe line is there
// 'upstream'  this Next.js no longer reads the extension here (16 and later)
export function patchLoader(source) {
  if (source.includes(CRASHING)) return { status: 'patched', source: source.replace(CRASHING, SAFE) };
  if (source.includes(SAFE)) return { status: 'already', source };
  return { status: 'upstream', source };
}

// True when the loader would still crash on an address without an extension.
export function loaderCrashes(source) {
  return source.includes(CRASHING);
}

function main() {
  const file = path.join(fileURLToPath(new URL('../../', import.meta.url)), LOADER);
  // Never block an install: a missing or unreadable loader is reported, and
  // tests/content/build.test.mjs fails CI if the crash is still possible.
  let source;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch {
    console.warn('patch-next-font: Next.js font loader not found; nothing patched.');
    return;
  }
  const result = patchLoader(source);
  if (result.status === 'patched') fs.writeFileSync(file, result.source);
  console.log({
    patched: 'patch-next-font: the Next.js font loader now accepts Google Fonts addresses without an extension.',
    already: 'patch-next-font: already applied.',
    upstream: 'patch-next-font: this Next.js does not need the patch; scripts/build/patch-next-font.mjs can be deleted.'
  }[result.status]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
