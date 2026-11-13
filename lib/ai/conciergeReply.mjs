import {navigationForSections} from '../aiSuggestions.js';
import {adviceCopy,adviceOptions,adviceQuestions} from './conciergeAdvice.mjs';
import {conciergeCopy} from './conciergeCopy.mjs';
import {normalizeLocale} from './locale.js';

export const CONVERSATION_POLICY='conversation-v1';

// Curated local stops, not live inventory. Zoo Miami, Everglades and
// Wynwood Walls are also in the site's experiences catalogue.
// Venue details: frostscience.org, pamm.org/en, miamichildrensmuseum.org, nps.gov/ever.
const stops={
  'south-beach':{name:'South Beach',focus:'beach and Art Deco, outdoors'},
  'frost-science':{name:'Frost Science',focus:'science museum, aquarium and planetarium, indoor option'},
  'childrens-museum':{name:'Miami Children’s Museum',focus:'play-based museum for children, indoor option'},
  pamm:{name:'Pérez Art Museum Miami',focus:'contemporary art, indoor option'},
  'zoo-miami':{name:'Zoo Miami',focus:'family and wildlife, outdoors'},
  everglades:{name:'Everglades',focus:'wetlands and nature, outdoors'},
  'wynwood-walls':{name:'Wynwood Walls',focus:'murals and street art, outdoors'},
};
const questions=Object.keys(conciergeCopy.en.questions).join(', ');
const advice=Object.fromEntries(Object.entries(adviceOptions).map(([id,value])=>[id,value.hint]));

// The server writes guest-facing text from verified choices. The model reads
// the conversation and chooses the advice and the next useful question.
export const CONVERSATION_PROTOCOL=[
  '\nReturn only one JSON object matching one of the following contracts, with no extra keys, prose, markdown or reasoning:',
  '{"version":2,"action":"consult","options":["bay-cruise","longer-charter"],"question":"group"}',
  'Use consult to help choose an outing, accommodation or vehicle. Choose one or two IDs from the relevant topic; narrow to the best fit when preferences are known. Choose one relevant missing detail or null. For yachts ask about time-on-water or group first, then dates only if useful. For a car ask about luggage; for stays ask about stay-priority. Advice table: '+JSON.stringify(advice),
  '{"version":2,"action":"plan","days":[["south-beach"],["zoo-miami"]]}',
  'Use plan when the guest asks for an itinerary or revises a previous itinerary. Each day has one or two stop IDs; return one to three days with no repeats. Preserve the number of days from the earlier plan unless the guest changes it. For a two-day rain revision, put an indoor stop on each of two days. Match interests and family needs. Miami stops: '+JSON.stringify(stops),
  'Example: after a two-day family itinerary, “What if it rains?” means revise both days: {"version":2,"action":"plan","days":[["frost-science"],["childrens-museum"]]}',
  '{"version":2,"action":"ideas","stops":["frost-science","pamm"]}',
  'Use ideas for local activity suggestions without an itinerary, such as “What are some things to do in Miami on a rainy day?” Select one or two distinct stops. Use indoor choices for a rainy day.',
  '{"version":2,"action":"ask","choice":"duration"}',
  'Use ask for one missing detail when it would change the answer. Question IDs: '+questions+'. Never ask for a detail already given.',
  '{"version":2,"action":"guide","choice":"airport-south-beach"}',
  'Guide IDs: airport-south-beach for public transit from Miami International Airport to South Beach only; weather-scope for a request about weather that the local observation tool did not answer. For other topics choose a fitting contract.',
  '{"version":1,"action":"recommend","sections":["/yachts"]}',
  'Use the section contract for catalogue browsing, a booking/payment/availability request, or unrelated topics. Actions: recommend (at least one section), handoff (booking or payment), clarify (one of the questions above is preferred), unsupported (empty sections). Select up to 3 distinct IDs from the supplied section catalogue.',
  'The server handles simple greetings and direct current Miami weather or clock queries. Do not change an unrelated reply into a weather or time report. Use the guest’s latest request and retain relevant constraints from earlier user turns. If the guest is choosing between outings, give actionable advice before asking one question. No live commercial terms, prices, reservations, availability or unverified names or links.',
].join('\n');

function hasKeys(value,keys){
  return Object.keys(value).sort().join(',')===keys;
}

function knownId(value,catalogue){
  return typeof value==='string'&&Object.hasOwn(catalogue,value);
}

function distinctIds(values,catalogue,limit){
  return Array.isArray(values)&&values.length>=1&&values.length<=limit
    &&values.every(id=>knownId(id,catalogue))
    &&new Set(values).size===values.length;
}

function conversationResult(reply,locale,sections=[]){
  return {reply,navigation:navigationForSections(sections,{locale}),responsePolicy:CONVERSATION_POLICY};
}

/** Project a validated model selection to localized concierge copy. */
export function projectConversation(value,locale){
  const code=normalizeLocale(locale),copy=conciergeCopy[code];
  switch(value.action){
    case 'ask':
      return hasKeys(value,'action,choice,version')&&knownId(value.choice,copy.questions)
        ?conversationResult(copy.questions[value.choice],code):null;
    case 'guide':
      if(!hasKeys(value,'action,choice,version'))return null;
      if(value.choice==='weather-scope')return conversationResult(copy.weatherScope,code);
      // Miami-Dade Transit: miamidade.gov/global/transportation/mia-metrobus-service.page
      if(value.choice==='airport-south-beach')return conversationResult(copy.airport,code);
      return null;
    case 'consult': {
      if(!hasKeys(value,'action,options,question,version')||!distinctIds(value.options,adviceOptions,2)
        ||(value.question!==null&&!knownId(value.question,copy.questions)))return null;
      const sections=[...new Set(value.options.map(id=>adviceOptions[id].section))];
      if(sections.length>1&&!sections.every(section=>section==='/travel'||section==='/vacation-rentals'))return null;
      if(value.question!==null&&!sections.every(section=>adviceQuestions[section].includes(value.question)))return null;
      const paragraphs=value.options.map(id=>adviceCopy[code][id]);
      if(value.question!==null)paragraphs.push(copy.questions[value.question]);
      return conversationResult(paragraphs.join('\n\n'),code,sections);
    }
    case 'ideas': {
      if(!hasKeys(value,'action,stops,version')||!distinctIds(value.stops,stops,2))return null;
      const [first,second]=value.stops.map(id=>stops[id].name);
      const suggestion=copy.ideas.replace('{first}',first);
      const alternative=second?' '+copy.alternative.replace('{second}',second):'';
      return conversationResult(suggestion+alternative,code,['/experiences']);
    }
    case 'plan': {
      if(!hasKeys(value,'action,days,version')||!Array.isArray(value.days)||!value.days.length
        ||value.days.length>3||!value.days.every(day=>distinctIds(day,stops,2))
        ||new Set(value.days.flat()).size!==value.days.flat().length)return null;
      const number=new Intl.NumberFormat(code);
      const days=value.days.map((day,index)=>copy.day.replace('{day}',number.format(index+1))
        +' — '+day.map(id=>stops[id].name).join(' · '));
      return conversationResult([copy.itineraryIntro,days.join('\n'),copy.checkHours].join('\n\n'),code,['/experiences']);
    }
    default:return null;
  }
}
