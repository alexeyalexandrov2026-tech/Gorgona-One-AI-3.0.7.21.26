// When the iOS UI tests fail, the workflow names the failure in GitHub
// annotations, which anyone can read without signing in. These checks feed
// it made-up failures full of things that must not get out - words from the
// screen, a guest's name, e-mail and phone, a link with a key in it, memory
// addresses, the outline of the screen - and expect back only the test's
// name, its file, its line and the assertion's own wording.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { annotations, cleanMessage, cleanTestName, MOST } from '../../ios/scripts/report-test-failures.mjs';

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const SCRIPT = fileURLToPath(new URL('../../ios/scripts/report-test-failures.mjs', import.meta.url));
const TEST_FILE = 'ios/MiamiElioUITests/MiamiElioUITests.swift';

const failure = (name) => ({ name, nodeType: 'Failure Message', result: 'Failed' });
const testCase = (name, ...failures) => ({ name, nodeType: 'Test Case', result: failures.length ? 'Failed' : 'Passed', children: failures });

// The shape `xcresulttool get test-results tests` prints.
const TREE = {
  devices: [{ deviceName: 'iPhone 16', osVersion: '18.5' }],
  testNodes: [{
    name: 'MiamiElio', nodeType: 'Test Plan', result: 'Failed',
    children: [{
      name: 'MiamiElioUITests', nodeType: 'UI test bundle', result: 'Failed',
      children: [{
        name: 'MiamiElioUITests', nodeType: 'Test Suite', result: 'Failed',
        children: [
          testCase('testTheFourTabs()',
            failure('MiamiElioUITests.swift:35: XCTAssertEqual failed: ("Добро пожаловать, Анна Петрова") is not equal to ("Your private concierge")'),
            failure('MiamiElioUITests.swift:183: XCTAssertLessThanOrEqual failed: ("612.0") is greater than ("600.0") - Rows overlap: (20.0, 600.0, 353.0, 89.0) and (20.0, 512.0, 353.0, 89.0)'),
            failure('MiamiElioUITests.swift:23: XCTAssertTrue failed - Missing tab: Мой Майами')),
          testCase('testOpeningASectionFromSearchReturnsToHome()',
            failure([
              'MiamiElioUITests.swift:119: XCTAssertTrue failed - Guest anna.petrova@example.com +1 (305) 555-0142 saw https://gorgona-one.com/profile?token=eyJhbGciOiJIUzI1NiJ9abcdefghij at 0x600003a1c2d0 id 3F2504E0-4F89-11D3-9A0C-0305E82C3301',
              "Attributes: Application, pid: 4242, label: 'Miami Elio'",
              "  Button, identifier: 'concierge.mic', label: 'Speak your request'",
              '  Screenshot: 2-concierge_0_6A1B.png'
            ].join('\n'))),
          testCase('testSplashShowsTheBrandThenLifts()'),
          testCase('testSecretHelper()', failure('Secret.swift:5: token 9f8e7d6c5b4a39281706f5e4d3c2b1a0'))
        ]
      }]
    }]
  }]
};

// Everything here was made up for the test; none of it may reach an annotation.
const PRIVATE = [
  'Анна', 'Петрова', 'Добро', 'Мой', 'Майами', 'Your private concierge', 'Speak your request', 'Miami Elio',
  'anna', 'example.com', '305', '555', '0142', 'gorgona-one', 'token=', 'eyJ', '9f8e7d6c', '0x6000', '3F2504E0',
  'Attributes', 'label:', 'identifier', 'pid', '4242', 'Screenshot', '.png', '612.0', '353.0', 'Secret.swift'
];

// One line, and only these parts: test, optional file and line, message.
const ANNOTATION = /^::error (?:file=ios\/[A-Za-z0-9_/.+-]+\.swift,line=\d{1,6},)?title=(?:test[A-Za-z0-9_]*\(\)|UI test)::[ -~…]*$/;

function assertNothingPrivate(lines) {
  for (const line of lines) {
    assert.match(line, ANNOTATION, `not a bare annotation: ${line}`);
    for (const secret of PRIVATE) {
      assert.ok(!line.includes(secret), `"${secret}" got into ${line}`);
    }
  }
}

