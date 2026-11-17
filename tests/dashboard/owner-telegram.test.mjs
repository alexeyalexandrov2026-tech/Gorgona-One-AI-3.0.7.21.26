import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture, ids, asUser } from './database.mjs';
import { fixtureEnv, provider } from './provider.mjs';
import { dispatchNotifications } from '../../lib/server/notificationDelivery.mjs';
import { formatTelegramNotification } from '../../lib/server/ownerNotificationText.mjs';
import { ownerTrafficJob } from '../../lib/server/ownerTraffic.mjs';

const env = { ...fixtureEnv, DASHBOARD_OUTBOX_TOKEN:'fixture-outbox-token-32-characters',
  TELEGRAM_BOT_TOKEN:'mock-bot', TELEGRAM_OWNER_CHAT_ID:'123',
  CLOUDFLARE_WEB_ANALYTICS_API_TOKEN:'mock-read-only',
  CLOUDFLARE_WEB_ANALYTICS_ACCOUNT_ID:'a'.repeat(32), CLOUDFLARE_WEB_ANALYTICS_SITE_ID:'b'.repeat(32) };
const hourMs = 3600000;
const request = (token = env.DASHBOARD_OUTBOX_TOKEN) => new Request('https://example.com/traffic',{
  method:'POST', headers:{ Authorization:`Bearer ${token}` }
});
const analyticsResponse = (traffic = [{ count:10, sum:{ visits:6 } }]) =>
  Response.json({ data:{ viewer:{ accounts:[{ traffic }] } } });

async function addBusinessEvent(db, age) {
  const { rows:[{ id }] } = await db.query(`insert into private.notification_events(event_type,title,created_at)
    values('request_created','Customer name and address customer@example.com',now()-$1::interval) returning id`,[age]);
  await db.query("insert into private.notification_deliveries(event_id,channel) values($1,'telegram'),($1,'email')",[id]);
  return id;
}

async function enableTraffic(db) {
  const { rows:[{ hour }] } = await db.query("select date_trunc('hour',now(),'UTC')-interval '1 hour' as hour");
  await db.query("update private.owner_notification_settings set telegram_from=now()-interval '10 minutes',traffic_from=$1",[hour]);
  return hour.getTime() + hourMs + 15 * 60000;
}

test('Telegram starts at cutover, omits customer data, and leaves email eligible',async t=>{
  const db = await fixture({ enableTelegram:false });
  t.after(()=>db.close());
  const old = await addBusinessEvent(db,'10 minutes'), latest = await addBusinessEvent(db,'1 minute');
  const sql = provider(db), messages = [];
  const fetcher = async (url,options) => {
    if (new URL(url).hostname === 'api.telegram.org') {
      assert.equal(options.redirect,'manual');
      messages.push(JSON.parse(options.body));
      return Response.json({ ok:true,result:{ message_id:1 } });
    }
    return sql(url,options);
  };
  assert.equal((await dispatchNotifications(env,fetcher)).claimed,0);
  await db.exec("update private.owner_notification_settings set telegram_from=now()-interval '5 minutes'");
  assert.equal((await dispatchNotifications(env,fetcher)).sent,1);
  assert.equal(messages.length,1);
  assert.match(messages[0].text,/Новая заявка/);
  assert.doesNotMatch(messages[0].text,/customer@example.com/);
  assert.equal(messages[0].chat_id,'123');
  assert.equal(messages[0].allow_paid_broadcast,false);
  const { rows } = await db.query('select event_id,channel,status from private.notification_deliveries order by channel,status');
  assert.deepEqual(rows.filter(row=>row.channel==='telegram'),[
    { event_id:old,channel:'telegram',status:'pending' },
    { event_id:latest,channel:'telegram',status:'sent' }
  ]);
  const emailPending = rows.filter(row=>row.channel==='email' && row.status==='pending');
  assert.deepEqual(new Set(emailPending.map(row=>row.event_id)),new Set([old,latest]));
});

