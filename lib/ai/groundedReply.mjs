// Provider output selects canonical IDs. Only authored catalogue copy reaches UI.
import {SECTIONS,navigationForSections} from '../aiSuggestions.js';
import {conversationNavigation} from './conversation.mjs';
import {normalizeLocale} from './locale.js';
import {projectConversation} from './conciergeReply.mjs';
import {answerForNavigation,bookingAnswer,explicitBooking} from './catalogueAnswer.mjs';

export const RESPONSE_POLICY='catalogue-v1';
const allowed=new Set(SECTIONS.map(s=>s.href));

const latestUser=messages=>messages.filter(m=>m?.role==='user'&&typeof m.content==='string').at(-1)?.content||'';

// The validated selection before the booking rule: what the model chose, or
// what the keyword matcher put in its place. null when the reply is invalid.
function select(plan,messages,code){
 const explicit=conversationNavigation(messages,{locale:code});
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
export function groundedReply(raw,{messages,locale='en'}) {
 if(typeof raw!=='string'||raw.length>12000||!Array.isArray(messages))return null;
 let text=raw.replace(/<think>[\s\S]*?<\/think>/gi,'').trim();
 text=text.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1');
 let plan;try{plan=JSON.parse(text);}catch{return null;}
 if(!plan||Array.isArray(plan)||typeof plan!=='object')return null;
 const code=normalizeLocale(locale);
 const result=select(plan,messages,code);
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
