import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const {groundedReply}=load('lib/ai/groundedReply.mjs');
const {CONVERSATION_PROTOCOL}=load('lib/ai/conciergeReply.mjs');
const {adviceCopy}=load('lib/ai/conciergeAdvice.mjs');
const {matchActionCards}=load('lib/aiSuggestions.js');
const {catalogueAnswer}=load('lib/ai/catalogueAnswer.mjs');

const recommend=(section,content,locale='en')=>groundedReply(JSON.stringify({version:1,action:'recommend',sections:[section]}),{messages:[{role:'user',content}],locale});

test('private jets stay on the section contract, not consult',()=>{
  assert.match(CONVERSATION_PROTOCOL,/Consult has no options for a private jet/);
  assert.match(CONVERSATION_PROTOCOL,/"sections":\["\/private-jets"\]/);
  assert.doesNotMatch(CONVERSATION_PROTOCOL,/wants a car, yacht, stay, jet, or outing/);
});

test('a private jet recommendation is a concierge answer, not a fallback',()=>{
  const result=recommend('/private-jets','Private jet to New York for 6 people');
  assert.ok(result);
  assert.match(result.reply,/charter quote from PrivateJetFinder/);
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

function conversation(plan, userTurns, locale='en') {
  return groundedReply(JSON.stringify({version:2,...plan}),{
    messages:userTurns.map(content=>({role:'user',content})),locale
  });
}

test('Jet and Cyrillic inflections stay in Private Jets even after a wrong model selection',()=>{
  const mistaken={action:'consult',options:['hotel'],question:'dates'};
  for(const [locale, turns] of [
    ['en',['Jet']],
    ['ru',['Нужно найти Jet из Майами']],
    ['ru',['Нужны билеты на самолёт','А теперь найди джет']],
    ['ru',['Нужен джет','На 6 пассажиров завтра']],
    ['ru',['Покажите варианты для джета на пятницу']],
  ]){
    const result=conversation(mistaken,turns,locale);
    assert.deepEqual(result.navigation.cards.map(card=>card.href),['/private-jets'],turns.join(' → '));
    assert.equal(result.reply.split('\n').length,1);
    assert.match(result.reply,/PrivateJetFinder/);
    assert.doesNotMatch(result.reply,/Hotel|отель|чартерный стол|Сколько вас|What dates/i);
  }
});

test('private charter matching excludes jet skis, Jets games, airline names and a jet-lag question',()=>{
  for(const text of ['Jet ski near Miami','I want to rent a jet-ski','New York Jets tickets',
    'JetBlue flight to New York','Any advice for jet lag?','Аренда гидроцикла в Майами']){
    assert.ok(!matchActionCards(text).some(card=>card.href==='/private-jets'),text);
  }
  assert.equal(matchActionCards('Jet ski near Miami')[0].href,'/experiences');
  assert.equal(matchActionCards('New York Jets tickets')[0].href,'/events');
});

test('car advice drops assumed family and travel styles, including with no model',()=>{
  const ungrounded={action:'consult',options:['family-suv','convertible'],question:'luggage'};
  const reply=conversation(ungrounded,['Подбери машину в Майами'],'ru');
  assert.deepEqual(reply.navigation.cards.map(card=>card.href),['/rentals']);
  assert.equal(reply.reply,'На какие даты вы планируете поездку?');
  assert.doesNotMatch(catalogueAnswer([{role:'user',content:'Подбери машину в Майами'}],'ru').reply,/дет|внедорожник|кабриолет/i);
  const specific=conversation(ungrounded,["I'd like an SUV for six passengers on Friday"]);
  assert.match(specific.reply,/SUV/);
  assert.doesNotMatch(specific.reply,/children|convertible|How many|What dates/i);
});

test('consultation skips a repeated date or duration after the guest supplied it',()=>{
  const tests=[
    ['Rent me a yacht for Friday', 'dates', /What dates/],
    ['Yacht on the bay for two hours', 'time-on-water', /How much time/],
    ['A yacht for 6 passengers', 'group', /How many people/],
  ];
  for(const [message, question, repeated] of tests){
    const result=conversation({action:'consult',options:['bay-cruise'],question},[message]);
    assert.equal(result.navigation.cards[0].href,'/yachts');
    assert.doesNotMatch(result.reply,repeated,message);
  }
});
