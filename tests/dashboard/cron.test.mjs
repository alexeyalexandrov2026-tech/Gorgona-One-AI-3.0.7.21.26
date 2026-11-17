import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { trafficCron } from '../../workers/notifications.mjs';

test('the scheduled worker authenticates its server request and has no public handler',async()=>{
  const original=globalThis.fetch,calls=[];
  let response=new Response('{}');
  globalThis.fetch=async(url,options)=>{calls.push({url:String(url),...options});return response;};
  try {
    let pending;
    await worker.scheduled({}, {NOTIFICATIONS_JOB_URL:'https://example.com/api/internal/notifications',DASHBOARD_OUTBOX_TOKEN:'fixture-secret'}, {waitUntil:p=>{pending=p;}});
    await pending;
    assert.equal(calls.length,1);assert.equal(calls[0].method,'POST');assert.equal(calls[0].headers.Authorization,'Bearer fixture-secret');
    assert.equal(worker.fetch().status,404);
    await worker.scheduled({cron:trafficCron}, {NOTIFICATIONS_JOB_URL:'https://example.com/api/internal/notifications',DASHBOARD_OUTBOX_TOKEN:'fixture-secret'}, {waitUntil:p=>{pending=p;}});
    await pending;
    assert.equal(calls[1].url,'https://example.com/api/internal/notifications/traffic');
    assert.equal(calls[1].headers.Authorization,'Bearer fixture-secret');
    assert.equal(calls[0].redirect,'manual');
    assert.equal(calls[1].redirect,'manual');
    await worker.scheduled({}, {NOTIFICATIONS_JOB_URL:'http://example.com/job',DASHBOARD_OUTBOX_TOKEN:'fixture-secret'}, {waitUntil:p=>{pending=p;}});
    await assert.rejects(pending,/HTTPS is required/);assert.equal(calls.length,2);
    response=Response.redirect('https://other.example/redirected',302);
    await worker.scheduled({}, {NOTIFICATIONS_JOB_URL:'https://example.com/api/internal/notifications',DASHBOARD_OUTBOX_TOKEN:'fixture-secret'}, {waitUntil:p=>{pending=p;}});
    await assert.rejects(pending,/Notification job failed: 302/);
    assert.equal(calls.length,3);
  } finally {globalThis.fetch=original;}
});
