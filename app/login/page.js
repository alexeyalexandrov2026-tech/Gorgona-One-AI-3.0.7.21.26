"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTranslation } from '../../lib/i18n';
import { useLocale } from '../components/LocaleProvider';
import { useAuth } from '../components/AuthProvider';
import { signIn } from '../../lib/auth';

export default function LoginPage() {
  const locale = useLocale();
  const t = getTranslation(locale);
  const auth = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await signIn(form, t.auth);
      setSuccess(t.auth.successSignIn);
      auth?.refresh();
      setTimeout(() => router.push('/profile'), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium backdrop-blur-md">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{t.auth.pill}</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Welcome Back</h1>
        <p className="mt-3 text-zinc-400">Sign in to your account</p>



        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <input
            type="email"
            value={form.email}
            onChange={(event) => handleChange('email', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition"
            placeholder="Email Address"
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => handleChange('password', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition"
            placeholder="Password"
          />

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
          {success && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-gold px-4 py-3 font-medium text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center space-y-3">
          <p className="text-sm text-zinc-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-gold hover:underline">
              Create one now
            </Link>
          </p>
          <p className="text-sm text-zinc-500">
            Are you a business owner?{' '}
            <Link href="/register/partner" className="text-white hover:underline">
              Become a Partner
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
