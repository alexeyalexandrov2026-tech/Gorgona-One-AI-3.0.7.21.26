'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSavedText } from '../components/LocalizedText';
import { requestPasswordReset } from '../../lib/auth';
import { authErrorSource } from '../../lib/authMessages';

export default function ForgotPasswordPage() {
  const msg = useSavedText();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (sending || sent) return;
    setSending(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (failure) {
      setError(failure);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center py-16">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium backdrop-blur-md">
        <h1 className="text-3xl font-semibold text-white">{msg('Forgot your password?')}</h1>
        {sent ? (
          <p role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {msg('If an account exists for this email, we’ll send a password reset link.')}
          </p>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <label className="block text-sm text-zinc-300">
              {msg('Email Address')}
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                disabled={sending}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white focus:border-brand-gold"
              />
            </label>
            {error && <p role="alert" className="text-sm text-red-300">{msg(authErrorSource(error))}</p>}
            <button type="submit" disabled={sending} className="min-h-[44px] w-full rounded-full bg-brand-gold px-4 py-3 font-medium text-black disabled:opacity-60">
              {sending ? msg('Loading...') : msg('Request a reset link')}
            </button>
          </form>
        )}
        <Link href="/login" className="mt-6 inline-block text-sm text-brand-gold hover:underline">
          {msg('Return to Login')}
        </Link>
      </section>
    </main>
  );
}
