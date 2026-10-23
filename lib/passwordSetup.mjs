import {AUTH_MESSAGES} from './authMessages.js';

/**
 * @param {{auth: import('@supabase/supabase-js').SupabaseClient['auth'], url: string, anonKey: string}} client
 * @param {{password: string, confirmPassword: string}} input
 * @param {string} expectedUserId
 * @param {typeof fetch} fetcher
 */
export async function setSessionPassword(client,{password,confirmPassword},expectedUserId,fetcher=fetch){
  if(!password||!confirmPassword)throw new Error(AUTH_MESSAGES.required);
  if(password.length<6)throw new Error(AUTH_MESSAGES.length);
  if(password!==confirmPassword)throw new Error(AUTH_MESSAGES.match);
  const {data:sessionData,error:sessionError}=await client.auth.getSession();
  const session=sessionData?.session,token=session?.access_token;
  if(sessionError||!expectedUserId||!token||session.user?.id!==expectedUserId)throw new Error(AUTH_MESSAGES.failed);
  // Pin both verification and mutation to this token. A shared SDK client may
  // switch accounts between awaits; updateUser() would reread its new session.
  const {data:current,error:identityError}=await client.auth.getUser(token);
  if(identityError||current.user?.id!==expectedUserId)throw new Error(AUTH_MESSAGES.failed);
  const response=await fetcher(new URL('/auth/v1/user',client.url),{
    method:'PUT',headers:{apikey:client.anonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({password}),redirect:'error',signal:AbortSignal.timeout(10000)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok){const failure=new Error();failure.code=typeof result.code==='string'?result.code:'';throw failure;}
  if((result.user||result).id!==expectedUserId)throw new Error(AUTH_MESSAGES.failed);
}
