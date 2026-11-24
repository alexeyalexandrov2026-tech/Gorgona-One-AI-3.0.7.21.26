// Shared request contract: byte-budget the client envelope and validate it
// before any server intent matching or provider traffic. No credentials here.
import {SUPPORTED_LANGUAGES} from '../languages.js';
import {unavailableReply,weatherDownReply} from './locale.js';
export const CHAT_CONTENT_LIMIT=4000;
export function normalizePagePath(raw){
 if(typeof raw!=='string')return '';
 const clean=raw.split(/[?#]/)[0].trim();
 if(!clean||clean.length>160||!/^\/[a-zA-Z0-9/_-]*$/.test(clean)||clean.includes('..')||clean.includes('//'))return '';
 return clean.length>1&&clean.endsWith('/')?clean.slice(0,-1):clean;
}
const maxBytes=32768,maxMessages=40,maxContent=CHAT_CONTENT_LIMIT;
const locales=new Set(SUPPORTED_LANGUAGES.map(language=>language.code));
// Lines the site writes when no engine answered, in every language. A turn
// carrying one is not something the concierge said and must not reach a model
// as its own earlier reply (the client may be stale, or the line forged).
const squash=text=>text.replace(/\s+/g,' ').trim();
const LEGACY_CANNED = ['The concierge is temporarily unavailable. Please try again shortly.'];
const CANNED=[...new Set([...LEGACY_CANNED,...SUPPORTED_LANGUAGES.flatMap(({code})=>[unavailableReply(code),weatherDownReply(code)])].filter(Boolean).map(squash))];
export function isCannedReply(content){
 const text=squash(String(content||''));
 return CANNED.some(line=>text.includes(line));
}
const ALLOWED_PREF_CUISINES=new Set(['no-seafood','halal','kosher','vegan','sushi','steakhouse','italian','seafood','mediterranean']);
export function sanitizeSavedPrefs(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const out={};
 if(typeof raw.neighborhood==='string'&&raw.neighborhood.length>=3&&raw.neighborhood.length<=40&&/^[A-Za-z /&-]+$/.test(raw.neighborhood))out.neighborhood=raw.neighborhood.trim();
 if(Number.isInteger(raw.maxDailyBudget)&&raw.maxDailyBudget>=50&&raw.maxDailyBudget<=50000)out.maxDailyBudget=raw.maxDailyBudget;
 if(raw.airport==='MIA'||raw.airport==='FLL')out.airport=raw.airport;
 if(Array.isArray(raw.dietaryOrCuisine)){
  const list=[...new Set(raw.dietaryOrCuisine.filter(t=>typeof t==='string'&&ALLOWED_PREF_CUISINES.has(t)))].slice(0,3);
  if(list.length)out.dietaryOrCuisine=list;
 }
 return Object.keys(out).length?out:null;
}
export function chatPayload(messages,{locale,sessionId,pagePath,savedPrefs}={}){
 // Offline answers stay on screen but never go back upstream as history, and
 // only role and content leave the browser.
 const safePath=normalizePagePath(pagePath);
 const safePrefs=sanitizeSavedPrefs(savedPrefs);
 const turns=messages.filter(m=>m?.degraded!==true).slice(-12).map(m=>({role:m.role,content:m.content})),payload={messages:turns,locale,...(sessionId?{sessionId}:{}),...(safePath?{pagePath:safePath}:{}),...(safePrefs?{savedPrefs:safePrefs}:{})};
 while(turns.length>1&&new TextEncoder().encode(JSON.stringify(payload)).byteLength>maxBytes)turns.shift();
 return payload;
}
export class ChatInputError extends Error{constructor(status=400){super(status===413?'Request too large.':'Invalid chat request.');this.status=status;}}
export function validateChatTransport(request){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new ChatInputError(415);
 const rawOrigin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
 if(site&&!['same-origin','none'].includes(site.toLowerCase()))throw new ChatInputError(403);
 if(rawOrigin){
  let parsedOrigin;
  try{parsedOrigin=new URL(rawOrigin).origin;}catch{throw new ChatInputError(403);}
  const reqUrl=new URL(request.url);
  const hostHeader=request.headers.get('host');
  const hostOrigin=hostHeader?`${reqUrl.protocol}//${hostHeader}`:null;
  if(parsedOrigin!==reqUrl.origin&&parsedOrigin!==hostOrigin)throw new ChatInputError(403);
 }
}
export async function readChatRequest(request){
 const declared=request.headers.get('content-length');
 if(declared&&Number(declared)>maxBytes){await request.body?.cancel().catch(()=>{});throw new ChatInputError(413);}
 if(!request.body)throw new ChatInputError();
 const reader=request.body.getReader(),chunks=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel().catch(()=>{});throw new ChatInputError(413);}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new ChatInputError();}
 if(!body||typeof body!=='object'||Array.isArray(body)||!Array.isArray(body.messages)||!body.messages.length||body.messages.length>maxMessages)throw new ChatInputError();
 if(body.locale!==undefined&&(typeof body.locale!=='string'||!/^[a-z]{2}(?:-[a-z0-9]{2,8})?$/i.test(body.locale)||!locales.has(body.locale.slice(0,2).toLowerCase())))throw new ChatInputError();
 const messages=body.messages.map(message=>{
  if(!message||typeof message!=='object'||!['user','assistant'].includes(message.role)||typeof message.content!=='string'||!message.content.trim()||message.content.length>maxContent)throw new ChatInputError();
  return {role:message.role,content:message.content.trim()};
 });
 if(messages.at(-1).role!=='user')throw new ChatInputError();
 if(body.sessionId!==undefined&&(typeof body.sessionId!=='string'||!body.sessionId||body.sessionId.length>120||/[\u0000-\u001f\u007f]/.test(body.sessionId)))throw new ChatInputError();
 const pagePath=body.pagePath!==undefined?normalizePagePath(body.pagePath):'';
 const savedPrefs=body.savedPrefs!==undefined?sanitizeSavedPrefs(body.savedPrefs):null;
 // Strip canned offline lines from history; the request still ends on the
 // guest's own words, so it stays valid.
 const history=messages.filter(message=>message.role==='user'||!isCannedReply(message.content));
 return {messages:history.slice(-12),sessionId:body.sessionId,locale:body.locale,...(pagePath?{pagePath}:{}),...(savedPrefs?{savedPrefs}:{})};
}
