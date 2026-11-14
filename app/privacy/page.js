"use client";
import { useSavedText } from "../components/LocalizedText";

import { useLocale } from '../components/LocaleProvider';
import { getTranslation } from '../../lib/i18n';
import Link from 'next/link';

const CONTACT = 'support@gorgona-one.com';

function Section({ title, children }) {
  return (
    <section className="mt-8 max-w-2xl">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-zinc-400">{children}</div>
    </section>
  );
}

function List({ children }) {
  return <ul className="list-disc space-y-2 ps-5">{children}</ul>;
}

export default function PrivacyPage() {
  const msg = useSavedText();
  const t = getTranslation(useLocale());
  return (
    <main className="min-w-0 flex-1 py-10 [overflow-wrap:anywhere]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-premium">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-gold">{msg("Privacy")}</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{t.legal.privacyTitle}</h1>
        <p className="mt-2 text-sm text-zinc-500">{msg('Last updated: November 14, 2026')}</p>
        <p className="mt-4 max-w-2xl text-zinc-400">
          {msg('Miami Elio (gorgona-one.com and the Miami Elio Android app) is operated by ALEXEY AAA LOGISTICS LLC, doing business as Gorgona One AI, 250 174th St, Sunny Isles Beach, FL 33160-3323, USA. This policy explains what we collect, why, who processes it for us, how long we keep it and how you can delete it.')}
        </p>
        <p className="mt-4 max-w-2xl text-zinc-400">
          {msg('Questions about your data:')} <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>
        </p>

        <Section title={msg('What we collect')}>
          <List>
            <li>{msg('Account: your email address, a password stored by our sign-in provider in hashed form, and an account ID.')}</li>
            <li>{msg('Requests: when you ask to book a car, yacht, table or plan, we receive your name, email, phone number, dates, number of guests and any note you add.')}</li>
            <li>{msg('Favorites: the places and services you save while signed in.')}</li>
            <li>{msg('Concierge: the questions you type to the AI concierge are processed to suggest catalogue options and are not stored in our database.')}</li>
            <li>{msg('When you report a concierge answer, Miami Elio receives the question, answer and any note you add so our team can review it.')}</li>
            <li>{msg('Support requests, including account deletion requests.')}</li>
            <li>{msg('Technical data: our hosting provider processes your IP address to deliver and protect the service. We do not store it in our database; for rate limiting we keep only a keyed one-way hash of it.')}</li>
          </List>
          <p>{msg('We do not collect location, contacts, photos, files or payment details. The Android app contains no advertising, analytics or crash-reporting tools and does not use the advertising ID.')}</p>
          <p>{msg('Optional dictation uses your device’s speech recognition service. Depending on your device and language, that service may process your voice online.')}</p>
        </Section>

        <Section title={msg('How we use it')}>
          <p>{msg('We use this data to create and manage your account, pass your requests to our team and to the partner who fulfils them, keep your favorites in sync, answer concierge questions, review reported answers and protect the service from abuse.')}</p>
        </Section>

        <Section title={msg('Who processes data for us')}>
          <p>{msg('These service providers process data on our instructions: Cloudflare (hosting and the Workers AI concierge), Supabase (database and sign-in), Resend (email notifications to our team) and Telegram (request notifications to our team).')}</p>
          <p>{msg('When you send a booking request, we share the details needed to fulfil it with the partner who provides the service, such as a yacht or car company. Bookings and payments are then handled by that partner under its own terms. We do not sell personal data.')}</p>
        </Section>

        <Section title={msg('How long we keep it')}>
          <List>
            <li>{msg('Account and favorites: until you delete your account.')}</li>
            <li>{msg('Requests and plans: 24 months after the request date, then deleted or anonymized.')}</li>
            <li>{msg('Reported concierge answers: 12 months.')}</li>
            <li>{msg('AI usage records: up to 7 days.')}</li>
          </List>
        </Section>

        <Section title={msg('Deleting your data')}>
          <p>{msg('You can request deletion of your account on the account deletion page or by writing to us. We delete your account and favorites within 30 days of your request. Requests you sent before deletion, including the name, email and phone number in them, are kept for the period above for booking, accounting and legal purposes, and are then deleted or anonymized.')}</p>
          <Link href="/account/delete" className="inline-block underline">{msg('Request account deletion')}</Link>
        </Section>

        <Section title={msg('Your rights')}>
          <p>{msg('You can ask us for a copy of your data, to correct it or to delete it. Depending on where you live, for example in the EU, the UK or California, you may have further rights, including the right to complain to a data protection authority.')}</p>
        </Section>

        <Section title={msg('Children')}>
          <p>{msg('Miami Elio is intended for adults aged 18 and over and is not directed at children.')}</p>
        </Section>

        <Section title={msg('Cookies')}>
          <p>{msg('We use cookies only to remember your language and keep you signed in.')}</p>
        </Section>

        <Section title={msg('Changes to this policy')}>
          <p>{msg('If we change this policy, we will publish the new version on this page with a new date.')}</p>
        </Section>
      </div>
    </main>
  );
}
