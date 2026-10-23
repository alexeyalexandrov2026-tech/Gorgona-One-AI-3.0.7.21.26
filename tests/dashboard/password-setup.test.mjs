import test from 'node:test';
import assert from 'node:assert/strict';
import {setSessionPassword} from '../../lib/passwordSetup.mjs';
const input={password:'FixturePassword2026!',confirmPassword:'FixturePassword2026!'};
function client(){return {url:'https://placeholder.supabase.co',anonKey:'fixture-anon',auth:{
  getSession:async()=>({data:{session:{access_token:'token-a',user:{id:'a'}}}}),
  getUser:async token=>({data:{user:{id:token==='token-a'?'a':'b'}}})
}};}
test('invalid passwords fail before any session read or request',async()=>{
  const c=client();c.auth.getSession=()=>{throw Error('Unexpected session access');};
  for(const value of [{password:'',confirmPassword:''},{password:'short',confirmPassword:'short'},{...input,confirmPassword:'different'}])
    await assert.rejects(setSessionPassword(c,value,'a'),/fill out|6 characters|match/);
});
test('unverified or changed identity cannot submit a password',async()=>{
  const c=client(),never=()=>{throw Error('Unexpected mutation');};
  await assert.rejects(setSessionPassword(c,input,'b',never));
  c.auth.getUser=async()=>({data:{user:{id:'b'}}});
  await assert.rejects(setSessionPassword(c,input,'a',never));
});
test('account switch between verification and write cannot retarget the credential',async()=>{
  const c=client();let current='a';
  c.auth.getSession=async()=>({data:{session:{access_token:'token-'+current,user:{id:current}}}});
  c.auth.getUser=async token=>{assert.equal(token,'token-a');current='b';return {data:{user:{id:'a'}}};};
  await setSessionPassword(c,input,'a',async(url,request)=>{
    assert.equal(current,'b');assert.equal(String(url),'https://placeholder.supabase.co/auth/v1/user');
    assert.equal(request.headers.Authorization,'Bearer token-a');assert.equal(request.headers.apikey,'fixture-anon');
    assert.equal(request.redirect,'error');assert.deepEqual(JSON.parse(request.body),{password:input.password});
    return Response.json({id:'a'});
  });
});
test('provider rejection exposes only an allowlisted error code',async()=>{
  await assert.rejects(setSessionPassword(client(),input,'a',async()=>Response.json({code:'weak_password',msg:'sensitive provider detail'},{status:422})),error=>error.code==='weak_password'&&!error.message.includes('sensitive'));
});
