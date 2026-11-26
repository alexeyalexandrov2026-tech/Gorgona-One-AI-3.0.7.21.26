// Provider output selects canonical IDs or a Fact-Guarded version 3 reply.
import {SECTIONS,navigationForSections} from '../aiSuggestions.js';
import {conversationNavigation} from './conversation.mjs';
import {normalizeLocale} from './locale.js';
import {CONVERSATION_POLICY,STOP_IDS,projectConversation} from './conciergeReply.mjs';
import {answerForNavigation,bookingAnswer,bookingDisclaimer,explicitBooking} from './catalogueAnswer.mjs';
import {validateGroundedReplyText} from './factGuard.mjs';
import {collectAllowedPrices} from './factPack.mjs';

export const RESPONSE_POLICY='catalogue-v1';
const allowed=new Set(SECTIONS.map(s=>s.href));
const allowedStops=new Set(STOP_IDS);
const V3_ACTIONS=new Set(['consult','plan','ideas','recommend','guide']);
const V3_ALLOWED_KEYS=new Set(['version','action','sections','reply','stops','followups','tripPatch','handoffSummary']);
const V3_OCCASIONS=new Set(['proposal','anniversary','birthday','family-kids','business','party','romantic']);
const META_DELIMITER='<<<ELIO_META>>>';

const latestUser=messages=>messages.filter(m=>m?.role==='user'&&typeof m.content==='string').at(-1)?.content||'';

