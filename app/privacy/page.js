"use client";
import { useSavedText } from "../components/LocalizedText";

import { useLocale } from '../components/LocaleProvider';
import { getTranslation } from '../../lib/i18n';
import Link from 'next/link';

export default function PrivacyPage() {
  const msg = useSavedText();
  const t = getTranslation(useLocale());
  return (
    <main className="min-w-0 flex-1 py-10 [overflow-wrap:anywhere]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{msg("Privacy")}</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{t.legal.privacyTitle}</h1>
        <p className="mt-4 max-w-2xl text-zinc-400">{t.legal.privacyBody}</p>
        <p className="mt-4 max-w-2xl text-zinc-400">{t.legal.conciergePrivacy}</p>
        <p className="mt-4 max-w-2xl text-zinc-400">
          {msg('When you report a concierge answer, Miami Elio receives the question, answer and any note you add so our team can review it.')}
        </p>
        <p className="mt-4 max-w-2xl text-zinc-400">
          {msg('Optional dictation uses your device’s speech recognition service. Depending on your device and language, that service may process your voice online.')}
        </p>
        <Link href="/account/delete" className="mt-4 inline-block underline">{msg('Request account deletion')}</Link>
      </div>
    </main>
  );
}
