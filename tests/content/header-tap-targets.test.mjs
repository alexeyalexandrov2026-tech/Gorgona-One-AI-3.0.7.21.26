import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('header icon buttons get a 44px touch area without a new visual size', () => {
  const header = read('app/components/Header.jsx');
  assert.equal((header.match(/className="tap-44 flex h-9 w-9 /g) || []).length, 2, 'back and menu buttons');
  assert.equal((header.match(/className="tap-44 flex h-10 w-10 /g) || []).length, 1, 'account link');
  const css = read('app/globals.css');
  assert.match(css, /\.tap-44 \{ position: relative; \}/);
  assert.match(css, /\.tap-44::after \{ content: ""; position: absolute; top: 50%; left: 50%; width: 44px; height: 44px; transform: translate\(-50%, -50%\); \}/);
  assert.doesNotMatch(css.slice(css.indexOf('.tap-44')), /background|border|box-shadow|color:/, 'the touch layer is invisible');
});
