import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';
import {acceptanceCases,acceptanceFollowups,cases,isConciergeAcceptanceDestination} from './scenarios.mjs';
const {matchActionCards}=load('lib/aiSuggestions.js');
const {searchEcosystem}=load('lib/ai/intent.js');
const {getEcosystemIndex}=load('lib/ai/ecosystemIndex.js');
test('hosted acceptance excludes restaurant routes and retains the supported journeys',()=>{
 for (const href of ['/restaurants-nightlife','/restaurants-nightlife/komodo-miami','/restaurants-nightlife?date=tomorrow','/stores/restaurants']) {
  assert.equal(isConciergeAcceptanceDestination(href),false,href);
 }
 for (const {expected,also} of [...acceptanceCases,...acceptanceFollowups]) {
  assert.ok(isConciergeAcceptanceDestination(expected),expected);
  if (also) assert.ok(isConciergeAcceptanceDestination(also),also);
 }
 assert.deepEqual(new Set(acceptanceCases.map(c=>c.locale)),new Set(cases.map(c=>c.locale)));
 for (const locale of ['en','ru','es']) {
  for (const expected of ['/yachts','/rentals','/events']) {
   assert.ok(acceptanceCases.some(c=>c.locale===locale&&c.expected===expected),locale+' '+expected);
  }
 }
 assert.equal(acceptanceFollowups.length,2);
});
for(const c of cases)test('primary section '+c.locale+' '+c.query,()=>{assert.equal(matchActionCards(c.query,{locale:c.locale})[0]?.href,c.expected);});
for(const c of cases)test('Discovery primary '+c.locale+' '+c.query,()=>{const first=searchEcosystem(c.query,{locale:c.locale}).results[0];assert.ok(first&&(first.href===c.expected||first.href.startsWith(c.expected+'/')),first?.href);});
test('retired brand destinations are absent from Discovery',()=>{assert.ok(getEcosystemIndex().every(e=>!e.href.startsWith('/brands/')&&!e.href.startsWith('/stores')));});
for(const [query,root] of [['private jet charter','/private-jets'],['частный самолёт','/private-jets'],['nightclub bottle service','/restaurants-nightlife'],['游艇','/yachts'],['хочу яхту','/yachts'],['waterfront restaurant','/restaurants-nightlife']])test('Discovery intent '+query,()=>{const results=searchEcosystem(query).results;assert.ok(results.length);assert.ok(results[0].href.startsWith(root),results[0].href);});
test('a named venue links directly to its canonical detail',()=>{assert.equal(searchEcosystem('Komodo').results[0]?.href,'/restaurants-nightlife/komodo-miami');});
test('named venues and yacht models are not excluded by a generic city match',()=>{for(const [query,root] of [['Komodo Miami','/restaurants-nightlife/komodo-miami'],['LIV Miami','/restaurants-nightlife/'],['E11EVEN Miami','/restaurants-nightlife/']])assert.ok(searchEcosystem(query).results[0]?.href.startsWith(root),query);for(const venue of getEcosystemIndex().filter(item=>['Restaurant','Nightlife'].includes(item.type)))assert.equal(searchEcosystem(venue.title+' Miami').results[0]?.href,venue.href,venue.title);const yacht=getEcosystemIndex().find(item=>item.type==='Yacht');assert.equal(searchEcosystem(yacht.title+' Miami').results[0]?.href,yacht.href);});
test('mixed requests retain a destination for each requested product',()=>{for(const [query,roots] of [['I need a yacht and a car',['/yachts','/rentals']],['A restaurant and a private jet',['/restaurants-nightlife','/private-jets']]]){const results=searchEcosystem(query).results;for(const root of roots)assert.ok(results.some(item=>item.href===root||item.href.startsWith(root+'/')),query+' missing '+root);assert.equal(new Set(results.map(item=>item.href)).size,results.length);}});
