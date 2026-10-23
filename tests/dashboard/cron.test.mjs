import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../workers/notifications.mjs';

test('the scheduled worker authenticates its server request and has no public handler',async()=>{
  const original=globalThis.fetch,calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url:String(url),...options});return new Response('{}');};
  try {
    let pending;
    await worker.scheduled({}, {NOTIFICATIONS_JOB_URL:'https://example.com/api/internal/notifications',DASHBOARD_OUTBOX_TOKEN:'fixture-secret'}, {waitUntil:p=>{pending=p;}});
    await pending;
    assert.equal(calls.length,1);assert.equal(calls[0].method,'POST');assert.equal(calls[0].headers.Authorization,'Bearer fixture-secret');
    assert.equal(worker.fetch().status,404);
    await worker.scheduled({}, {NOTIFICATIONS_JOB_URL:'http://example.com/job',DASHBOARD_OUTBOX_TOKEN:'fixture-secret'}, {waitUntil:p=>{pending=p;}});
    await assert.rejects(pending,/HTTPS is required/);assert.equal(calls.length,1);
  } finally {globalThis.fetch=original;}
});
