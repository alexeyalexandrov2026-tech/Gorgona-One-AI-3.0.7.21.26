"use client";

import Link from 'next/link';
import { useSavedText } from '../components/LocalizedText';
import { useLocale } from '../components/LocaleProvider';
import { getTranslation } from '../../lib/i18nClient';
import { btn, eyebrowClass } from '../components/g1/ui';
import { getCheckoutCopy } from '../../lib/legal/checkoutCopy.mjs';
import {
  LEGAL_ADDRESS,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY,
  TERMS_EFFECTIVE_DATE,
  TERMS_SECTIONS,
  TERMS_VERSION
} from '../../lib/legal/termsContent.mjs';

export default function TermsPage() {
  const msg = useSavedText();
  const locale = useLocale();
  const t = getTranslation(locale);
  const copy = getCheckoutCopy(locale);

  return (
    <main className="mx-auto min-w-0 w-full max-w-4xl flex-1 py-10 font-g1sans text-g1-ink sm:py-14 [overflow-wrap:anywhere]">
      <header className="grid gap-4 border-b border-g1-rule pb-8">
        <p className={eyebrowClass}>{msg('Terms')}</p>
        <h1 className="g1-display font-g1display text-[clamp(2.1rem,3.4vw+0.8rem,3.6rem)] font-medium leading-[1.04] text-g1-ink">
          {t.legal.termsTitle}
        </h1>
        <p className="max-w-[64ch] text-[1.04rem] leading-relaxed text-g1-soft">{t.legal.termsBody}</p>
        <dl className="mt-2 grid gap-3 border-t border-g1-rule pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.14em] text-g1-soft">{copy.effectiveLabel}</dt>
            <dd className="mt-0.5 font-medium text-g1-ink">{TERMS_EFFECTIVE_DATE}</dd>
          </div>
          <div>
            <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.14em] text-g1-soft">{copy.versionLabel}</dt>
            <dd className="mt-0.5 font-g1mono text-xs text-g1-ink">{TERMS_VERSION}</dd>
          </div>
          <div>
            <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.14em] text-g1-soft">{copy.entityLabel}</dt>
            <dd className="mt-0.5 text-g1-ink">{LEGAL_ENTITY}</dd>
          </div>
        </dl>
        {locale !== 'en' && (
          <p className="rounded-2xl border border-g1-rule bg-g1-card px-4 py-3 text-xs leading-relaxed text-g1-soft">
            {copy.englishLegalNote}
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-8">
        {TERMS_SECTIONS.map((section) => (
          <section key={section.id} className="grid gap-3 border-b border-g1-rule/70 pb-7 last:border-b-0">
            <h2 className="font-g1display text-2xl font-medium text-g1-ink">{section.title}</h2>
            <div className="grid gap-3 text-[0.96rem] leading-relaxed text-g1-soft">
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-g1-rule pt-6 text-sm text-g1-soft">
        <div className="grid gap-1">
          <p>{LEGAL_ENTITY} · {LEGAL_ADDRESS}</p>
          <p>
            {copy.contactLabel}:{' '}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline text-g1-ink hover:text-g1-accent">
              {LEGAL_CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <Link href="/" className={`${btn.base} ${btn.ghost} ${btn.sm}`}>
          {copy.backHome}
        </Link>
      </footer>
    </main>
  );
}
