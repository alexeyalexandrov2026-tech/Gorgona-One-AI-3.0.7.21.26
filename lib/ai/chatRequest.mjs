// Shared request contract: byte-budget the client envelope and validate it
// before any server intent matching or provider traffic. No credentials here.
import {SUPPORTED_LANGUAGES} from '../languages.js';
import {unavailableReply} from './locale.js';
import {conciergeCopy} from './conciergeCopy.mjs';
export const CHAT_CONTENT_LIMIT=4000;
const maxBytes=32768,maxMessages=40,maxContent=CHAT_CONTENT_LIMIT;
const locales=new Set(SUPPORTED_LANGUAGES.map(language=>language.code));
// Lines the site writes when no engine answered, in every language. A turn
// carrying one is not something the concierge said and must not reach a model
// as its own earlier reply (the client may be stale, or the line forged).
const squash=text=>text.replace(/\s+/g,' ').trim();
const CANNED=[...new Set(SUPPORTED_LANGUAGES.flatMap(({code})=>[unavailableReply(code),conciergeCopy[code]?.weatherDown]).filter(Boolean).map(squash))];
export function isCannedReply(content){
 const text=squash(String(content||''));
 return CANNED.some(line=>text.includes(line));
}
export function chatPayload(messages,{locale,sessionId}={}){
 // Offline answers stay on screen but never go back upstream as history, and
 // only role and content leave the browser.
 const turns=messages.filter(m=>m?.degraded!==true).slice(-12).map(m=>({role:m.role,content:m.content})),payload={messages:turns,locale,...(sessionId?{sessionId}:{})};
 while(turns.length>1&&new TextEncoder().encode(JSON.stringify(payload)).byteLength>maxBytes)turns.shift();
 return payload;
}
export class ChatInputError extends Error{constructor(status=400){super(status===413?'Request too large.':'Invalid chat request.');this.status=status;}}
export function validateChatTransport(request){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new ChatInputError(415);
 const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
 if(origin&&origin!==new URL(request.url).origin||site&&!['same-origin','none'].includes(site.toLowerCase()))throw new ChatInputError(403);
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
 // Strip canned offline lines from history; the request still ends on the
 // guest's own words, so it stays valid.
 const history=messages.filter(message=>message.role==='user'||!isCannedReply(message.content));
 return {messages:history.slice(-12),sessionId:body.sessionId,locale:body.locale};
}
