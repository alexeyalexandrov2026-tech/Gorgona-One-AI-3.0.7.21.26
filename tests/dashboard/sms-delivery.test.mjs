// SQL-backed Twilio contract tests. All provider calls are mocked: no real SMS or spend.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,rpc,asUser,ids} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {configuredChannels,dispatchNotifications} from '../../lib/server/notificationDelivery.mjs';

const twilio = {
  TWILIO_SMS_ENABLED:'true',
  TWILIO_ACCOUNT_SID:'AC' + '1'.repeat(32),
  TWILIO_API_KEY_SID:'SK' + '2'.repeat(32),
  TWILIO_API_KEY_SECRET:'fixture-only-not-a-real-api-secret',
  TWILIO_MESSAGING_SERVICE_SID:'MG' + '3'.repeat(32),
  TWILIO_OWNER_PHONE:'+15555550101',
};
const sample = {name:'Private Customer',email:'private-customer@example.com',phone:'+13055550123',
  dates:'2027-01-12',itemSlug:'demo-car',itemTitle:'DEMO premium car',kind:'car'};
async function setup({enabled=true}={}) {
  const db=await fixture();
  if(enabled)await db.exec("update private.sms_notification_settings set enabled=true where singleton=true");
  const sql=provider(db);
  const receipt=await rpc(db,'dashboard_submit',{p_key:randomUUID(),p_fingerprint:randomUUID(),
    p_rate:randomUUID(),p_user:null,p_input:sample});
  assert.equal(receipt.success,true);
  return {db,sql,receipt,env:{...fixtureEnv,...twilio}};
}

test('SMS is off unless explicitly enabled and all credentials validate',()=>{
  assert.deepEqual(configuredChannels({...fixtureEnv,...twilio,TWILIO_SMS_ENABLED:'false'}),[]);
  assert.deepEqual(configuredChannels({...fixtureEnv,...twilio,TWILIO_API_KEY_SECRET:''}),[]);
  assert.deepEqual(configuredChannels({...fixtureEnv,...twilio,TWILIO_OWNER_PHONE:'555-0000'}),[]);
  assert.deepEqual(configuredChannels({...fixtureEnv,...twilio}),['sms']);
});

test('database switch is initially disabled and prevents queued SMS',async()=>{
  const f=await setup({enabled:false});
  try {
    const rows=(await f.db.query("select channel from private.notification_deliveries order by channel")).rows;
    assert.deepEqual(rows.map(x=>x.channel),['email','telegram']);
    const sends=[];
    const out=await dispatchNotifications(f.env,(url,options)=>{
      if(String(url).startsWith(fixtureEnv.NEXT_PUBLIC_SUPABASE_URL))return f.sql(url,options);
      sends.push(url);throw new Error('SMS must not be emitted');
    });
    assert.deepEqual(out,{claimed:0,sent:0,configured:['sms']});
    assert.equal(sends.length,0);
  } finally {await f.db.close();}
});

test('SMS uses Twilio API key only on server and omits customer PII',async()=>{
  const f=await setup();
  try {
    const rows=(await f.db.query("select channel from private.notification_deliveries order by channel")).rows;
    assert.deepEqual(rows.map(x=>x.channel),['email','sms','telegram']);
    const calls=[];
    const fetcher=(url,options)=>{
      if(String(url).startsWith(fixtureEnv.NEXT_PUBLIC_SUPABASE_URL))return f.sql(url,options);
      calls.push({url:String(url),options});
      return Promise.resolve(Response.json({sid:'SM'+'a'.repeat(32),status:'accepted'}));
    };
    assert.deepEqual(await dispatchNotifications(f.env,fetcher),{claimed:1,sent:1,configured:['sms']});
    assert.equal(calls.length,1);
    const call=calls[0];
    assert.equal(call.url,'https://api.twilio.com/2010-04-01/Accounts/'+twilio.TWILIO_ACCOUNT_SID+'/Messages.json');
    assert.equal(call.options.headers['Content-Type'],'application/x-www-form-urlencoded');
    assert.equal(call.options.headers.Authorization,'Basic '+btoa(twilio.TWILIO_API_KEY_SID+':'+twilio.TWILIO_API_KEY_SECRET));
    const body=new URLSearchParams(call.options.body);
    assert.equal(body.get('To'),twilio.TWILIO_OWNER_PHONE);
    assert.equal(body.get('MessagingServiceSid'),twilio.TWILIO_MESSAGING_SERVICE_SID);
    assert.match(body.get('Body'),/^Miami Elio: request created/);
    assert.match(body.get('Body'),/https:\/\/gorgona-one\.com\/admin/);
    assert.match(body.get('Body'),/Reply STOP to opt out\.$/);
    assert.ok(body.get('Body').length<=160);
    for(const pii of [sample.name,sample.email,sample.phone])assert.ok(!call.options.body.includes(pii));
    const saved=(await f.db.query("select status,provider_id from private.notification_deliveries where channel='sms'")).rows[0];
    assert.deepEqual(saved,{status:'sent',provider_id:'SM'+'a'.repeat(32)});
    assert.equal((await dispatchNotifications(f.env,fetcher)).claimed,0);
  }finally{await f.db.close();}
});

