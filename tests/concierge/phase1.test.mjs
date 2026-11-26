import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';
import {intentEval} from './intent-eval-set.mjs';
import {CLIENT_TIMEOUT_MS} from '../../lib/ai/chatDeadline.mjs';

const {matchActionCards}=load('lib/aiSuggestions.js');
const {listingCards}=load('lib/ai/listingCards.mjs');
const {catalogueAnswer,explicitBooking}=load('lib/ai/catalogueAnswer.mjs');
const {buildPlan}=load('lib/ai/plan.mjs');
const {syncPlanCatalog}=load('lib/ai/syncPlanCatalog.mjs');
const {seatsForCar}=load('lib/carSeats.mjs');

test('paraphrased intent across sections and languages',()=>{
 assert.ok(intentEval.length>=150);
 let ok=0; const misses=[];
 for(const [locale,query,expected] of intentEval){
  const href=matchActionCards(query,{locale,limit:4})[0]?.href;
  if(href===expected)ok++; else misses.push(`${locale} | ${query} -> ${href||'none'} expected ${expected}`);
 }
 const accuracy=ok/intentEval.length;
 console.log(`intent accuracy ${ok}/${intentEval.length} = ${accuracy.toFixed(3)} (baseline on main was 117/150 = 0.780)`);
 if(misses.length)console.log(misses.join('\n'));
 assert.ok(accuracy>=0.93,misses.slice(0,15).join('\n'));
});

test('weekend and brand paraphrases do not steal an explicit vehicle or yacht',()=>{
 const urus=matchActionCards('хочу Урус на выходные',{locale:'ru',limit:4});
 assert.equal(urus[0].href,'/rentals');
 assert.equal(urus.some(card=>card.href==='/travel'),false);
 assert.equal(matchActionCards('Lamborghini Urus for this weekend')[0].href,'/rentals');
 assert.equal(matchActionCards('yacht for 8 people Saturday')[0].href,'/yachts');
 for(const query of ['fly my own plane to NYC','charter a plane','jet','свой борт','самолёт до Нью-Йорка'])assert.equal(matchActionCards(query)[0].href,'/private-jets',query);
 assert.equal(matchActionCards('rent a jet ski this afternoon')[0].href,'/experiences');
 assert.equal(matchActionCards('Find flights to New York')[0].href,'/travel');
});

test('listing cards, seat filter, dining plan, and catalogue fallback',()=>{
 const cards=listingCards('Lamborghini Urus',{locale:'en'});
 assert.ok(cards.length>=1);
 assert.ok(cards.every(card=>/urus/i.test(card.href)&&card.title&&card.image&&card.price));
 const jets=catalogueAnswer([{role:'user',content:'private jets'}],'en');
 assert.match(jets.reply,/charter/i);
 assert.doesNotMatch(jets.reply,/temporarily unavailable/i);
 assert.equal(jets.navigation.cards[0].href,'/private-jets');
 assert.equal(explicitBooking('Please book it and charge the card'),true);
 assert.equal(explicitBooking('I want an Urus this weekend'),false);
 const booked=catalogueAnswer([{role:'user',content:'Please book the Lamborghini and take payment now'}],'en');
 assert.match(booked.reply,/does not create or confirm/);
 const plan=buildPlan([{role:'user',content:'plan a weekend for 6: car, yacht, dinner'}],{catalog:syncPlanCatalog(),locale:'en'});
 assert.ok(plan&&plan.guests===6);
 assert.ok(plan.sections.some(section=>section.href==='/restaurants-nightlife'));
 assert.ok(!plan.sections.some(section=>section.href==='/yachts'));
 const cars=plan.sections.find(section=>section.href==='/rentals');
 assert.ok(cars?.candidates.length);
 assert.ok(cars.candidates.every(item=>!/911/i.test(item.title)));
 assert.ok(cars.candidates.every(item=>seatsForCar({slug:item.slug,title:item.title})>=6));
 assert.equal(CLIENT_TIMEOUT_MS>=8000&&CLIENT_TIMEOUT_MS<=22000,true);
});
test('a vague mood request gets no catalogue row matched on a single word',()=>{
 const {listingCards:cards}=load('lib/ai/listingCards.mjs');
 for(const q of ['something fun','Something fun to do tonight','anything cool'])assert.deepEqual(cards(q),[],q);
 assert.ok(cards('rent a Lamborghini Urus').length>0);
 assert.ok(cards('dinner at Komodo').length>0);
});
