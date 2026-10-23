import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture,ids,rpc } from './database.mjs';
import { provider,fixtureEnv } from './provider.mjs';
import { dashboardHandlers } from '../../lib/server/dashboardHandlers.mjs';
import { dispatchNotifications,notificationJob } from '../../lib/server/notificationDelivery.mjs';
let db,handlers,fetcher,id;
const payload={name:'Demo',email:'demo@example.com',phone:'+13055550123',dates:'2026-11-01',itemSlug:'demo-car',itemTitle:'Demo car',kind:'car',customer_user_id:ids.admin,role:'admin'};
const request=(path,actor,body,key=randomUUID())=>new Request('https://example.com'+path,{method:body?'POST':'GET',headers:{...(actor?{Authorization:'Bearer '+actor}:{}),'Content-Type':'application/json','Idempotency-Key':key},...(body?{body:JSON.stringify(body)}:{})});
before(async()=>{db=await fixture();fetcher=provider(db);handlers=dashboardHandlers(fixtureEnv,fetcher);});
after(async()=>{await db?.close();});
test('API saves only the verified owner, ignoring supplied ownership and role',async()=>{
 const response=await handlers.book(request('/api/book',ids.customer,payload));assert.equal(response.status,200);id=(await response.json()).bookingId;
 assert.equal((await db.query('select customer_user_id from public.bookings where id=$1',[id])).rows[0].customer_user_id,ids.customer);
});
test('API rejects bad auth instead of silently submitting as a guest',async()=>{
 assert.equal((await handlers.book(request('/api/book','invalid-token',payload))).status,401);
 assert.equal((await handlers.list(request('/api/dashboard/requests'))).status,401);
});
test('server denies admin scope despite forged user metadata',async()=>{
 assert.equal((await handlers.list(request('/api/dashboard/requests?scope=admin',ids.partner))).status,403);
 assert.equal((await handlers.notifications(request('/api/dashboard/notifications',ids.customer))).status,403);
});
test('list and detail reads enforce ownership and no-store responses',async()=>{
 const response=await handlers.list(request('/api/dashboard/requests',ids.customer));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const rows=(await response.json()).requests;assert.equal(rows.length,1);assert.equal(rows[0].client_email,undefined);
 assert.equal((await handlers.detail(request('/api/dashboard/requests/'+id,ids.other),id)).status,404);
 assert.equal((await handlers.detail(request('/api/dashboard/requests/'+id,ids.customer),id)).status,200);
});
test('admin assigns and the assigned partner responds through the real SQL command',async()=>{
 assert.equal((await handlers.command(request('/x',ids.admin,{action:'assign',version:0,partnerId:ids.partner}),id)).status,200);
 assert.equal((await handlers.list(request('/x?scope=partner',ids.partner))).status,200);
 assert.equal((await handlers.command(request('/x',ids.partner,{action:'respond',version:1,reply:'Demo response'}),id)).status,200);
 const response=await handlers.detail(request('/x',ids.customer),id);assert.equal((await response.json()).request.response,'Demo response');
 assert.equal((await handlers.command(request('/x',ids.admin,{action:'close',version:0}),id)).status,409);
});
test('invalid filters and missing server configuration fail closed',async()=>{
 assert.equal((await handlers.list(request('/x?status=arbitrary',ids.admin))).status,400);
 assert.equal((await handlers.list(request('/x?cursor=invalid',ids.customer))).status,400);
 assert.equal((await dashboardHandlers({},fetcher).book(request('/api/book',null,payload))).status,503);
});
test('delivery sends only to configured owner and turns paid broadcasts off',async()=>{
 await db.exec("delete from private.notification_deliveries where status<>'sent'");
 await handlers.book(request('/api/book',null,payload));const sent=[];
 const external=async(url,options)=>{
   if(String(url).includes('placeholder.supabase.co'))return fetcher(url,options);
   const body=JSON.parse(options.body);sent.push({url:String(url),body,headers:options.headers});
   return String(url).includes('api.telegram.org')?Response.json({ok:true,result:{message_id:42}}):Response.json({id:'fixture-email'});
 };
 const env={...fixtureEnv,TELEGRAM_BOT_TOKEN:'fixture-bot-not-real',TELEGRAM_OWNER_CHAT_ID:'123456',RESEND_API_KEY:'fixture-resend-not-real',ADMIN_EMAIL:'owner@example.com',NOTIFICATIONS_FROM_EMAIL:'alerts@example.com'};
 const result=await dispatchNotifications(env,external,async()=>{});assert.equal(result.sent,2);
 assert.equal(sent.find(x=>x.url.includes('telegram')).body.allow_paid_broadcast,false);
 assert.equal(sent.find(x=>x.url.includes('resend')).body.to,'owner@example.com');
 assert.equal((await notificationJob(request('/job',null,{}),{...env,DASHBOARD_OUTBOX_TOKEN:'x'.repeat(32)},external)).status,401);
});
test('Telegram throttling is retried after the provider delay',async()=>{
 await db.exec("delete from private.notification_deliveries where status<>'sent'");await handlers.book(request('/api/book',null,payload));
 const external=(url,options)=>String(url).includes('placeholder.supabase.co')?fetcher(url,options):Promise.resolve(Response.json({ok:false,parameters:{retry_after:120}},{status:429}));
 const result=await dispatchNotifications({...fixtureEnv,TELEGRAM_BOT_TOKEN:'fixture',TELEGRAM_OWNER_CHAT_ID:'123'},external,async()=>{});
 assert.equal(result.sent,0);
 const row=(await db.query("select status,error_code,attempts,next_at>now()+interval '110 seconds' as delayed from private.notification_deliveries where channel='telegram' and status<>'sent'")).rows[0];
 assert.deepEqual(row,{status:'pending',error_code:'rate_limit',attempts:1,delayed:true});
});
test('a blocked bot becomes an explicit failure instead of looping',async()=>{
 await db.exec("delete from private.notification_deliveries where status<>'sent'");await handlers.book(request('/api/book',null,payload));
 const external=(url,options)=>String(url).includes('placeholder.supabase.co')?fetcher(url,options):Promise.resolve(Response.json({ok:false},{status:403}));
 await dispatchNotifications({...fixtureEnv,TELEGRAM_BOT_TOKEN:'fixture',TELEGRAM_OWNER_CHAT_ID:'123'},external,async()=>{});
 assert.equal((await db.query("select status from private.notification_deliveries where channel='telegram' and status<>'sent'")).rows[0].status,'failed');
});
test('cursor pagination preserves tied timestamps without duplicates or omissions',async()=>{
 const added=[];
 for(let i=0;i<27;i++){
   const receipt=await rpc(db,'dashboard_submit',{p_key:randomUUID(),p_fingerprint:'pagination',p_rate:randomUUID(),p_user:ids.customer,p_input:payload});added.push(receipt.bookingId);
 }
 await db.query("update public.bookings set created_at='2026-10-23T00:00:00Z' where id=any($1::uuid[])",[added]);
 const first=await (await handlers.list(request('/x',ids.customer))).json();
 assert.equal(first.requests.length,25);assert.ok(first.nextCursor);
 const second=await (await handlers.list(request('/x?cursor='+encodeURIComponent(first.nextCursor),ids.customer))).json();
 assert.equal(second.nextCursor,null);assert.equal(second.requests.length,3);
 assert.deepEqual(new Set([...first.requests,...second.requests].map(r=>r.id)),new Set([id,...added]));
});
