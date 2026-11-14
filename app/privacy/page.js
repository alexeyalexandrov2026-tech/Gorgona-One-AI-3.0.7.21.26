"use client";
import { useSavedText } from "../components/LocalizedText";

import { useLocale } from '../components/LocaleProvider';
import { getTranslation } from '../../lib/i18n';
import { PRIVACY_CONTACT_EMAIL, PRIVACY_SECTIONS, PRIVACY_UPDATED_LINE } from '../../lib/privacyPolicy';
import Link from 'next/link';

export default function PrivacyPage() {
  const msg = useSavedText();
  const locale = useLocale();
  const t = getTranslation(locale);
  return (
    <main className="min-w-0 flex-1 py-10 [overflow-wrap:anywhere]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{msg("Privacy")}</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{t.legal.privacyTitle}</h1>
        {locale !== 'en' && (
          <p className="mt-4 max-w-2xl text-zinc-300">
            {msg('This privacy policy is available in English only. The English text is the governing version.')}
          </p>
        )}
        <div lang="en" dir="ltr" className="mt-6 max-w-2xl text-left">
          <p className="text-sm text-zinc-500">{PRIVACY_UPDATED_LINE}</p>
          {PRIVACY_SECTIONS.map(section => (
            <section key={section.heading} className="mt-6">
              <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
              {section.items && (
                <ul className="mt-2 list-disc space-y-2 pl-5 text-zinc-400">
                  {section.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              )}
              {section.paragraphs?.map(paragraph => (
                <p key={paragraph} className="mt-2 text-zinc-400">{paragraph}</p>
              ))}
            </section>
          ))}
          <p className="mt-6 text-zinc-400">
            <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="underline">{PRIVACY_CONTACT_EMAIL}</a>
          </p>
        </div>
        <Link href="/account/delete" className="mt-4 inline-block underline">{msg('Request account deletion')}</Link>
      </div>
    </main>
  );
}
