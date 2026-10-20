import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Script, createContext } from 'node:vm';
import { buildTicketNetworkDocument } from '../../lib/ticketnetworkWidget.js';

async function widget() {
  const timers = new Map();
  let timerId = 0;
  let prefilter;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  function element() {
    const classes = new Set();
    return {
      hidden: false, value: '', textContent: '',
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) },
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener: function (name, callback) { this[name] = callback; }
    };
  }
  const status = element(), retry = element(), container = element(), results = element(), area = element(), list = element();
  const rows = [];
  results.querySelector = selector => selector === '.tner-list' && rows.length ? list : null;
  const elements = new Map([
    ['widget-status', status], ['widget-retry', retry], ['widget-area', area],
    ['tner-container_gorgona', container], ['tner-results_gorgona', results]
  ]);
  const requests = [];
  const $ = Object.assign(() => ({}), {
    ajaxPrefilter: callback => { prefilter = callback; },
    ajax(original) {
      const done = [], fail = [];
      const options = { ...original };
      const xhr = {
        done: callback => { done.push(callback); return xhr; },
        fail: callback => { fail.push(callback); return xhr; },
        abort: () => { xhr.reject(0, 'abort'); },
        reject(statusCode, reason = 'error') { fail.forEach(callback => callback({ status: statusCode }, reason)); },
        resolve() { done.forEach(callback => callback()); options.success?.(); }
      };
      prefilter(options, original, xhr);
      requests.push({ original, options, xhr });
      return xhr;
    }
  });
  const context = createContext({
    URL, console: { warn() {} },
    document: {
      getElementById: id => elements.get(id) || element(),
      body: { getBoundingClientRect: () => ({ height: 200 }) },
      createElement: () => ({}), head: { appendChild: script => queueMicrotask(() => script.onload()) }
    },
    window: {
      addEventListener() {}, tnerLoaded: true, initializeDatepickers() {}, jQuery: $,
      csctnCall() {
        $.ajax({ url: 'https://www.tn-apis.com/catalog/v2/events/search?q=*&filter=Miami&page=1', success: () => rows.push('page1') });
        started();
      }
    },
    parent: { postMessage() {} },
    MutationObserver: class { observe() {} }, ResizeObserver: class { observe() {} },
    setTimeout: (callback, ms) => { const id = ++timerId; timers.set(id, { callback, ms }); return id; },
    clearTimeout: id => timers.delete(id), clearInterval() {},
    setInterval: callback => { queueMicrotask(callback); return 1; }, Promise
  });
  new Script(buildTicketNetworkDocument('sports').match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
  await ready;
  return {
    $, requests, status, retry, container, results, list, rows, area, timers,
    runRetry(ms) {
      const [id, timer] = [...timers].find(([, timer]) => timer.ms === ms) || [];
      assert.ok(timer, `Expected ${ms}ms retry`); timers.delete(id); timer.callback();
    }
  };
}

test('catalogue 503 retries are bounded and preserve the exact query, then manual retry can recover', async () => {
  const w = await widget();
  assert.equal(w.requests[0].options.timeout, 30000);
  assert.equal(w.timers.size, 0, 'Script deadline must end when the catalogue request starts');
  w.requests[0].xhr.reject(503);
  assert.match(w.status.textContent, /Retrying/);
  w.runRetry(2000);
  w.requests[1].xhr.reject(503);
  w.runRetry(4000);
  w.requests[2].xhr.reject(503);
  assert.equal(w.requests.length, 3);
  assert.equal(w.timers.size, 0);
  assert.equal(w.container.hidden, false);
  assert.equal(w.retry.hidden, false);
  assert.match(w.status.textContent, /not responding/);
  assert.ok(w.requests.every(request => request.original.url === w.requests[0].original.url));
  w.retry.click();
  assert.equal(w.requests[3].original.gorgonaRetry, 0);
  w.requests[3].xhr.resolve();
  assert.equal(w.status.hidden, true);
  assert.equal(w.retry.hidden, true);
  assert.deepEqual(w.rows, ['page1']);
});

test('a failed Load More preserves loaded rows and retries page 2 once without duplicates', async () => {
  const w = await widget();
  w.requests[0].xhr.resolve();
  w.results.classList.remove('loaded');
  w.$.ajax({ url: w.requests[0].original.url.replace('page=1', 'page=2'), success: () => w.rows.push('page2') });
  assert.equal(w.list.hidden, false);
  assert.equal(w.results.classList.contains('loaded'), true);
  w.requests[1].xhr.reject(503); w.runRetry(2000);
  w.requests[2].xhr.reject(503); w.runRetry(4000);
  w.requests[3].xhr.reject(503);
  assert.deepEqual(w.rows, ['page1']);
  assert.equal(w.list.hidden, false);
  w.retry.click(); w.requests[4].xhr.resolve();
  assert.deepEqual(w.rows, ['page1', 'page2']);
  assert.ok(w.requests.slice(1).every(request => request.original.url.endsWith('page=2')));
});

test('an unrelated vendor AJAX failure never replaces a loaded calendar with an error', async () => {
  const w = await widget();
  w.requests[0].xhr.resolve();
  w.$.ajax({ url: 'https://www.ticketnetwork.com/optional-diagnostic' }).reject(500);
  assert.equal(w.status.hidden, true);
  assert.equal(w.container.hidden, false);
  assert.equal(w.timers.size, 0);
  assert.deepEqual(w.rows, ['page1']);
});
