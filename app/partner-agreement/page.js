"use client";
import { useSavedText } from "../components/LocalizedText";

import Link from 'next/link';
import { useLocale } from '../components/LocaleProvider';
import { getTranslation } from '../../lib/i18n';

export default function PartnerAgreementPage() {
  const msg = useSavedText();
  const t = getTranslation(useLocale());
  return (
    <main className="min-w-0 flex-1 py-10 [overflow-wrap:anywhere]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{msg("Partner Agreement")}</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{t.legal.agreementTitle}</h1>
        <p className="mt-4 max-w-3xl text-zinc-400">{t.legal.agreementBody}</p>
        {/* "Become a Partner" in the footer opens this page; it must lead on to the partner sign-up. */}
        <Link href="/register/partner" className="mt-6 inline-block text-sm text-brand-gold hover:underline">{t.footer.becomePartner}</Link>
      </div>
    </main>
  );
}