function sanitizeFollowups(raw){
 if(!Array.isArray(raw))return [];
 const out=[];
 for(const item of raw){
  if(typeof item!=='string')continue;
  const clean=item.replace(/[*#_`~]+/g,'').replace(/\s+/g,' ').trim();
  if(clean.length<3||clean.length>76)continue;
  if(/https?:\/\/|www\.|@[a-z0-9_]{3,}|\+\d[\d\s()-]{6,}\d/i.test(clean))continue;
  if(!out.includes(clean))out.push(clean);
  if(out.length>=3)break;
 }
 return out;
}

function sanitizeTripPatch(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const out={};
 if(typeof raw.neighborhood==='string'&&raw.neighborhood.trim().length>=3&&raw.neighborhood.trim().length<=40&&/^[A-Za-z /&-]+$/.test(raw.neighborhood.trim())){
  out.neighborhood=raw.neighborhood.trim();
 }
 if(Number.isInteger(raw.guests)&&raw.guests>=1&&raw.guests<=99)out.guests=raw.guests;
 if(Number.isInteger(raw.maxDailyBudget)&&raw.maxDailyBudget>=50&&raw.maxDailyBudget<=50000)out.maxDailyBudget=raw.maxDailyBudget;
 if(typeof raw.occasion==='string'&&V3_OCCASIONS.has(raw.occasion))out.occasion=raw.occasion;
 if(raw.airport==='MIA'||raw.airport==='FLL')out.airport=raw.airport;
 if(typeof raw.hasKids==='boolean')out.hasKids=raw.hasKids;
 return Object.keys(out).length?out:null;
}

function sanitizeHandoffSummary(raw){
 if(typeof raw!=='string')return '';
 const clean=raw.replace(/[*#_`~]+/g,'').replace(/\s+/g,' ').trim().slice(0,260);
 if(!clean||/https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{8,}\d/i.test(clean))return '';
 return clean;
}

function parseEnvelope(raw){
 let text=raw.replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
 text=text.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1').trim();
 const delimIdx=text.indexOf(META_DELIMITER);
 if(delimIdx!==-1){
  const replyPart=text.slice(0,delimIdx).trim();
  const metaPart=text.slice(delimIdx+META_DELIMITER.length).trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1').trim();
  let meta;try{meta=JSON.parse(metaPart);}catch{return null;}
  if(!meta||Array.isArray(meta)||typeof meta!=='object')return null;
  return {version:3,...meta,reply:typeof meta.reply==='string'&&meta.reply.trim()?meta.reply:replyPart};
 }
 let plan;try{plan=JSON.parse(text);}catch{return null;}
 return plan&&!Array.isArray(plan)&&typeof plan==='object'?plan:null;
}

function selectV3(plan,messages,code,explicit,allowedPrices,replyLocale){
 const keys=Object.keys(plan);
 if(!keys.includes('version')||!keys.includes('action')||!keys.includes('sections')||!keys.includes('reply'))return null;
 if(keys.some(k=>!V3_ALLOWED_KEYS.has(k)))return null;
 if(!V3_ACTIONS.has(plan.action)||typeof plan.reply!=='string')return null;
 if(!Array.isArray(plan.sections)||plan.sections.length>4||new Set(plan.sections).size!==plan.sections.length||plan.sections.some(id=>typeof id!=='string'||!allowed.has(id)))return null;
 let stops=[];
 if(plan.stops!==undefined){
  if(!Array.isArray(plan.stops)||plan.stops.some(id=>typeof id!=='string'))return null;
  stops=[...new Set(plan.stops.filter(id=>allowedStops.has(id)))].slice(0,6);
 }
 const followups=plan.followups!==undefined?sanitizeFollowups(plan.followups):[];
 const tripPatch=plan.tripPatch!==undefined?sanitizeTripPatch(plan.tripPatch):null;
 const handoffSummary=plan.handoffSummary!==undefined?sanitizeHandoffSummary(plan.handoffSummary):'';
 const effectiveAllowed=allowedPrices instanceof Set?allowedPrices:collectAllowedPrices([],messages);
 const verdict=validateGroundedReplyText(plan.reply,{locale:replyLocale||code,allowedPrices:effectiveAllowed});
 if(!verdict.ok)return null;

 const explicitHrefs=explicit.cards.map(c=>c.href);
 let finalSections=[...plan.sections];
 if(plan.action!=='guide'||finalSections.length>0){
  if(explicitHrefs.includes('/private-jets')&&!finalSections.includes('/private-jets')){
   finalSections=['/private-jets',...finalSections].slice(0,4);
  }
  for(const href of explicitHrefs){
   if(!finalSections.includes(href)&&finalSections.length<4)finalSections.push(href);
  }
  if((plan.action==='plan'||plan.action==='ideas')&&stops.length&&!finalSections.includes('/experiences')&&finalSections.length<4){
   finalSections.push('/experiences');
  }
 }
 const navigation=finalSections.length
  ?{query:explicit.query,...navigationForSections(finalSections,{locale:code})}
  :{query:explicit.query,cards:[],suggestions:[]};
 return {
  reply:verdict.text,
  navigation,
  sections:finalSections,
  responsePolicy:CONVERSATION_POLICY,
  action:plan.action,
  decidedBy:'model',
  version:3,
  ...(stops.length?{stops}:{}),
  ...(followups.length?{followups}:{}),
  ...(tripPatch?{tripPatch}:{}),
  ...(handoffSummary?{handoffSummary}:{})
 };
}

// The validated selection before the booking rule: what the model chose, or
// what the keyword matcher put in its place. null when the reply is invalid.
function select(plan,messages,code,allowedPrices,replyLocale){
 const explicit=conversationNavigation(messages,{locale:code});
 if(plan.version===3)return selectV3(plan,messages,code,explicit,allowedPrices,replyLocale);
 if(plan.version===2){
  const sessionText=messages.filter(m=>m?.role==='user'&&typeof m.content==='string').map(m=>m.content).join(' ');
  const projected=projectConversation(plan,code,explicit.query,sessionText);
  if(!projected)return null;
  const requested=explicit.cards.map(card=>card.href);
  const selected=projected.navigation.cards.map(card=>card.href);
  const route=requested[0];
  const yachtRequested=requested.includes('/yachts');
  const missingRoute=requested.some(href=>!selected.includes(href));
  const conflictingConsult=plan.action==='consult'&&route==='/rentals'&&selected[0]!==route;
  const narrowedConsult=plan.action==='consult'&&missingRoute&&(requested.length>1||yachtRequested);
  if(route==='/private-jets'||conflictingConsult||narrowedConsult){
   return {...projected,reply:answerForNavigation(explicit,messages,code),navigation:explicit,action:'recommend',decidedBy:'lexicon'};
  }
  // The widget is useful even when the concierge asks for more detail.
  if(yachtRequested&&missingRoute){
   const navigation=navigationForSections([...requested,...selected],{locale:code});
   return {...projected,navigation:{query:explicit.query,...navigation},action:plan.action,decidedBy:'lexicon'};
  }
  return {...projected,action:plan.action,decidedBy:'model'};
 }
 if(Object.keys(plan).sort().join(',')!=='action,sections,version'||plan.version!==1||!['recommend','clarify','handoff','unsupported'].includes(plan.action)||!Array.isArray(plan.sections)||plan.sections.length>3||new Set(plan.sections).size!==plan.sections.length||plan.sections.some(id=>typeof id!=='string'||!allowed.has(id))||(plan.action==='recommend'&&!plan.sections.length)||(plan.action==='unsupported'&&plan.sections.length))return null;
 const navigation=explicit.cards.length?explicit:navigationForSections(plan.sections,{locale:code});
 const reply=answerForNavigation(navigation,messages,code);
 // Keyword sections replace the model's choice, so the turn is a recommendation.
 // The model decided only when it chose the same thing or handed off.
 const keywords=explicit.cards.map(card=>card.href);
 const agreed=plan.action==='handoff'||(plan.action==='recommend'&&keywords.length===plan.sections.length&&keywords.every(href=>plan.sections.includes(href)));
 return {reply,navigation,responsePolicy:RESPONSE_POLICY,
  action:keywords.length&&plan.action!=='handoff'?'recommend':plan.action,
  decidedBy:keywords.length&&!agreed?'lexicon':'model'};
}

/**
 * @returns {{reply:string,navigation:{cards:object[],suggestions:object[]},responsePolicy:string,action:string,handoff?:true}|null}
 */
export function groundedReply(raw,{messages,locale='en',allowedPrices=null,replyLocale=null}) {
 if(typeof raw!=='string'||raw.length>12000||!Array.isArray(messages))return null;
 const plan=parseEnvelope(raw);
 if(!plan)return null;
 const code=normalizeLocale(locale);
 const result=select(plan,messages,code,allowedPrices,replyLocale);
 if(!result)return null;
 // Hard rule, in code rather than in the prompt: a booking or payment request,
 // or a model handoff, always gets the disclaimer first. For v3 replies we
 // preserve the Fact-Guarded answer below the disclaimer so ELIO stays helpful
 // instead of discarding context on conversion-ready turns.
 if(result.action==='handoff'||explicitBooking(latestUser(messages))){
  const effectiveLocale=replyLocale||code;
  const replyText=result.version===3&&result.action!=='handoff'&&result.reply
   ?bookingDisclaimer(effectiveLocale)+'\n\n'+result.reply
   :bookingAnswer(result.navigation,code);
  // decidedBy: the model when it handed off itself, the keyword rule otherwise.
  return {...result,reply:replyText,action:'handoff',handoff:true,
   decidedBy:result.action==='handoff'?result.decidedBy:'lexicon'};
 }
 return result;
}
