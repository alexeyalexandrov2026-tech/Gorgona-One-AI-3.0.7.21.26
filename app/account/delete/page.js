"use client";

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';
import { useSavedText } from '../../components/LocalizedText';
import { supabase } from '../../../lib/supabase';

function DeletionRequest({ userId }) {
  const msg = useSavedText();
  const key = useRef(null);
  const inFlight = useRef(false);
  const [confirmed, setConfirmed] = useState(false);
  const [state, setState] = useState('idle');

  async function requestDeletion(event) {
    event.preventDefault();
    if (!confirmed || inFlight.current || state === 'received') return;
    inFlight.current = true;
    setState('sending');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || data?.session?.user?.id !== userId) throw new Error('Session changed');
      key.current ??= crypto.randomUUID();
      const response = await fetch('/api/account/deletion-requests', {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: 'Bearer ' + data.session.access_token, 'Idempotency-Key': key.current },
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (response.status !== 202 || result?.received !== true) throw new Error('Request not received');
      setState('received');
    } catch {
      setState('failed');
    } finally {
      inFlight.current = false;
    }
  }

  if (state === 'received') {
    return <p role="status">{msg('We received your request and will contact you at your account email.')}</p>;
  }
  return (
    <form className="grid gap-4" onSubmit={requestDeletion}>
      <label className="flex items-start gap-3">
        <input className="mt-1" type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={state === 'sending'} required />
        <span>{msg('I request deletion of my account and its data.')}</span>
      </label>
      {state === 'failed' && <p role="alert">{msg('Could not send the request. Try again.')}</p>}
      <button className="w-fit rounded-full bg-brand-gold px-5 py-3 font-medium text-black disabled:opacity-50"
        type="submit" disabled={!confirmed || state === 'sending'}>
        {state === 'sending' ? msg('Loading...') : msg('Send request')}
      </button>
    </form>
  );
}

export default function AccountDeletionPage() {
  const auth = useAuth();
  const msg = useSavedText();
  return (
    <main className="flex-1 py-12">
      <div className="mx-auto grid max-w-xl gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">{msg('Request account deletion')}</h1>
        <p className="text-zinc-300">{msg('Deleting your account removes your profile and saved favorites. We may keep records for legal reasons.')}</p>
        {auth?.loading ? <p role="status">{msg('Loading...')}</p> : auth?.session ? (
          <DeletionRequest key={auth.session.id} userId={auth.session.id} />
        ) : (
          <Link href="/login?next=/account/delete" className="w-fit rounded-full bg-brand-gold px-5 py-3 font-medium text-black">
            {msg('Sign In')}
          </Link>
        )}
        <Link href="/privacy" className="w-fit underline">{msg('Privacy')}</Link>
      </div>
    </main>
  );
}
