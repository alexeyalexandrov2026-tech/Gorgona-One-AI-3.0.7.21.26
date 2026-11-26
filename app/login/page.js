"use client";
import { useSavedText } from "../components/LocalizedText";

import { authErrorSource } from '../../lib/authMessages';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTranslation } from '../../lib/i18nClient';
import { useLocale } from '../components/LocaleProvider';
import { useAuth } from '../components/AuthProvider';
import { SocialAuthButtons } from '../components/SocialAuthButtons';
import { signIn } from '../../lib/auth';
import { postLoginPath } from '../../lib/postLoginPath.mjs';

export default function LoginPage() {
  const msg = useSavedText();
  const locale = useLocale();
  const t = getTranslation(locale);
  const auth = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await signIn(form, {
        errorRequired: 'Please fill out all fields',
        errorEmail: 'Invalid email'
      });
      // The verified profile decides the landing page: partners open the partner
      // portal and admins the admin panel; a same-site ?next= wins over both.
      const session = await auth?.refresh();
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(postLoginPath(session?.role, next));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium backdrop-blur-md">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{t.auth.pill}</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{msg("Welcome Back")}</h1>
        <p className="mt-3 text-zinc-400">{msg("Sign in to your account")}</p>

        <SocialAuthButtons showMagicLink />

        <form onSubmit={handleSubmit} noValidate className="mt-2 space-y-4">
          <input
            type="email"
            autoComplete="username"
            aria-label={msg("Email Address")}
            value={form.email}
            onChange={(event) => handleChange('email', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition"
            placeholder={msg("Email Address")}
          />
          <input
            type="password"
            autoComplete="current-password"
            aria-label={msg("Password")}
            value={form.password}
            onChange={(event) => handleChange('password', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none focus:border-brand-gold transition"
            placeholder={msg("Password")}
          />

          <Link href="/forgot-password" className="inline-block text-sm text-brand-gold hover:underline">{msg("Forgot your password?")}</Link>

          {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{msg(authErrorSource(error))}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-gold px-4 py-3 font-medium text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? msg("Signing in...") : msg("Sign In")}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center space-y-3">
          <p className="text-sm text-zinc-400">{msg("Don't have an account?")}{' '}
            <Link href="/register" className="text-brand-gold hover:underline">{msg("Create one now")}</Link>
          </p>
          <p className="text-sm text-zinc-500">{msg("Are you a business owner?")}{' '}
            <Link href="/register/partner" className="text-white hover:underline">{msg("Become a Partner")}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
