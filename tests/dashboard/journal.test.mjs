import {test} from 'node:test';
import assert from 'node:assert/strict';
import {journalKey,readJournal,writeJournal,clearJournal} from '../../lib/bookingJournal.mjs';
const scope={kind:'car',slug:'demo-car'},now=Date.now();
const entry={version:1,key:'55555555-5555-4555-8555-555555555555',owner:null,createdAt:now,
  body:{name:'Demo',email:'demo@example.com',phone:'+13055550123',dates:'Nov 1–3',kind:'car',itemSlug:'demo-car',itemTitle:'Demo car'},trip:{from:'2026-11-01',to:'2026-11-03',place:0,duration:0,guests:2}};
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
test('a lost request retains its exact key and payload across a remount',()=>{
 const storage=memory();assert.equal(writeJournal(storage,scope,entry),true);
 const restored=readJournal(storage,scope,null,now+1000);assert.equal(restored.key,entry.key);assert.deepEqual(restored.body,entry.body);assert.deepEqual(restored.trip,entry.trip);
});
test('draft recovery is isolated by account and item and never exposes another owner',()=>{
 const storage=memory();writeJournal(storage,scope,{...entry,owner:'account-a'});
 assert.equal(readJournal(storage,scope,'account-b',now),null);assert.equal(readJournal(storage,{kind:'car',slug:'another-car'},'account-a',now),null);
 assert.equal(readJournal(storage,scope,'account-a',now).body.email,'demo@example.com');
});
test('stale or malformed pending data is removed rather than automatically sent',()=>{
 const storage=memory();writeJournal(storage,scope,entry);assert.equal(readJournal(storage,scope,null,now+31*60*1000),null);assert.equal(storage.getItem(journalKey(scope,null)),undefined);
 storage.setItem(journalKey(scope,null),'{broken');assert.equal(readJournal(storage,scope,null,now),null);
 writeJournal(storage,scope,{...entry,body:{...entry.body,itemSlug:'another-car'}});assert.equal(readJournal(storage,scope,null,now),null);
});
test('confirmed receipts clear contact data while storage failures preserve the live form',()=>{
 const storage=memory();writeJournal(storage,scope,entry);clearJournal(storage,scope,null);assert.equal(readJournal(storage,scope,null,now),null);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
 assert.equal(writeJournal(blocked,scope,entry),false);assert.equal(readJournal(blocked,scope,null,now),null);assert.doesNotThrow(()=>clearJournal(blocked,scope,null));
});
