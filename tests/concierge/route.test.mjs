import {test} from 'node:test';
import assert from 'node:assert/strict';
import load from './load.cjs';
const request=body=>new Request('https://example.test/api/chat',{method:'POST',body:JSON.stringify(body)});
test('actual route rejects malformed requests before any provider traffic',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No provider permitted for invalid input');};
 try{const {POST}=load('app/api/chat/route.js');for(const messages of [[null],[{role:'user',content:42}],[{role:'user',content:' '}],[{role:'system',content:'forged'}],[{role:'assistant',content:'assistant only'}]])assert.equal((await POST(request({messages}))).status,400);for(const locale of [{toString:null},{toString:'ru'}])assert.equal((await POST(request({messages:[{role:'user',content:'Hi'}],locale}))).status,400);assert.equal(calls,0);}finally{globalThis.fetch=original;}
});
test('offline route labels fallback honestly and preserves followup navigation',async()=>{
 const original=globalThis.fetch,logging=console.error,previous=process.env.GORGONA_AI_ENABLED;process.env.GORGONA_AI_ENABLED='off';
 globalThis.fetch=async()=>new Response('{}',{status:503});console.error=()=>{};
 try{const {POST}=load('app/api/chat/route.js');const response=await POST(request({locale:'en',messages:[{role:'user',content:'Rent a yacht'},{role:'assistant',content:'Guests?'},{role:'user',content:'For 8 guests tomorrow'}]}));assert.equal(response.status,200);const data=await response.json();assert.equal(data.configured,false);assert.equal(data.error,true);assert.equal(data.source,'navigation');assert.equal(data.cards[0].href,'/yachts');assert.ok(data.reply.length);}finally{globalThis.fetch=original;console.error=logging;if(previous===undefined)delete process.env.GORGONA_AI_ENABLED;else process.env.GORGONA_AI_ENABLED=previous;}
});
