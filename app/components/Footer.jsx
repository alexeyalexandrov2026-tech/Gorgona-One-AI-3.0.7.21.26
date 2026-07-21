"use client";

import Link from 'next/link';
import { useLocale } from './LocaleProvider';
import { getTranslation } from '../../lib/i18n';
const sections = [
  { key: 'travel', href: '/travel', fallback: 'Travel' },
  { key: 'shopping', href: '/stores', fallback: 'Shopping' },
  { key: 'villas', href: '/vacation-rentals', fallback: 'Villas & Stays' },
  { key: 'yachts', href: '/yachts', fallback: 'Yacht Rentals' },
  { key: 'cars', href: '/rentals', fallback: 'Car Rentals' },
  { key: 'sportsbooks', href: '/sportsbook', fallback: 'Sportsbooks' },
  { key: 'events', href: '/events', fallback: 'Events & Entertainment' },
  { key: 'discovery', href: '/discovery', fallback: 'Discovery Room' }
];

const company = [
  { key: 'partnerPortal', href: '/partner', fallback: 'Partner Portal' },
  { key: 'becomePartner', href: '/partner-agreement', fallback: 'Become a Partner' },
  { key: 'admin', href: '/admin', fallback: 'Admin' },
  { key: 'signIn', href: '/login', fallback: 'Sign In' }
];

const legal = [
  { key: 'privacy', href: '/privacy', fallback: 'Privacy' },
  { key: 'terms', href: '/terms', fallback: 'Terms' },
  { key: 'affiliateDisclosure', href: '/affiliate-disclosure', fallback: 'Affiliate Disclosure' },
  { key: 'cookiePolicy', href: '/cookie-policy', fallback: 'Cookie Policy' }
];

export function Footer() {
  const locale = useLocale();
  const t = getTranslation(locale);

  return (
    <footer className="mt-24 border-t border-white/10 pb-10 pt-16 text-sm text-zinc-400">
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold tracking-[0.3em] text-white">GORGONA</span>
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-brand-gold">One</span>
          </div>
          <p className="mt-4 max-w-sm leading-relaxed text-zinc-500">
            {t.footer?.desc || 'A luxury ecosystem for travel, shopping, stays, yachts, cars, sportsbooks, events and an AI concierge — verified offers and premium experiences in one destination.'}
          </p>
        </div>

        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-brand-gold">{t.footer?.ecosystemTitle || 'Ecosystem'}</p>
          <ul className="mt-4 space-y-2.5">
            {sections.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-white">
                  {t.discovery?.[item.key] || item.fallback}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-brand-gold">{t.footer?.companyTitle || 'Company'}</p>
          <ul className="mt-4 space-y-2.5">
            {company.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-white">
                  {t.footer?.[item.key] || t.home?.[item.key] || item.fallback}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-brand-gold">{t.footer?.legalTitle || 'Legal'}</p>
          <ul className="mt-4 space-y-2.5">
            {legal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-white">
                  {t.footer?.[item.key] || item.fallback}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-zinc-500">{t.footer?.copyright || '© 2026 GORGONA ONE. Premium deals, verified offers, and affiliate-ready monetization.'}</p>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-zinc-600">{t.footer?.tagline || 'A unified luxury ecosystem'}</p>
      </div>
    </footer>
  );
}
