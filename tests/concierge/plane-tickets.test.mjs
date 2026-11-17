import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';

const {matchActionCards}=load('lib/aiSuggestions.js');

test('plane tickets go to Travel, not Events, in every supported language',()=>{
  const questions={
    en:'Cheap plane tickets to New York',ru:'Нужны билеты на самолёт в Нью-Йорк',uk:'Потрібні квитки на літак до Нью-Йорка',
    es:'Billetes de avión a Nueva York',pt:'Passagens aéreas para Nova York',de:'Flugtickets nach New York',
    fr:'Billets d’avion pour New York',it:'Biglietti aerei per New York',pl:'Bilety lotnicze do Nowego Jorku',
    tr:'New York uçak bileti',he:'כרטיסי טיסה לניו יורק',ar:'تذاكر طيران إلى نيويورك',fa:'بلیط هواپیما به نیویورک',
    zh:'去纽约的机票',ja:'ニューヨーク行きの航空券',ko:'뉴욕행 항공권',
  };
  for(const [locale,question] of Object.entries(questions)){
    const cards=matchActionCards(question,{locale,limit:3}).map(card=>card.href);
    assert.equal(cards[0],'/travel',locale+': '+cards.join(','));
    assert.ok(!cards.includes('/events'),locale+': '+cards.join(','));
  }
  assert.equal(matchActionCards('авиабилеты в Майами',{locale:'ru'})[0].href,'/travel');
});

test('event tickets still go to Events',()=>{
  for(const [locale,question] of [['en','Tickets for the Miami Heat game'],['ru','Хочу билеты на матч Майами Хит'],['ru','Билеты на концерт'],['es','Entradas para un concierto']]){
    assert.equal(matchActionCards(question,{locale})[0].href,'/events',question);
  }
});
