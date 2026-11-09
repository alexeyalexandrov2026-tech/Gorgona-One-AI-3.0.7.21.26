import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture} from './database.mjs';
import {provider,fixtureEnv} from './provider.mjs';
import {dashboardHandlers} from '../../lib/server/dashboardHandlers.mjs';
import {bookingInput} from '../../lib/server/dashboardCore.mjs';
import {SUNSET_FLEET} from '../../lib/sunsetFleet.mjs';

test('all imported car identities fit the existing request contract',()=>{
  for(const car of SUNSET_FLEET){
    const input={name:'Local QA',email:'local@example.com',phone:'+13055550123',dates:'2026-12-10 → 2026-12-12 · Pickup / delivery: '+car.location,
      itemSlug:car.slug,itemTitle:car.title+' · '+car.supplier,kind:'car'};
    const parsed=bookingInput(input);assert.equal(parsed.itemSlug,car.slug);assert.equal(parsed.itemTitle,input.itemTitle);
  }
});

test('a supplier enquiry persists as one pending manual request, including on retry',async()=>{
  const db=await fixture();
  try{
    const handlers=dashboardHandlers(fixtureEnv,provider(db)),car=SUNSET_FLEET[0],key=randomUUID();
    const input={name:'Local QA',email:'local@example.com',phone:'+13055550123',dates:'2026-12-10 → 2026-12-12 · Pickup / delivery: '+car.location,
      itemSlug:car.slug,itemTitle:car.title+' · '+car.supplier,kind:'car'};
    const send=()=>handlers.book(new Request('https://local.example/api/book',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(input)}));
    const first=await send();assert.equal(first.status,200);const receipt=await first.json();assert.equal(receipt.success,true);
    const replay=await send();assert.equal(replay.status,200);assert.equal((await replay.json()).bookingId,receipt.bookingId);
    const rows=(await db.query('select item_slug,item_title,status,dates,customer_user_id from public.bookings')).rows;
    assert.equal(rows.length,1);assert.equal(rows[0].item_slug,car.slug);assert.equal(rows[0].item_title,input.itemTitle);
    assert.equal(rows[0].status,'pending');assert.equal(rows[0].customer_user_id,null);assert.equal(rows[0].dates,input.dates);
  }finally{await db.close();}
});
