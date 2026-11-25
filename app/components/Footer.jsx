"use client";
import { LocalizedText } from "./LocalizedText";


import Link from 'next/link';
import { useLocale } from './LocaleProvider';
import { getTranslation } from '../../lib/i18n';
import { getNavExtraCopy } from '../../lib/navExtraCopy.mjs';
import { GetTheApp } from './GetTheApp';
import { configuredManagerTelegram, configuredManagerWhatsApp, configuredManagerPhone } from '../../lib/managerContact.mjs';
const managerTelegram = configuredManagerTelegram();
const managerWhatsApp = configuredManagerWhatsApp();
const managerPhone = configuredManagerPhone();
const sections = [
  { key: 'travel', href: '/travel', fallback: 'Travel' },
  { key: 'experiences', href: '/experiences', fallback: 'Experiences' },
  { key: 'villas', href: '/vacation-rentals', fallback: 'Villas & Stays' },
  { key: 'yachts', href: '/yachts', fallback: 'Yacht Rentals' },
  { key: 'cars', href: '/rentals', fallback: 'Car Rentals' },
  { extraKey: 'dining', href: '/restaurants-nightlife', fallback: 'Dining' },
  { key: 'events', href: '/events', fallback: 'Events & Entertainment' },
  { key: 'privateJets', href: '/private-jets', fallback: 'Private Jets' },
  { extraKey: 'tripRoom', href: '/trip', fallback: 'Trip Room' }
];

const company = [
  { key: 'partnerPortal', href: '/partner', fallback: 'Partner Portal' },
  { key: 'becomePartner', href: '/partner-agreement', fallback: 'Become a Partner' },
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
  const extraNav = getNavExtraCopy(locale);

  return (
    <footer className="mt-24 border-t border-g1-rule pb-10 pt-16 font-g1sans text-sm text-g1-soft">
      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-g1mono text-[0.75rem] uppercase tracking-[0.3em] text-g1-accent">Miami</span>
            <span className="font-g1display text-4xl font-medium tracking-tight text-g1-ink">Elio</span>
          </div>
          <p className="mt-4 max-w-sm leading-relaxed">
            {t.footer.desc}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-g1-ink">
            <Link href="/discovery" className="underline decoration-g1-rule underline-offset-4 transition hover:text-g1-accent">
              <LocalizedText source="ELIO+ Guide" />
            </Link>
            {managerTelegram && (
              <a href={managerTelegram} target="_blank" rel="noopener noreferrer" className="underline decoration-g1-rule underline-offset-4 transition hover:text-g1-accent">
                {t.ai?.liveManager}
              </a>
            )}
            {managerWhatsApp && (
              <a href={managerWhatsApp} target="_blank" rel="noopener noreferrer" className="underline decoration-g1-rule underline-offset-4 transition hover:text-g1-accent">
                {t.ai?.liveManagerWhatsApp}
              </a>
            )}
            {managerPhone && (
              <a href={managerPhone.href} className="underline decoration-g1-rule underline-offset-4 transition hover:text-g1-accent">
                {managerPhone.display}
              </a>
            )}
          </div>
          <GetTheApp variant="footer" />
        </div>

        <div>
          <p className="font-g1mono text-[0.65rem] uppercase tracking-[0.28em] text-g1-accent">{t.footer?.ecosystemTitle || <LocalizedText source={"Ecosystem"} />}</p>
          <ul className="mt-4 space-y-2.5">
            {sections.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-g1-ink">
                  {(item.extraKey && extraNav[item.extraKey]) || t.nav?.[({ shopping: 'stores' })[item.key] || item.key] || t.discovery?.[item.key] || item.fallback}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-g1mono text-[0.65rem] uppercase tracking-[0.28em] text-g1-accent">{t.footer?.companyTitle || <LocalizedText source={"Company"} />}</p>
          <ul className="mt-4 space-y-2.5">
            {company.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-g1-ink">
                  {item.key === 'signIn' ? t.auth.signInTab : t.footer?.[item.key] || t.home?.[item.key] || item.fallback}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-g1mono text-[0.65rem] uppercase tracking-[0.28em] text-g1-accent">{t.footer?.legalTitle || <LocalizedText source={"Legal"} />}</p>
          <ul className="mt-4 space-y-2.5">
            {legal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-g1-ink">
                  {t.footer?.[item.key] || item.fallback}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-14 flex flex-col gap-3 border-t border-g1-rule pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p>{t.footer.copyright}</p>
        <p className="font-g1mono text-[0.65rem] uppercase tracking-[0.28em]">{t.footer?.tagline || <LocalizedText source={"A unified luxury ecosystem"} />}</p>
      </div>
    </footer>
  );
}
