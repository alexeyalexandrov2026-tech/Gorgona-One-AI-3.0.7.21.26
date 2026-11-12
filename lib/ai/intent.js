// Listing search and section navigation share one multilingual intent registry.
import {getEcosystemIndex} from './ecosystemIndex';
import {matchActionCards} from '../aiSuggestions';
const STOP=new Set(['the','a','an','and','or','for','me','i','need','want','find','show','get','to','in','of','my','with','best','under','near','please','can','you','looking','some','any','is','are','at','on','this','that','from']);
const norm=value=>String(value??'').normalize('NFKC').toLowerCase();
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const worlds={'/yachts':'drive','/rentals':'drive','/private-jets':'travel','/travel':'travel','/vacation-rentals':'travel','/restaurants-nightlife':'taste','/experiences':'play','/events':'play'};
const belongs=(href,root)=>href===root||href.startsWith(root+'/');
export function searchEcosystem(query,{limit=6,locale='en'}={}){
 const q=norm(query).trim(),tokens=q.split(/[^\p{L}\p{N}$]+/gu).filter(token=>token&&!STOP.has(token));
 if(!q)return {results:[],world:null,tokens:[]};
 const sections=matchActionCards(q,{limit:4,locale});
 const capacity=q.match(/(?:\b(\d{1,3})\s*(?:people|guests?|pax|persons?)\b|(\d{1,3})\s*(?:человек|гостей|гостя|гості|אורחים))/u);
 const requested=capacity?Number(capacity[1]||capacity[2]):null;
 const scored=[];
 for(const entity of getEcosystemIndex()){
  const section=sections.findIndex(item=>belongs(entity.href,item.href));
  const named=!['Destination','World','Category'].includes(entity.type)&&[entity.title,...(entity.aliases||[])].some(value=>{const name=norm(value);return name.length>=3&&new RegExp('(?<![\\p{L}\\p{N}])'+escape(name)+'(?![\\p{L}\\p{N}])','u').test(q);});
  // A known listing outranks generic geography such as "Miami". Location
  // keywords must never exclude Komodo Miami or a named yacht model.
  if(sections.length&&section<0&&!named)continue;
  if(requested&&entity.capacity&&entity.capacity<requested)continue;
  const title=norm(entity.title),text=norm(entity.text);let score=0;
  for(const token of tokens){const pattern=/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(token)?new RegExp(escape(token),'u'):new RegExp('(?<![\\p{L}\\p{N}])'+escape(token)+'(?![\\p{L}\\p{N}])','u');if(pattern.test(text))score+=2;if(pattern.test(title))score+=4;}
  if(!score)continue;
  if(named)score+=20;
  if(entity.type!=='Destination'&&entity.type!=='World')score+=0.5;
  scored.push({entity,score,section,named});
 }
 scored.sort((a,b)=>Number(b.named)-Number(a.named)||a.section-b.section||b.score-a.score);
 const size=Number.isInteger(limit)&&limit>0?Math.min(limit,12):6;
 const seen=new Set();
 const ranked=scored.filter(item=>{if(seen.has(item.entity.href))return false;seen.add(item.entity.href);return true;}).map(item=>item.entity),results=[];
 // Keep a named match ahead of generic geography, then reserve one result
 // for each requested section before filling the remaining listing slots.
 if(scored[0]?.named)results.push(scored[0].entity);
 for(const section of sections){
  if(results.length>=size)break;
  if(results.some(item=>belongs(item.href,section.href)))continue;
  const entity=ranked.find(item=>belongs(item.href,section.href));
  // An honest category fallback never invents inventory or availability.
  results.push(entity||{id:'intent-'+section.href,type:'Destination',world:worlds[section.href]||'concierge',title:section.title,href:section.href,subtitle:null,capacity:null,text:section.label});
 }
 for(const entity of ranked){if(results.length>=size)break;if(!results.some(item=>item.href===entity.href))results.push(entity);}
 return {results,world:results[0]?.world||null,tokens};
}
