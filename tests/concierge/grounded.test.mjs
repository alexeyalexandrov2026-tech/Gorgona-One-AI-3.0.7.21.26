import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';
import {SUPPORTED_LANGUAGES} from '../../lib/languages.js';
const {groundedReply,CATALOGUE_PROTOCOL}=load('lib/ai/groundedReply.mjs');
const {SECTIONS}=load('lib/aiSuggestions.js');
const input={messages:[{role:'user',content:'Help me choose something special'}],locale:'en'};
const encode=(sections,action='recommend',extra={})=>JSON.stringify({version:1,action,sections,...extra});
test('only canonical section identities and authored copy cross the model boundary',()=>{
 for(const {code:locale}of SUPPORTED_LANGUAGES)for(const {href}of SECTIONS){
  const r=groundedReply(encode([href]),{...input,locale});assert.ok(r,locale+' '+href);assert.equal(r.navigation.cards[0]?.href,href);assert.equal(r.responsePolicy,'catalogue-v1');assert.ok(r.reply.trim());assert.doesNotMatch(r.reply,/https?:|\$180|guaranteed|on the guest list|I arranged|Zuma/);
 }
 assert.match(CATALOGUE_PROTOCOL,/exactly these fields/);
});
test('prose, extra factual fields, invented routes and malformed plans are rejected',()=>{
 for(const raw of ['Your table for eight tomorrow is guaranteed.','I arranged your VIP entry for tonight.','You are on the guest list.','Zuma is open tonight. Dinner is $180/person.',encode(['/yachts'],'recommend',{reply:'Your table is confirmed'}),encode(['/yachts?date=tomorrow']),encode(['/admin']),encode(['/stores']),encode(['https://evil.example']),encode(['/yachts','/yachts']),encode([]),encode(['/yachts'],'confirmed'),JSON.stringify({version:2,action:'recommend',sections:['/yachts']}),'null','[]','{'])assert.equal(groundedReply(raw,input),null,raw);
});
test('explicit intent and follow-ups remain authoritative over model selections',()=>{
 const r=groundedReply(encode(['/restaurants-nightlife']),{...input,messages:[{role:'user',content:'Rent a yacht'},{role:'assistant',content:'Guests?'},{role:'user',content:'For 8 guests tomorrow'}]});assert.equal(r.navigation.cards[0].href,'/yachts');
 const next=groundedReply(encode(['/yachts']),{...input,messages:[{role:'user',content:'Rent a yacht'},{role:'assistant',content:'Guests?'},{role:'user',content:'Rent a car'}]});assert.equal(next.navigation.cards[0].href,'/rentals');
 const unknown=groundedReply(encode(['/restaurants-nightlife']),input);assert.equal(unknown.navigation.cards[0].href,'/restaurants-nightlife');
});
test('provider wrappers contain no public prose and unsupported questions retain no invented facts',()=>{
 const raw=encode(['/yachts']);assert.ok(groundedReply('<think>private</think>\n```json\n'+raw+'\n```',input));
 const r=groundedReply(encode([],'unsupported'),input);assert.ok(r);assert.equal(r.navigation.cards.length,0);
 assert.equal(groundedReply(raw+' I confirmed your booking.',input),null);
 assert.equal(groundedReply(encode(['/sportsbook'],'unsupported'),input),null);
 const handoff=groundedReply(encode([],'handoff'),input);assert.match(handoff.reply,/does not create or confirm/);assert.doesNotMatch(handoff.reply,/cards below/);
 const clarify=groundedReply(encode([],'clarify'),input);assert.ok(clarify.reply);assert.notEqual(clarify.reply,handoff.reply);
});
