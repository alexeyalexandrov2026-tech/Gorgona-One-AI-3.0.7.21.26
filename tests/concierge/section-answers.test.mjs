import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const {groundedReply}=load('lib/ai/groundedReply.mjs');
const {CONVERSATION_PROTOCOL}=load('lib/ai/conciergeReply.mjs');
const {adviceCopy}=load('lib/ai/conciergeAdvice.mjs');

const recommend=(section,content,locale='en')=>groundedReply(JSON.stringify({version:1,action:'recommend',sections:[section]}),{messages:[{role:'user',content}],locale});

test('jets, tables, tickets and flights are sent to the section contract, not to consult',()=>{
  assert.match(CONVERSATION_PROTOCOL,/Consult has no options for a private jet, a restaurant or nightlife table, event tickets, or flights/);
  assert.match(CONVERSATION_PROTOCOL,/"sections":\["\/private-jets"\]/);
  assert.doesNotMatch(CONVERSATION_PROTOCOL,/wants a car, yacht, stay, jet, or outing/);
});

test('a private jet recommendation is a concierge answer, not a fallback',()=>{
  const result=recommend('/private-jets','Private jet to New York for 6 people');
  assert.ok(result);
  assert.match(result.reply,/charter desk/);
  assert.equal(result.navigation.cards[0].href,'/private-jets');
});

test('a dining recommendation links the dining section',()=>{
  const result=recommend('/restaurants-nightlife','Table for a birthday dinner for 10');
  assert.ok(result);
  assert.equal(result.navigation.cards[0].href,'/restaurants-nightlife');
});

test('flights do not get the hotel line, hotels in any language still do',()=>{
  for(const [locale,question] of [['es','Vuelos baratos a Miami'],['en','Cheap flights to Miami'],['ru','Нужен перелёт в Майами']]){
    const result=recommend('/travel',question,locale);
    assert.ok(result,question);
    assert.ok(!result.reply.includes(adviceCopy[locale].hotel),question);
    assert.equal(result.navigation.cards[0].href,'/travel');
  }
  for(const [locale,question] of [['en','Find me a hotel near South Beach'],['ru','Найди отель в Майами'],['es','Busco un hotel en Miami'],['ja','マイアミのホテルを探して']]){
    const result=recommend('/travel',question,locale);
    assert.ok(result.reply.includes(adviceCopy[locale].hotel),question);
  }
});
