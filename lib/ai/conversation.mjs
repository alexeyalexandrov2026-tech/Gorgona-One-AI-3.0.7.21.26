import {matchActionCards,matchSuggestions} from '../aiSuggestions.js';
// Carry the last explicit topic only for a short date, party-size, budget or
// option follow-up. New explicit intent always wins; unrelated text does not.
const followup=/(?:^\s*\d{1,3}\s*$|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}:\d{2}\b|[$€£]|tomorrow|today|tonight|guests?|people|how much|price|budget|завтра|сегодня|человек|гост|сколько|стоим|цен|бюджет|на .*дн|mañana|personas|demain|personnes|morgen|gäste|domani|ospiti|amanhã|pessoas|jutro|osób|yarın|kişi|מחר|אורחים|غد|أشخاص|فردا|نفر|明天|人数|明日|人数|내일|명)/iu;
export function conversationNavigation(messages,{locale='en',reply=''}={}){
 const turns=messages.filter(m=>m?.role==='user'&&typeof m.content==='string'),latest=turns.at(-1)?.content||'';
 let query=latest;
 if(!matchActionCards(query).length&&query.length<=300&&followup.test(query)){
  for(let i=turns.length-2;i>=0;i--)if(matchActionCards(turns[i].content).length){query=turns[i].content+' '+latest;break;}
 }
 return {cards:matchActionCards(query,{locale,reply}),suggestions:matchSuggestions(query,{locale,reply})};
}