test('parallel schedules record a single site-only, bot-filtered digest',async t=>{
  const db = await fixture();
  t.after(()=>db.close());
  const now = await enableTraffic(db), sql = provider(db), queries = [], sent = [];
  await db.exec('update private.sms_notification_settings set enabled=true');
  const fetcher = async (url,options) => {
    const { hostname } = new URL(url);
    if (hostname === 'api.cloudflare.com') {
      assert.equal(options.redirect,'manual');
      queries.push(JSON.parse(options.body));
      return analyticsResponse();
    }
    if (hostname === 'api.telegram.org') {
      sent.push(JSON.parse(options.body));
      return Response.json({ ok:true,result:{ message_id:7 } });
    }
    return sql(url,options);
  };
  await assert.rejects(asUser(db,ids.customer,'select public.dashboard_traffic_hour_due(now())'),{ code:'42501' });
  assert.equal((await ownerTrafficJob(request('invalid'),env,fetcher,now)).status,401);
  assert.equal(queries.length,0);
  const responses = await Promise.all([1,2].map(()=>ownerTrafficJob(request(),env,fetcher,now)));
  assert.deepEqual((await Promise.all(responses.map(r=>r.json()))).map(x=>x.status).sort(),['not_due','recorded']);
  assert.match(queries[0].query,/bot:0/);
  assert.equal(queries[0].variables.site,env.CLOUDFLARE_WEB_ANALYTICS_SITE_ID);
  assert.equal(Date.parse(queries[0].variables.to)-Date.parse(queries[0].variables.from),hourMs);
  const { rows:[delivery] } = await db.query('select channel from private.notification_deliveries');
  assert.deepEqual(delivery,{ channel:'telegram' });
  assert.equal((await dispatchNotifications(env,fetcher)).sent,1);
  assert.match(sent[0].text,/Визиты: 6 · Просмотры: 10/);
  assert.match(sent[0].text,/Майами/);
  assert.equal((await dispatchNotifications(env,fetcher)).claimed,0);
});

test('a GraphQL error remains retryable, while a valid empty hour is recorded silently',async t=>{
  const db = await fixture();
  t.after(()=>db.close());
  const now = await enableTraffic(db), sql = provider(db);
  let error = true;
  const fetcher = (url,options) => {
    const { hostname } = new URL(url);
    if (hostname === 'api.cloudflare.com') {
      return Promise.resolve(error ? Response.json({ errors:[{ message:'fixture failure' }] }) : analyticsResponse([]));
    }
    if (hostname === 'api.telegram.org') {
      return Promise.resolve(Response.json({ ok:true,result:{ message_id:9 } }));
    }
    return sql(url,options);
  };
  assert.equal((await ownerTrafficJob(request(),env,fetcher,now)).status,502);
  assert.equal((await db.query('select * from private.owner_traffic_hours')).rows.length,0);
  await addBusinessEvent(db,'1 minute');
  assert.equal((await dispatchNotifications(env,fetcher)).sent,1);
  error = false;
  assert.deepEqual(await (await ownerTrafficJob(request(),env,fetcher,now)).json(),{ status:'recorded' });
  assert.equal((await db.query('select * from private.owner_traffic_hours where pageviews=0')).rows.length,1);
  assert.equal((await db.query("select * from private.notification_events where event_type='traffic_hourly'")).rows.length,0);
});

test('a lost Telegram response is tracked without sending a second digest',async t=>{
  const db = await fixture();
  t.after(()=>db.close());
  const now = await enableTraffic(db), sql = provider(db);
  let telegramCalls=0;
  const fetcher = async (url,options) => {
    if (new URL(url).hostname === 'api.cloudflare.com') return analyticsResponse();
    if (new URL(url).hostname === 'api.telegram.org') {
      telegramCalls++;
      throw new Error('fixture timeout');
    }
    return sql(url,options);
  };
  assert.equal((await ownerTrafficJob(request(),env,fetcher,now)).status,200);
  assert.equal((await dispatchNotifications(env,fetcher)).sent,0);
  assert.equal((await dispatchNotifications(env,fetcher)).claimed,0);
  assert.equal(telegramCalls,1);
  const { rows } = await db.query('select status,error_code from private.notification_deliveries');
  assert.deepEqual(rows,[{ status:'failed',error_code:'traffic_outcome_unknown' }]);
});

test('a repeated Miami wall-clock hour displays both UTC offsets',()=>{
  const text = formatTelegramNotification({ event_type:'traffic_hourly',
    title:JSON.stringify({ hour:'2026-11-01T05:00:00Z',visits:2,pageviews:3 }) });
  assert.match(text,/GMT-4.*GMT-5/);
});