test('a failed UI test is reported as its name, file, line and a cleaned message - nothing else', () => {
  const lines = annotations(TREE, null);
  assertNothingPrivate(lines);
  assert.deepEqual(lines, [
    `::error file=${TEST_FILE},line=35,title=testTheFourTabs()::XCTAssertEqual failed: (…) is not equal to (…)`,
    `::error file=${TEST_FILE},line=183,title=testTheFourTabs()::XCTAssertLessThanOrEqual failed: (…) is greater than (…) - Rows overlap: (…) and (…)`,
    `::error file=${TEST_FILE},line=23,title=testTheFourTabs()::XCTAssertTrue failed - Missing tab: …`,
    `::error file=${TEST_FILE},line=119,title=testOpeningASectionFromSearchReturnsToHome()::XCTAssertTrue failed - Guest <email> <number> saw <link> at <address> id <id>`,
    '::error title=testSecretHelper()::token <key>'
  ]);
});

test('a crash with no failure message is reported from the summary, cleaned the same way', () => {
  const summary = {
    result: 'Failed', totalTestCount: 3, failedTests: 1,
    testFailures: [{ testName: 'testTheFourTabs()', failureText: 'Crash: MiamiElio (4242) at Season.decode — anna.petrova@example.com, «Сезон Майами»' }]
  };
  const lines = annotations({ testNodes: [] }, summary);
  assert.equal(lines.length, 1);
  assertNothingPrivate(lines);
  assert.match(lines[0], /^::error title=testTheFourTabs\(\)::Crash: MiamiElio \(…\) at Season\.decode … <email>, "…"$/);
});

test('without readable results it says only that the tests failed', () => {
  for (const [tests, summary] of [[null, null], [{}, {}], ['not json', 42], [{ testNodes: [testCase('testA()')] }, { testFailures: 'x' }]]) {
    assert.deepEqual(annotations(tests, summary), ['::error title=UI tests::The tests failed; the results name no failed test.']);
  }
});

test('no more annotations than GitHub keeps for a step', () => {
  const many = { testNodes: [testCase('testMany()', ...Array.from({ length: 15 }, (_, i) => failure(`MiamiElioUITests.swift:${i + 1}: XCTFail`)))] };
  assert.equal(annotations(many, null).length, MOST);
});

test('test names and messages are reduced to safe ASCII', () => {
  assert.equal(cleanTestName('-[MiamiElioUITests testTheFourTabs]'), 'testTheFourTabs()');
  assert.equal(cleanTestName('Анна'), 'UI test');
  assert.equal(cleanTestName(undefined), 'UI test');
  assert.equal(cleanMessage('first line\nsecond line'), 'first line');
  assert.equal(cleanMessage(''), 'Failed');
  assert.ok(cleanMessage('x'.repeat(500)).length <= 160);
  assert.equal(cleanMessage('call +7 916 123-45-67 or mailto:a@b.co'), 'call <number> or <link>');
});

test('run as a script, it prints exactly these annotations and nothing else', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-failures-'));
  try {
    fs.writeFileSync(path.join(folder, 'tests.json'), JSON.stringify(TREE));
    fs.writeFileSync(path.join(folder, 'summary.json'), JSON.stringify({ result: 'Failed' }));
    const run = spawnSync(process.execPath, [SCRIPT, path.join(folder, 'tests.json'), path.join(folder, 'summary.json')], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stderr, '');
    const printed = run.stdout.trim().split(/\r?\n/);
    assert.deepEqual(printed, annotations(TREE, null));
    assertNothingPrivate(printed);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('the workflow publishes only these annotations: no screen outline, no screenshots', () => {
  const workflow = read('.github/workflows/ios.yml');
  const step = workflow.slice(workflow.indexOf('- name: Report failed tests'), workflow.indexOf('- name: Upload screenshots'));
  assert.match(step, /if: failure\(\)/);
  assert.match(step, /node scripts\/report-test-failures\.mjs build\/tests\.json build\/summary\.json\n/);
  assert.doesNotMatch(step, /attachments|screenshot|hierarchy/i);
  assert.ok(!fs.existsSync(new URL('../../ios/scripts/report-test-failures.py', import.meta.url)), 'the old reporter is gone');
  // The step logs are readable by any GitHub user too: the screenshot step
  // no longer prints the outline of the screen into them.
  assert.doesNotMatch(read('ios/scripts/collect-screenshots.py'), /UI hierarchy|On screen/);
});
