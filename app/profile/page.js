"use client";
import { useSavedText } from "../components/LocalizedText";

import Link from 'next/link';
import RequestBoard from '../components/dashboard/RequestBoard';
import MyMiami from '../components/MyMiami';
import { btn, eyebrowClass } from '../components/g1/ui';
import { getTranslation } from '../../lib/i18n';
import { useLocale } from '../components/LocaleProvider';
import { useAuth } from '../components/AuthProvider';

// "My Miami": the guest's own page. Favourites first - they need no account
// and live on this device - then the requests, with where each one stands,
// once the guest has signed in. The iOS app's Profile tab opens this page.
const headingClass = 'g1-display font-g1display text-[clamp(2.1rem,3.6vw+1rem,4.6rem)] font-medium leading-none tracking-[-0.015em] text-g1-ink [overflow-wrap:break-word] [text-wrap:balance]';

export default function ProfilePage() {
  const msg = useSavedText();
  const locale = useLocale();
  const t = getTranslation(locale);
  const auth = useAuth();
  const session = auth?.session;

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <header className="grid gap-[18px] pb-[clamp(24px,3vw,40px)] pt-[clamp(24px,4vw,56px)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={eyebrowClass}>{msg('User Profile')}</p>
          {session && <p className="min-w-0 text-[0.9rem] text-g1-soft [overflow-wrap:anywhere]">{t.auth.signedInAs} {session.name} ({session.email})</p>}
        </div>
        <h1 className={headingClass}>{msg('My Miami')}</h1>
        <p className="max-w-[58ch] text-[clamp(1.06rem,0.35vw+1rem,1.22rem)] text-g1-soft [text-wrap:pretty]">{msg('Your favourites and your requests in one place.')}</p>
        {(session?.role === 'admin' || session?.role === 'partner') && (
          <nav className="flex flex-wrap gap-5 text-sm text-g1-ink">
            {session.role === 'admin' && <Link href="/admin" className="underline decoration-g1-rule underline-offset-4">{msg('Admin Portal')}</Link>}
            <Link href="/partner" className="underline decoration-g1-rule underline-offset-4">{msg('Partner Portal')}</Link>
          </nav>
        )}
      </header>

      <MyMiami />

      <section aria-labelledby="my-miami-requests" className="border-t border-g1-rule pt-[clamp(28px,4vw,48px)]">
        <h2 id="my-miami-requests" className="font-g1display text-[clamp(1.6rem,1.4vw+1rem,2.2rem)] font-medium leading-tight text-g1-ink">{msg('My requests')}</h2>
        {auth?.loading ? (
          <p role="status" className="py-6 text-g1-soft">{msg('Loading...')}</p>
        ) : session ? (
          <RequestBoard key={session.id} scope="customer" embedded />
        ) : (
          <div className="grid max-w-[58ch] gap-4 py-6">
            <p className="text-g1-soft">{msg('Sign in to see your requests and where each one stands.')}</p>
            <Link href="/login" className={`${btn.base} ${btn.primary} w-fit`}>{t.auth.signInTab}</Link>
          </div>
        )}
      </section>
    </main>
  );
}
