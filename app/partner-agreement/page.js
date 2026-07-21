"use client";

import { useLocale } from '../components/LocaleProvider';
import { getTranslation } from '../../lib/i18n';

export default function PartnerAgreementPage() {
  const t = getTranslation(useLocale());
  return (
    <main className="flex-1 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">Partner Agreement</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{t.legal.agreementTitle}</h1>
        <p className="mt-4 max-w-3xl text-zinc-400">{t.legal.agreementBody}</p>
      </div>
    </main>
  );
}
