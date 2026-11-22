// Provider output selects canonical IDs or a Fact-Guarded version 3 reply.
import {SECTIONS,navigationForSections} from '../aiSuggestions.js';
import {conversationNavigation} from './conversation.mjs';
import {normalizeLocale} from './locale.js';
import {CONVERSATION_POLICY,STOP_IDS,projectConversation} from './conciergeReply.mjs';
import {answerForNavigation,bookingAnswer,explicitBooking} from './catalogueAnswer.mjs';
import {validateGroundedReplyText} from './factGuard.mjs';
import {collectAllowedPrices} from './factPack.mjs';

export const RESPONSE_POLICY='catalogue-v1';
const allowed=new Set(SECTIONS.map(s=>s.href));
const allowedStops=new Set(STOP_IDS);
const V3_ACTIONS=new Set(['consult','plan','ideas','recommend','guide']);

const latestUser=messages=>messages.filter(m=>m?.role==='user'&&typeof m.content==='string').at(-1)?.content||'';

function selectV3(plan,messages,code,explicit,allowedPrices){
 const keys=Object.keys(plan).sort().join(',');
 if(keys!=='action,reply,sections,version'&&keys!=='action,reply,sections,stops,version')return null;
 if(!V3_ACTIONS.has(plan.action)||typeof plan.reply!=='string')return null;
 if(!Array.isArray(plan.sections)||plan.sections.length>3||new Set(plan.sections).size!==plan.sections.length||plan.sections.some(id=>typeof id!=='string'||!allowed.has(id)))return null;
 let stops=[];
 if(plan.stops!==undefined){
  if(!Array.isArray(plan.stops)||plan.stops.some(id=>typeof id!=='string'))return null;
  stops=[...new Set(plan.stops.filter(id=>allowedStops.has(id)))].slice(0,6);
 }
 const effectiveAllowed=allowedPrices instanceof Set?allowedPrices:collectAllowedPrices([],messages);
 const verdict=validateGroundedReplyText(plan.reply,{locale:code,allowedPrices:effectiveAllowed});
 if(!verdict.ok)return null;

 const explicitHrefs=explicit.cards.map(c=>c.href);
 let finalSections=[...plan.sections];
 if(plan.action!=='guide'||finalSections.length>0){
  if(explicitHrefs.includes('/private-jets')&&!finalSections.includes('/private-jets')){
   finalSections=['/private-jets',...finalSections].slice(0,3);
  }
  for(const href of explicitHrefs){
   if(!finalSections.includes(href)&&finalSections.length<3)finalSections.push(href);
  }
  if((plan.action==='plan'||plan.action==='ideas')&&stops.length&&!finalSections.includes('/experiences')&&finalSections.length<3){
   finalSections.push('/experiences');
  }
 }
 const navigation=finalSections.length
  ?{query:explicit.query,...navigationForSections(finalSections,{locale:code})}
  :{query:explicit.query,cards:[],suggestions:[]};
 return {
  reply:verdict.text,
  navigation,
  responsePolicy:CONVERSATION_POLICY,
  action:plan.action,
  decidedBy:'model',
  ...(stops.length?{stops}:{})
 };
}

// The validated selection before the booking rule: what the model chose, or
// what the keyword matcher put in its place. null when the reply is invalid.
function select(plan,messages,code,allowedPrices){
 const explicit=conversationNavigation(messages,{locale:code});
 if(plan.version===3)return selectV3(plan,messages,code,explicit,allowedPrices);
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
export function groundedReply(raw,{messages,locale='en',allowedPrices=null}) {
 if(typeof raw!=='string'||raw.length>12000||!Array.isArray(messages))return null;
 let text=raw.replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
 text=text.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1');
 let plan;try{plan=JSON.parse(text);}catch{return null;}
 if(!plan||Array.isArray(plan)||typeof plan!=='object')return null;
 const code=normalizeLocale(locale);
 const result=select(plan,messages,code,allowedPrices);
 if(!result)return null;
 // Hard rule, in code rather than in the prompt: a booking or payment request,
 // or a model handoff, always gets the disclaimer. No advice copy replaces it.
 if(result.action==='handoff'||explicitBooking(latestUser(messages))){
  // decidedBy: the model when it handed off itself, the keyword rule otherwise.
  return {...result,reply:bookingAnswer(result.navigation,code),action:'handoff',handoff:true,
   decidedBy:result.action==='handoff'?result.decidedBy:'lexicon'};
 }
 return result;
}
