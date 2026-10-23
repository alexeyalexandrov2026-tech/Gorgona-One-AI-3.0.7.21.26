"use client";
import { LocalizedTitle, useSavedText } from "../components/LocalizedText";

import Link from 'next/link';
import RequestBoard from '../components/dashboard/RequestBoard';
import { getTranslation } from '../../lib/i18n';
import { useLocale } from '../components/LocaleProvider';
import { useAuth } from '../components/AuthProvider';

export default function ProfilePage() {
  const msg = useSavedText();
  const locale = useLocale();
  const t = getTranslation(locale);
  const auth = useAuth();

  if (auth?.loading) return <main className="flex-1 theme-villa bg-villa-parchment p-10 text-villa-obsidian" role="status">{msg('Loading...')}</main>;
  if (auth && !auth.session) {
    return (
      <main className="flex-1 theme-villa full-bleed bg-villa-parchment text-villa-obsidian pb-20 pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="border-t border-villa-obsidian/20 pt-6">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-4">{msg("User Profile")}</p>
            <h1 className="font-display text-[3rem] sm:text-[5rem] font-medium leading-[0.92] tracking-[-0.02em] text-villa-charcoal uppercase">
              {t.auth.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-villa-graphite">{t.auth.subtitle}</p>
            <Link href="/login" className="mt-8 inline-block border-b border-villa-obsidian pb-1 font-fira text-sm font-medium uppercase tracking-[0.18em] text-villa-obsidian transition-opacity hover:opacity-60">
              {t.auth.signInTab}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 theme-villa full-bleed bg-villa-parchment text-villa-obsidian pb-20 pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-villa-obsidian/20 pb-4 font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">
          <span>{msg("User Profile")}</span>
          {auth?.session && <span>{t.auth.signedInAs} {auth.session.name} ({auth.session.email})</span>}
        </div>

        <h1 className="mt-10 font-display text-[10vw] sm:text-[6rem] font-medium leading-[0.92] tracking-[-0.02em] text-villa-charcoal uppercase mb-16"><LocalizedTitle source="Concierge{break}Desk" />
        </h1>

        <nav className="flex flex-wrap gap-5 text-sm text-villa-obsidian">
          {auth?.session?.role === 'admin' && <Link href="/admin" className="underline">{msg('Admin Portal')}</Link>}
          {['partner','admin'].includes(auth?.session?.role) && <Link href="/partner" className="underline">{msg('Partner Portal')}</Link>}
        </nav>
        {auth?.session && <RequestBoard key={auth.session.id} scope="customer" />}

      </div>
    </main>
  );
}
