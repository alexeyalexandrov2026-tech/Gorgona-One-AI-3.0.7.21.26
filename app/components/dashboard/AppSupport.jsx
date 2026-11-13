"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSavedText } from '../LocalizedText';

async function supportApi(userId, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data?.session?.user?.id !== userId) throw new Error('Session changed');
  const response = await fetch('/api/dashboard/app-support', {
    ...options, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Support requests unavailable');
  return response.json();
}

export default function AppSupport({ userId }) {
  const msg = useSavedText();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const refresh = useCallback(async (signal) => {
    setError(false);
    try {
      const response = await supportApi(userId, { signal });
      if (!signal?.aborted) setRequests(response.requests);
    } catch {
      if (!signal?.aborted) setError(true);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  async function resolve(id) {
    setBusy(true);
    setError(false);
    try {
      await supportApi(userId, { method: 'PATCH', body: JSON.stringify({ id }) });
      setConfirming(null);
      await refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="app-support-requests" className="mt-10 grid gap-4">
      <h2 id="app-support-requests" className="font-display text-3xl">{msg('App support requests')}</h2>
      {error && <p role="alert">{msg('Unable to load requests.')}</p>}
      {requests === null && !error && <p role="status">{msg('Loading...')}</p>}
      {requests?.length === 0 && <p>{msg('No open app support requests.')}</p>}
      <button className="w-fit underline" type="button" onClick={() => refresh()} disabled={busy}>{msg('Refresh')}</button>
      {requests?.map(row => (
        <article key={row.id} className="grid gap-2 break-words rounded-xl border border-villa-obsidian/20 p-4">
          <h3 className="font-semibold">{row.kind === 'ai_report' ? msg('Concierge answer report') : msg('Account deletion request')}</h3>
          <p className="text-sm">{row.created_at} · {row.id}</p>
          {row.kind === 'ai_report' ? (
            <>
              <p className="whitespace-pre-wrap">{row.content.question}</p>
              <p className="whitespace-pre-wrap">{row.content.answer}</p>
              {row.content.note && <p className="whitespace-pre-wrap">{row.content.note}</p>}
            </>
          ) : row.user_id && (
            <p>{msg('Account ID')}: {row.user_id}</p>
          )}
          {row.kind === 'account_deletion' && row.user_id ? (
            <p className="text-sm">{msg('Pending')}</p>
          ) : confirming === row.id ? (
            <div className="flex flex-wrap gap-3">
              <button className="underline" type="button" disabled={busy} onClick={() => resolve(row.id)}>
                {msg('Confirm resolution')}
              </button>
              <button className="underline" type="button" disabled={busy} onClick={() => setConfirming(null)}>{msg('Cancel')}</button>
            </div>
          ) : (
            <button className="w-fit underline" type="button" disabled={busy} onClick={() => setConfirming(row.id)}>{msg('Mark as resolved')}</button>
          )}
        </article>
      ))}
    </section>
  );
}
