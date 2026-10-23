'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useAuth} from '../../components/AuthProvider';
import {useLocale} from '../../components/LocaleProvider';
import {useSavedText} from '../../components/LocalizedText';
import {getTranslation} from '../../../lib/i18n';
import {setPassword} from '../../../lib/auth';
import {authErrorSource} from '../../../lib/authMessages';

function PasswordSetup(){
  const auth=useAuth(),locale=useLocale(),msg=useSavedText(),router=useRouter(),t=getTranslation(locale).auth;
  const [password,updatePassword]=useState(''),[confirmPassword,updateConfirmation]=useState('');
  const [saving,setSaving]=useState(false),[error,setError]=useState(null);
  useEffect(()=>{
    if(auth?.loading||!auth?.session)return;
    // The SDK consumes the implicit-flow fragment before profile verification.
    // Synchronize Next's canonical URL even when the SDK has already cleared
    // location.hash, so a pending hydration cannot restore the old fragment.
    router.replace(window.location.pathname+window.location.search,{scroll:false});
  },[auth?.loading,auth?.session?.id,router]);
  async function submit(event){
    event.preventDefault();if(saving)return;setSaving(true);setError(null);
    try{
      await setPassword({password,confirmPassword},auth?.session?.id);
      updatePassword('');updateConfirmation('');router.replace('/profile');
    }catch(failure){setError(authErrorSource(failure));}
    finally{setSaving(false);}
  }
  if(auth?.loading)return <main role="status" className="flex-1 p-10">{msg('Loading...')}</main>;
  return <main className="flex flex-1 items-center justify-center px-4 py-16">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
      <h1 className="text-3xl font-semibold text-white">{msg('Password')}</h1>
      {auth?.session ? <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <label className="block text-sm text-zinc-300">{t.email}
          <input type="email" autoComplete="username" value={auth.session.email} readOnly className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white"/>
        </label>
        <label className="block text-sm text-zinc-300">{t.password}
          <input type="password" autoComplete="new-password" minLength={6} value={password} onChange={e=>updatePassword(e.target.value)} disabled={saving} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white focus:border-brand-gold"/>
        </label>
        <label className="block text-sm text-zinc-300">{t.confirmPassword}
          <input type="password" autoComplete="new-password" minLength={6} value={confirmPassword} onChange={e=>updateConfirmation(e.target.value)} disabled={saving} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white focus:border-brand-gold"/>
        </label>
        {error&&<p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{msg(error)}</p>}
        <button type="submit" disabled={saving} className="min-h-[44px] w-full rounded-full bg-brand-gold px-4 py-3 font-medium text-black disabled:opacity-60">{saving?t.loading:msg('Save')}</button>
        <Link href="/profile" className="inline-block py-2 text-sm text-zinc-300 underline">{msg('Cancel')}</Link>
      </form> : <Link href="/login" className="mt-6 inline-block rounded-full bg-brand-gold px-4 py-3 text-black">{t.signInTab}</Link>}
    </section>
  </main>;
}
export default function AccountSetup(){const auth=useAuth();return <PasswordSetup key={auth?.session?.id||'signed-out'}/>;}
