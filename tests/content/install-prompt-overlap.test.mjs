import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('the open install hint moves the phone launchers out of its way', () => {
  const prompt = read('app/components/InstallPrompt.jsx');
  assert.match(prompt, /root\.dataset\.installPrompt = 'open'/);
  assert.match(prompt, /delete root\.dataset\.installPrompt/, 'launchers come back when the hint closes or unmounts');
  assert.match(read('app/components/ai/AiSphere.jsx'), /data-floating-launcher/);
  const css = read('app/ai-overlays.css');
  const block = css.slice(css.indexOf('@media (max-width: 639px) {'), css.indexOf('}', css.indexOf('[data-floating-launcher]')) + 1);
  assert.match(block, /html\[data-install-prompt="open"\] \.aidock/);
  assert.match(block, /html\[data-install-prompt="open"\] \[data-floating-launcher\]/);
  assert.match(block, /visibility: hidden; pointer-events: none;/);
});
