"use client";

import { useState } from 'react';
import { useLocale } from './LocaleProvider';
import { useSavedText } from './LocalizedText';
import { getSocialAuthCopy } from '../../lib/socialAuthCopy.mjs';
import { signInWithProvider, signInWithMagicLink, OAUTH_PROVIDERS } from '../../lib/auth';

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 fill-current">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.68 14.96.6 12 .6 7.42.6 3.47 3.22 1.54 7.05l3.73 2.9C6.16 7.13 8.84 5.04 12 5.04z" />
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45c-.28 1.49-1.12 2.75-2.38 3.6l3.66 2.84c2.14-1.97 3.76-4.88 3.76-8.47z" />
      <path fill="#FBBC05" d="M5.27 14.05A7.01 7.01 0 0 1 4.9 12c0-.71.13-1.4.37-2.05l-3.73-2.9A11.4 11.4 0 0 0 .6 12c0 1.84.44 3.58 1.24 5.12l3.43-3.07z" />
      <path fill="#34A853" d="M12 23.4c3.08 0 5.66-1.02 7.55-2.76l-3.66-2.84c-1.02.68-2.32 1.09-3.89 1.09-3.16 0-5.84-2.09-6.73-4.84l-3.43 3.07C3.78 20.89 7.6 23.4 12 23.4z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path fill="#ffffff" d="M15.12 15.5l.47-3.04h-2.92v-1.97c0-.83.41-1.64 1.72-1.64h1.33V6.26s-1.21-.21-2.36-.21c-2.41 0-3.98 1.46-3.98 4.1v2.31H6.7v3.04h2.68v7.35a10.9 10.9 0 0 0 3.29 0V15.5h2.45z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <rect x="2" y="2" width="9.2" height="9.2" fill="#F25022" />
      <rect x="12.8" y="2" width="9.2" height="9.2" fill="#7FBA00" />
      <rect x="2" y="12.8" width="9.2" height="9.2" fill="#00A4EF" />
      <rect x="12.8" y="12.8" width="9.2" height="9.2" fill="#FFB900" />
    </svg>
  );
}

const PROVIDER_META = {
  apple: {
    key: 'apple',
    Icon: AppleIcon,
    className: 'bg-white text-black border-white hover:bg-zinc-100'
  },
  google: {
    key: 'google',
    Icon: GoogleIcon,
    className: 'bg-white/[0.06] text-white border-white/15 hover:border-brand-gold/60 hover:bg-white/[0.11]'
  },
  facebook: {
    key: 'facebook',
    Icon: FacebookIcon,
    className: 'bg-white/[0.06] text-white border-white/15 hover:border-brand-gold/60 hover:bg-white/[0.11]'
  },
  azure: {
    key: 'microsoft',
    Icon: MicrosoftIcon,
    className: 'bg-white/[0.06] text-white border-white/15 hover:border-brand-gold/60 hover:bg-white/[0.11]'
  }
};

export function SocialAuthButtons({ showMagicLink = true }) {
  const locale = useLocale();
  const msg = useSavedText();
  const copy = getSocialAuthCopy(locale);
  const [busyProvider, setBusyProvider] = useState('');
  const [providerError, setProviderError] = useState('');
  const [magicOpen, setMagicOpen] = useState(false);
  const [magicEmail, setMagicEmail] = useState('');
  const [magicSending, setMagicSending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const configuredEnv = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_OAUTH_PROVIDERS : '';
  const visibleProviders = configuredEnv
    ? configuredEnv.split(',').map((p) => p.trim().toLowerCase()).filter((p) => OAUTH_PROVIDERS.includes(p))
    : OAUTH_PROVIDERS;

  async function handleOAuth(provider) {
    if (busyProvider) return;
    setProviderError('');
    setBusyProvider(provider);
    try {
      const next = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('next') || ''
        : '';
      await signInWithProvider(provider, next);
    } catch (err) {
      const message = String(err?.message || '');
      if (/unsupported|not enabled|provider/i.test(message)) {
        setProviderError(copy.providerPending);
      } else {
        setProviderError(copy.callbackError);
      }
      setBusyProvider('');
    }
  }

  async function handleMagicLink(event) {
    event.preventDefault();
    if (magicSending || !magicEmail.trim()) return;
    setProviderError('');
    setMagicSending(true);
    try {
      const next = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('next') || ''
        : '';
      await signInWithMagicLink(magicEmail, next);
      setMagicSent(true);
    } catch {
      setProviderError(copy.callbackError);
    } finally {
      setMagicSending(false);
    }
  }

  return (
    <div data-social-auth="true" className="mt-6 grid gap-2.5">
      {visibleProviders.map((provider) => {
        const meta = PROVIDER_META[provider];
        if (!meta) return null;
        const IconComp = meta.Icon;
        return (
          <button
            key={provider}
            type="button"
            data-oauth-provider={provider}
            disabled={Boolean(busyProvider)}
            onClick={() => handleOAuth(provider)}
            className={`flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${meta.className}`}
          >
            <IconComp />
            <span>{copy[meta.key]}</span>
          </button>
        );
      })}

      {showMagicLink && (
        <div className="pt-1">
          <button
            type="button"
            data-magic-link-toggle="true"
            onClick={() => { setMagicOpen((prev) => !prev); setMagicSent(false); setProviderError(''); }}
            className="flex min-h-[42px] w-full items-center justify-center rounded-full border border-brand-gold/40 bg-brand-gold/10 px-4 py-2 text-xs font-medium text-brand-gold transition hover:bg-brand-gold/20"
          >
            {magicOpen ? copy.passwordToggle : copy.magicLinkToggle}
          </button>

          {magicOpen && (
            magicSent ? (
              <p role="status" className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
                {copy.magicLinkSent}
              </p>
            ) : (
              <form onSubmit={handleMagicLink} className="mt-3 grid gap-2.5 rounded-2xl border border-white/10 bg-black/35 p-3.5">
                <p className="text-xs text-zinc-400">{copy.magicLinkHint}</p>
                <input
                  type="email"
                  required
                  value={magicEmail}
                  onChange={(event) => setMagicEmail(event.target.value)}
                  aria-label={msg("Email Address")}
                  placeholder={msg("Email Address")}
                  className="w-full rounded-xl border border-white/15 bg-black/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-gold"
                />
                <button
                  type="submit"
                  disabled={magicSending}
                  className="w-full rounded-full bg-brand-gold px-4 py-2.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {magicSending ? copy.magicLinkSending : copy.magicLinkButton}
                </button>
              </form>
            )
          )}
        </div>
      )}

      {providerError && (
        <p role="alert" className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
          {providerError}
        </p>
      )}

      <div className="my-2 flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-white/10" />
        <span>{copy.divider}</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  );
}
