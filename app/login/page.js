"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTranslation } from '../../lib/i18n';
import { useLocale } from '../components/LocaleProvider';
import { useAuth } from '../components/AuthProvider';
import { signIn, signInWithGoogle } from '../../lib/auth';

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

        <div className="mt-8">
          <button
            type="button"
            onClick={async () => {
              try {
                await signInWithGoogle();
              } catch (err) {
                setError(err.message);
              }
            }}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white p-3 font-medium text-black transition hover:bg-zinc-200"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
          
          <div className="relative mt-6 flex items-center justify-center">
            <div className="absolute w-full border-t border-white/10"></div>
            <span className="relative bg-[#1A1A1A] px-4 text-xs uppercase text-zinc-500">Or sign in with email</span>
          </div>
        </div>

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
