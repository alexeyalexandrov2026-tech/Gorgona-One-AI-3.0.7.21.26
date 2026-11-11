"use client";
import { useSavedText } from "../components/LocalizedText";

import Link from 'next/link';
import RequestBoard from '../components/dashboard/RequestBoard';
import { FavoritesBoard } from '../components/Favorites';
import { btn, eyebrowClass } from '../components/g1/ui';
import { getTranslation } from '../../lib/i18n';
import { useLocale } from '../components/LocaleProvider';
import { useAuth } from '../components/AuthProvider';

// Same opening as the world pages (WorldHero in components/g1/ui.jsx):
// a small eyebrow over a heading that wraps instead of running off a phone.
const headingClass = 'g1-display font-g1display text-[clamp(2.1rem,3.6vw+1rem,4.6rem)] font-medium leading-none tracking-[-0.015em] text-g1-ink [overflow-wrap:break-word] [text-wrap:balance]';

export default function ProfilePage() {
  const msg = useSavedText();
  const locale = useLocale();
  const t = getTranslation(locale);
  const auth = useAuth();

  if (auth?.loading) return <main className="flex-1 py-10 font-g1sans text-g1-soft" role="status">{msg('Loading...')}</main>;
  if (auth && !auth.session) {
    return (
      <main className="flex-1 font-g1sans text-g1-ink">
        <header className="grid max-w-[46rem] gap-[18px] pb-[clamp(30px,4vw,56px)] pt-[clamp(24px,4vw,56px)]">
          <p className={eyebrowClass}>{msg("User Profile")}</p>
          <h1 className={headingClass}>{t.auth.title}</h1>
          <p className="max-w-[58ch] text-[clamp(1.06rem,0.35vw+1rem,1.22rem)] text-g1-soft [text-wrap:pretty]">{t.auth.subtitle}</p>
          <Link href="/login" className={`${btn.base} ${btn.primary} w-fit`}>
            {t.auth.signInTab}
          </Link>
        </header>
        {/* Favourites saved on this device before signing in. */}
        <FavoritesBoard />
      </main>
    );
  }

  return (
    <main className="flex-1 font-g1sans text-g1-ink">
      <header className="grid gap-[18px] pb-6 pt-[clamp(24px,4vw,56px)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={eyebrowClass}>{msg("User Profile")}</p>
          {auth?.session && <p className="min-w-0 text-[0.9rem] text-g1-soft [overflow-wrap:anywhere]">{t.auth.signedInAs} {auth.session.name} ({auth.session.email})</p>}
        </div>
        <h1 className={headingClass}>{msg('My Miami')}</h1>
      </header>

      <nav className="flex flex-wrap gap-5 text-sm text-g1-ink">
        {auth?.session?.role === 'admin' && <Link href="/admin" className="underline decoration-g1-rule underline-offset-4">{msg('Admin Portal')}</Link>}
        {['partner','admin'].includes(auth?.session?.role) && <Link href="/partner" className="underline decoration-g1-rule underline-offset-4">{msg('Partner Portal')}</Link>}
      </nav>
      {auth?.session && <RequestBoard key={auth.session.id} scope="customer" title={msg('My requests and plans')} />}
      <FavoritesBoard />
    </main>
  );
}
