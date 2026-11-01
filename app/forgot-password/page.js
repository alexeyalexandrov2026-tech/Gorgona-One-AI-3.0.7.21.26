'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../components/LocaleProvider';
import { getPasswordRecoveryCopy } from '../../lib/passwordRecoveryCopy.mjs';
import { normalizeRecoveryEmail, requestPasswordRecovery } from '../../lib/passwordRecovery.mjs';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const copy = getPasswordRecoveryCopy(useLocale());
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending || sent) return;
    setError('');
    try {
      normalizeRecoveryEmail(email);
    } catch {
      setError(copy.invalid);
      return;
    }

    setSending(true);
    try {
      await requestPasswordRecovery(supabase.auth, email, window.location.origin);
      setSent(true);
    } catch {
      // The public UI intentionally hides provider errors and account existence.
      setError(copy.failed);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <section className="w-full max-w-md min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-premium backdrop-blur-md sm:p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Miami Elio</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{sent ? copy.sentTitle : copy.title}</h1>
        <p className="mt-3 text-zinc-400">{sent ? copy.sentBody : copy.description}</p>

        {!sent && (
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <label htmlFor="recovery-email" className="block text-sm font-medium text-zinc-300">{copy.email}</label>
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={sending}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'recovery-error' : undefined}
              className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition focus:border-brand-gold disabled:opacity-60"
            />
            {error && <p id="recovery-error" role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="min-h-[46px] w-full rounded-full bg-brand-gold px-4 py-3 font-medium text-black transition hover:brightness-110 disabled:opacity-60"
            >
              {sending ? copy.sending : copy.submit}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-gold underline-offset-4 hover:underline focus-visible:underline">
          {copy.back}
        </Link>
      </section>
    </main>
  );
}