test('Twilio API rejection becomes a failure with no repeated paid attempts',async()=>{
  const f=await setup();
  try {
    let count=0;
    const fetcher=(url,options)=>{
      if(String(url).startsWith(fixtureEnv.NEXT_PUBLIC_SUPABASE_URL))return f.sql(url,options);
      count++;return Promise.resolve(Response.json({code:20003},{status:401}));
    };
    assert.equal((await dispatchNotifications(f.env,fetcher)).sent,0);
    const row=(await f.db.query("select status,error_code from private.notification_deliveries where channel='sms'")).rows[0];
    assert.deepEqual(row,{status:'failed',error_code:'configuration'});
    assert.equal((await dispatchNotifications(f.env,fetcher)).claimed,0);
    assert.equal(count,1);
  }finally{await f.db.close();}
});

for (const [name, twilioResponse] of [
  ['a transport timeout', () => { throw new DOMException('Timed out', 'TimeoutError'); }],
  ['an upstream error', () => Response.json({code:20500},{status:500})],
  ['a successful HTTP response without a Message SID', () => Response.json({status:'accepted'})],
]) {
  test('SMS stays failed for reconciliation after ' + name, async () => {
    const {db,sql,env}=await setup();
    try {
      let posts=0;
      const fetcher=(url,options)=>{
        if(String(url).startsWith(fixtureEnv.NEXT_PUBLIC_SUPABASE_URL))return sql(url,options);
        posts++;
        return twilioResponse();
      };
      assert.equal((await dispatchNotifications(env,fetcher)).sent,0);
      const {rows}=await db.query(
        "select status,error_code,provider_id from private.notification_deliveries where channel='sms'");
      assert.deepEqual(rows,[{status:'failed',error_code:'sms_outcome_unknown',provider_id:null}]);
      assert.equal((await dispatchNotifications(env,fetcher)).claimed,0);
      assert.equal(posts,1);
    } finally {await db.close();}
  });
}

test('an SMS attempt survives an expired lease without a second Twilio request',async()=>{
  const {db,sql,env}=await setup();
  try {
    const claimed=await sql(fixtureEnv.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/rpc/dashboard_claim',{
      method:'POST',headers:{Authorization:'Bearer '+fixtureEnv.SUPABASE_SERVICE_ROLE_KEY},
      body:JSON.stringify({p_channels:['sms'],p_limit:1})
    });
    const [{id,lease_id}]=await claimed.json();
    const args={p_id:id,p_lease:lease_id};
    await assert.rejects(asUser(db,ids.customer,
      "select public.dashboard_begin_sms_attempt($1,$2)",[id,lease_id]),/permission denied/);
    assert.equal(await rpc(db,'dashboard_begin_sms_attempt',{...args,p_lease:randomUUID()}),'lease_lost');
    assert.equal(await rpc(db,'dashboard_begin_sms_attempt',args),'reserved');
    assert.equal(await rpc(db,'dashboard_begin_sms_attempt',args),'outcome_unknown');
    await db.query("update private.notification_deliveries set lease_until=now()-interval '1 second' where id=$1",[id]);
    let posts=0;
    const fetcher=(url,options)=>{
      if(String(url).startsWith(fixtureEnv.NEXT_PUBLIC_SUPABASE_URL))return sql(url,options);
      posts++;
      throw new Error('An uncertain attempt must not be repeated');
    };
    assert.equal((await dispatchNotifications(env,fetcher)).sent,0);
    const {rows}=await db.query("select status,error_code from private.notification_deliveries where id=$1",[id]);
    assert.deepEqual(rows,[{status:'failed',error_code:'sms_outcome_unknown'}]);
    assert.equal((await dispatchNotifications(env,fetcher)).claimed,0);
    assert.equal(posts,0);
  } finally {await db.close();}
});

