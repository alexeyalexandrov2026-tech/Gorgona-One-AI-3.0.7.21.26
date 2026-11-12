import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from '../concierge/load.cjs';
const {buildPlan,partySize,planQuery}=load('lib/ai/plan.mjs');
const {planSnapshot,safeImage}=load('lib/ai/session.mjs');
const {PLAN_KINDS,PLAN_SECTIONS,isPlanReceipt}=load('lib/planRules.mjs');
const item=(kind,slug,extra={})=>({kind,slug,title:slug.replace(/-/g,' '),text:'',featured:false,capacity:null,...extra});
const catalog={
 yacht:[item('yacht','small-boat',{capacity:4}),item('yacht','big-yacht',{capacity:12,image:'https://images.unsplash.com/photo-1'})],
 stay:[item('stay','ocean-villa',{capacity:8,image:'/images/villa.jpg'})],
 car:[item('car','white-suv'),item('car','red-lamborghini',{text:'lamborghini supercar'})],
 dining:[item('dining','sushi-house',{text:'sushi japanese'}),item('nightlife','late-club',{text:'nightlife nightclub club'})]
};
const ask=(content,locale='en',requestable=true)=>buildPlan([{role:'user',content}],{catalog,locale,requestable});

test('a plan needs two or more bookable sections named by the guest',()=>{
 assert.equal(ask('I want a yacht'),null);
 assert.equal(ask('Tell me about Miami'),null);
 assert.equal(ask('Concert tickets and a tour'),null);
 const plan=ask('A yacht, a villa and a Lamborghini for the weekend');
 assert.deepEqual(plan.sections.map(s=>s.href),['/yachts','/vacation-rentals','/rentals']);
 assert.equal(plan.sections[2].candidates[0].slug,'red-lamborghini');
 assert.ok(plan.sections.every(s=>s.candidates.every(c=>c.href===s.href+'/'+c.slug&&PLAN_KINDS.includes(c.kind))));
 assert.equal(plan.requestable,true);assert.equal(ask('yacht and a car','en',false).requestable,false);
});
test('the party size filters out items that are too small, in several languages',()=>{
 assert.equal(partySize('for 6 people'),6);assert.equal(partySize('Weekend for 4: yacht'),4);assert.equal(partySize('на 8 человек'),8);assert.equal(partySize('para 5 personas'),5);assert.equal(partySize('a yacht'),null);
 const plan=ask('Yacht and a car for 8 people');
 assert.equal(plan.guests,8);assert.deepEqual(plan.sections[0].candidates.map(c=>c.slug),['big-yacht']);
});
test('restaurants and nightlife share one section and follow the guest words',()=>{
 const plan=ask('Yacht and then a nightclub');
 assert.equal(plan.sections[1].href,'/restaurants-nightlife');assert.equal(plan.sections[1].candidates[0].kind,'nightlife');
 const russian=ask('Яхта и ужин в ресторане суши','ru');
 assert.equal(russian.sections[1].label,'Рестораны и ночная жизнь');assert.equal(russian.sections[1].candidates[0].slug,'sushi-house');
});
test('a short follow-up refines the last plan request; unrelated text does not',()=>{
 const messages=[{role:'user',content:'yacht, dinner and a car'},{role:'assistant',content:'Sure'},{role:'user',content:'for 8 people'}];
 assert.match(planQuery(messages),/yacht, dinner and a car for 8 people/);
 assert.equal(buildPlan(messages,{catalog}).guests,8);
 assert.equal(planQuery([...messages.slice(0,2),{role:'user',content:'What is the weather like?'}]),null);
});
test('a section with no requestable items is left out rather than invented',()=>{
 assert.equal(buildPlan([{role:'user',content:'yacht and a villa'}],{catalog:{...catalog,stay:[]}}),null);
 const plan=buildPlan([{role:'user',content:'yacht, villa and a car'}],{catalog:{...catalog,stay:[]}});
 assert.deepEqual(plan.sections.map(s=>s.href),['/yachts','/rentals']);
});
test('stored and received plans are sanitized: forged routes, kinds, images and keys are dropped',()=>{
 const plan=ask('A yacht, a villa and a car');
 assert.deepEqual(planSnapshot(JSON.parse(JSON.stringify(plan))).sections.map(s=>s.href),plan.sections.map(s=>s.href));
 const forged=structuredClone(plan);
 forged.sections[0].candidates[0].href='https://evil.test/x';forged.sections[1].candidates[0].kind='experience';forged.sections[2].candidates[0].image='javascript:alert(1)';
 forged.sections[0].index=99;forged.attempt={key:'not-a-key',serialized:'x',at:Date.now()};forged.submitted={planId:'nope',count:3};
 const safe=planSnapshot(forged);
 assert.ok(!JSON.stringify(safe).includes('evil.test'));assert.equal(safe.sections.find(s=>s.href==='/vacation-rentals'),undefined);
 assert.equal(safe.sections.find(s=>s.href==='/rentals').candidates[0].image,undefined);
 assert.equal(safe.sections[0].index,0);assert.equal(safe.attempt,undefined);assert.equal(safe.submitted,undefined);
 assert.equal(planSnapshot({...plan,sections:plan.sections.slice(0,1)}),null);
 assert.equal(planSnapshot({...plan,version:2}),null);
 const old={...plan,attempt:{key:'8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a',serialized:'[]',at:Date.now()-31*60*1000}};
 assert.equal(planSnapshot(old).attempt,undefined);
 for(const bad of ['javascript:alert(1)','//evil.test/a.jpg','/images/../x','http://plain.test/a.jpg','https://user:pass@x.test/a.jpg','/a b.jpg'])assert.equal(safeImage(bad),false,bad);
 for(const good of ['/images/rentals/a/cover.jpg','https://images.unsplash.com/photo-1?w=900'])assert.equal(safeImage(good),true,good);
});
test('plan rules and receipts',()=>{
 assert.deepEqual(Object.values(PLAN_SECTIONS),['yacht','stay','car','dining']);
 assert.equal(isPlanReceipt({success:true,planId:'8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a',bookingIds:['8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2b']}),true);
 for(const bad of [null,{success:true},{success:true,planId:'x',bookingIds:[]},{success:true,planId:'8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a',bookingIds:[]}])assert.equal(isPlanReceipt(bad),false);
});
test('the chat route adds a plan of real seed items, even when the model is offline',async()=>{
 const original=globalThis.fetch,logging=console.error,previous=process.env.GORGONA_AI_ENABLED;process.env.GORGONA_AI_ENABLED='off';
 globalThis.fetch=async()=>new Response('{}',{status:503});console.error=()=>{};
 try{
  const {POST}=load('app/api/chat/route.js');
  const post=async messages=>(await POST(new Request('https://example.test/api/chat',{method:'POST',body:JSON.stringify({locale:'en',messages})}))).json();
  const data=await post([{role:'user',content:'A yacht and a car for 4 people'}]);
  assert.equal(data.error,true);assert.deepEqual(data.plan.sections.map(s=>s.href),['/yachts','/rentals']);assert.equal(data.plan.guests,4);assert.equal(data.plan.requestable,false);
  assert.ok(planSnapshot(data.plan));
  assert.equal((await post([{role:'user',content:'Rent a yacht'}])).plan,undefined);
 }finally{globalThis.fetch=original;console.error=logging;if(previous===undefined)delete process.env.GORGONA_AI_ENABLED;else process.env.GORGONA_AI_ENABLED=previous;}
});
