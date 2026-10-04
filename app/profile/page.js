"use client";

import Link from 'next/link';
import { getTranslation } from '../../lib/i18n';
import { useLocale } from '../components/LocaleProvider';
import { useAuth } from '../components/AuthProvider';

const ROLE_LABELS = { user: 'Guest', partner: 'Partner', admin: 'Administrator' };
const PORTALS = {
  partner: { href: '/partner', label: 'Open Partner Desk' },
  admin: { href: '/admin', label: 'Open Admin Console' }
};

export default function ProfilePage() {
  const locale = useLocale();
  const t = getTranslation(locale);
  const auth = useAuth();

  if (auth?.loading) {
    return (
      <main className="flex-1 theme-villa full-bleed flex items-center justify-center bg-villa-parchment py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-villa-obsidian border-t-transparent"></div>
      </main>
    );
  }

  if (auth && !auth.session) {
    return (
      <main className="flex-1 theme-villa full-bleed bg-villa-parchment text-villa-obsidian pb-20 pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="border-t border-villa-obsidian/20 pt-6">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash mb-4">User Profile</p>
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
          <span>User Profile</span>
          {auth?.session && <span>{t.auth.signedInAs} {auth.session.name} ({auth.session.email})</span>}
        </div>

        <h1 className="mt-10 font-display text-[10vw] sm:text-[6rem] font-medium leading-[0.92] tracking-[-0.02em] text-villa-charcoal uppercase mb-16">
          Concierge<br/><span className="text-villa-ash/70">Desk</span>
        </h1>

        {/* Real account details only - this page used to show fixed sample
            numbers (saved coupons, favorites, history) that no feature tracks. */}
        <div className="grid gap-x-10 gap-y-10 md:grid-cols-3 border-t border-villa-obsidian/20 pt-10">
          <div className="group border-b border-villa-obsidian/20 pb-10">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">{t.auth.name}</p>
            <p className="mt-4 font-display text-3xl text-villa-charcoal break-words">{auth?.session?.name}</p>
          </div>
          <div className="group border-b border-villa-obsidian/20 pb-10">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">{t.auth.email}</p>
            <p className="mt-4 font-display text-3xl text-villa-charcoal break-all">{auth?.session?.email}</p>
          </div>
          <div className="group border-b border-villa-obsidian/20 pb-10">
            <p className="font-fira text-[0.64rem] font-medium uppercase tracking-[0.18em] text-villa-ash">Account type</p>
            <p className="mt-4 font-display text-3xl text-villa-charcoal capitalize">{ROLE_LABELS[auth?.session?.role] || ROLE_LABELS.user}</p>
            {PORTALS[auth?.session?.role] && (
              <Link href={PORTALS[auth.session.role].href} className="mt-6 inline-block border-b border-villa-obsidian pb-1 font-fira text-sm font-medium uppercase tracking-[0.18em] text-villa-obsidian transition-opacity hover:opacity-60">
                {PORTALS[auth.session.role].label}
              </Link>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