test('an explicitly rejected Twilio rate-limit response can be retried',async()=>{
  const {db,sql,env}=await setup();
  try {
    let posts=0;
    const fetcher=(url,options)=>{
      if(String(url).startsWith(fixtureEnv.NEXT_PUBLIC_SUPABASE_URL))return sql(url,options);
      posts++;
      return posts===1 ? Response.json({code:20429},{status:429,headers:{'Retry-After':'90'}})
        : Response.json({sid:'SM'+'b'.repeat(32),status:'accepted'});
    };
    assert.equal((await dispatchNotifications(env,fetcher)).sent,0);
    const {rows}=await db.query(
      "select status,error_code,next_at>now()+interval '60 seconds' as backed_off from private.notification_deliveries where channel='sms'");
    assert.deepEqual(rows,[{status:'pending',error_code:'rate_limit',backed_off:true}]);
    assert.equal((await dispatchNotifications(env,fetcher)).claimed,0);
    await db.exec("update private.notification_deliveries set next_at=now() where channel='sms'");
    assert.equal((await dispatchNotifications(env,fetcher)).sent,1);
    assert.equal(posts,2);
  } finally {await db.close();}
});

test('a failed reservation call is retried because Twilio was never contacted',async()=>{
  const {db,sql,env}=await setup();
  try {
    let begins=0,posts=0;
    const fetcher=(url,options)=>{
      const target=String(url);
      if(target.endsWith('/rest/v1/rpc/dashboard_begin_sms_attempt')&&++begins===1)
        return Promise.resolve(Response.json({message:'unavailable'},{status:503}));
      if(target.startsWith(fixtureEnv.NEXT_PUBLIC_SUPABASE_URL))return sql(url,options);
      posts++;
      return Promise.resolve(Response.json({sid:'SM'+'c'.repeat(32),status:'accepted'}));
    };
    assert.equal((await dispatchNotifications(env,fetcher)).sent,0);
    assert.equal(posts,0);
    let {rows}=await db.query("select status,error_code from private.notification_deliveries where channel='sms'");
    assert.deepEqual(rows,[{status:'pending',error_code:'provider_unavailable'}]);
    await db.exec("update private.notification_deliveries set next_at=now() where channel='sms'");
    assert.equal((await dispatchNotifications(env,fetcher)).sent,1);
    assert.equal(posts,1);
    ({rows}=await db.query("select status,provider_id from private.notification_deliveries where channel='sms'"));
    assert.deepEqual(rows,[{status:'sent',provider_id:'SM'+'c'.repeat(32)}]);
  } finally {await db.close();}
});

test('daily SMS budget prevents dispatch to Twilio; settings are not writable by clients',async()=>{
  const f=await setup();
  try {
    await assert.rejects(asUser(f.db,ids.customer,
      "update private.sms_notification_settings set enabled=false where singleton=true"),/permission denied/);
    for(let i=0;i<50;i++)assert.equal(await rpc(f.db,'dashboard_reserve_sms',{}),true);
    assert.equal(await rpc(f.db,'dashboard_reserve_sms',{}),false);
    let sent=0;
    const fetcher=(url,options)=>{
      if(String(url).startsWith(fixtureEnv.NEXT_PUBLIC_SUPABASE_URL))return f.sql(url,options);
      sent++;throw new Error('Budget exhausted: no external call allowed');
    };
    assert.equal((await dispatchNotifications(f.env,fetcher)).sent,0);
    assert.equal(sent,0);
    const row=(await f.db.query("select status,error_code from private.notification_deliveries where channel='sms'")).rows[0];
    assert.deepEqual(row,{status:'pending',error_code:'quota'});
  }finally{await f.db.close();}
});
