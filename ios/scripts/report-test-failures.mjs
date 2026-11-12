#!/usr/bin/env node
// When the iOS UI tests fail, says which test failed and where, as GitHub
// annotations. Annotations show on the run's page and through the public
// API to anyone, signed in or not, so each carries four things only: the
// test's name, its file, its line, and the assertion's own wording with
// everything taken from the screen or from a person removed. No
// screenshots, no outline of the screen, no text the app or the site showed.
//
//   xcrun xcresulttool get test-results tests --path X.xcresult > tests.json
//   xcrun xcresulttool get test-results summary --path X.xcresult > summary.json
//   node ios/scripts/report-test-failures.mjs tests.json summary.json
//
// Missing or unexpected input makes it say less; it never fails the step.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const ios = path.join(repo, 'ios');

// GitHub keeps at most ten error annotations per step.
export const MOST = 10;
const LONGEST = 160;

/**
 * The first line of a failure message, reduced to the assertion's wording.
 * What XCTest prints between brackets or quotes is what the test compared
 * (labels on screen, text from the site), so it goes; so does anything shaped
 * like an address, a number someone could call, a link or a key. Whatever is
 * left must be plain ASCII: words from the screen in other alphabets go too.
 */
export function cleanMessage(text) {
  let line = String(text ?? '').split(/\r?\n/, 1)[0];
  line = line
    // Shapes first, whole, before brackets can split them.
    .replace(/\b(?:https?|wss?|file|mailto|tel):\S+/gi, '<link>')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<email>')
    .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi, '<id>')
    .replace(/\b0x[0-9a-f]+\b/gi, '<address>')
    // A key before a phone number: keys hold runs of digits too.
    .replace(/\b(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{24,}\b/g, '<key>')
    .replace(/\+?\d[\d\s().-]{5,}\d/g, '<number>')
    // Then what the assertion compared.
    .replace(/\((?:"(?:[^"\\]|\\.)*"|[^()]*)\)/g, '(…)')
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|“[^”]*”|‘[^’]*’|«[^»]*»/g, '"…"')
    .replace(/[^ -~…]+/g, '…')
    .replace(/…(?:\s*…)+/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
  if (line.length > LONGEST) line = `${line.slice(0, LONGEST - 1)}…`;
  return line || 'Failed';
}

/** "testTheFourTabs()", or a neutral name when it is not a test method's. */
export function cleanTestName(name) {
  const match = String(name ?? '').match(/\b(test[A-Za-z0-9_]{0,80})(\(\))?/);
  return match ? `${match[1]}()` : 'UI test';
}

/** A test file in ios/, by name, as a path from the repository's root. */
function locateInIos(name) {
  const stack = [ios];
  while (stack.length) {
    const folder = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(folder, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name !== 'build' && !entry.name.startsWith('.')) stack.push(path.join(folder, entry.name));
      } else if (entry.name === name) {
        return path.relative(repo, path.join(folder, entry.name)).split(path.sep).join('/');
      }
    }
  }
  return null;
}

/** (test, message) for each failure in the test tree; the summary's list
 *  when the tree has none (a crash, say). */
export function failuresFrom(tests, summary) {
  const found = [];
  const walk = (node, test) => {
    if (Array.isArray(node)) {
      for (const value of node) walk(value, test);
    } else if (node && typeof node === 'object') {
      if (node.nodeType === 'Test Case') test = node.name;
      else if (node.nodeType === 'Failure Message') found.push({ test, message: node.name });
      for (const value of Object.values(node)) walk(value, test);
    }
  };
  walk(tests, null);
  if (!found.length && Array.isArray(summary?.testFailures)) {
    for (const item of summary.testFailures) {
      if (item && typeof item === 'object') found.push({ test: item.testName, message: item.failureText });
    }
  }
  return found;
}

const data = (text) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const property = (text) => data(text).replace(/:/g, '%3A').replace(/,/g, '%2C');

/** The workflow commands to print: one `::error` per failed assertion. */
export function annotations(tests, summary, { locate = locateInIos } = {}) {
  const lines = new Set();
  for (const { test, message } of failuresFrom(tests, summary)) {
    const raw = String(message ?? '');
    const source = raw.match(/^\s*([A-Za-z0-9_+-]{1,80}\.swift):(\d{1,6}):\s*/);
    const file = source ? locate(source[1]) : null;
    const where = file && /^ios\/[A-Za-z0-9_./+-]+\.swift$/.test(file) ? `file=${property(file)},line=${source[2]},` : '';
    const text = cleanMessage(source ? raw.slice(source[0].length) : raw);
    lines.add(`::error ${where}title=${property(cleanTestName(test))}::${data(text)}`);
    if (lines.size === MOST) break;
  }
  if (!lines.size) lines.add('::error title=UI tests::The tests failed; the results name no failed test.');
  return [...lines];
}

function read(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const runAsScript = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (runAsScript) {
  const [testsFile, summaryFile] = process.argv.slice(2);
  for (const line of annotations(testsFile ? read(testsFile) : null, summaryFile ? read(summaryFile) : null)) {
    console.log(line);
  }
}
