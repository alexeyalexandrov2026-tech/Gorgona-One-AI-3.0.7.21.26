"use client";

import { useState } from 'react';
import Link from 'next/link';

export const SMS_CONSENT_TEXT =
  'I agree to receive booking confirmations, reservation updates, and customer service replies from Miami Elio (AAA Logistics LLC dba Miami Elio) at the mobile number I provide. Messages are sent from (833) 946-8811. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.';

export default function SmsOptInForm() {
  const [number, setNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    if (!consent || status === 'saving') return;
    setStatus('saving');
    setError('');
    try {
      const response = await fetch('/api/sms-opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: number, consent: true })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus('error');
        setError(data.error || 'We could not save your opt-in. Please check the number and try again.');
        return;
      }
      setStatus('done');
    } catch {
      setStatus('error');
      setError('We could not save your opt-in. Please try again.');
    }
  }

  if (status === 'done') {
    return (
      <div className="mt-8 rounded-2xl border border-g1-rule bg-g1-card/80 px-4 py-5 sm:px-5">
        <h2 className="text-xl font-semibold text-g1-ink">You are subscribed</h2>
        <p className="mt-3 text-g1-soft">
          You will receive booking confirmations, reservation updates, and customer service replies from (833) 946-8811. Reply STOP at any time to opt out.
        </p>
      </div>
    );
  }

  return (
    <form className="mt-8 rounded-2xl border border-g1-rule bg-g1-card/80 px-4 py-5 sm:px-5" onSubmit={onSubmit} noValidate>
      <h2 className="text-xl font-semibold text-g1-ink">Opt in to SMS</h2>
      <p className="mt-2 text-sm leading-relaxed text-g1-soft">
        Leave your mobile number and check the box below. The box starts unchecked. You can opt out at any time.
      </p>

      <label htmlFor="mobile-number" className="mt-5 block text-xs font-semibold uppercase tracking-[0.04em] text-g1-ink">
        Mobile number
      </label>
      <input
        id="mobile-number"
        name="mobile_number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+1 (___) ___-____"
        required
        value={number}
        onChange={(event) => setNumber(event.target.value)}
        className="mt-2 h-12 w-full max-w-sm rounded-xl border border-g1-rule bg-black/40 px-3 text-g1-ink outline-none focus:border-g1-accent focus:ring-2 focus:ring-g1-accent"
      />

      <div className="mt-4 flex items-start gap-3">
        <input
          id="sms-consent"
          name="sms_consent"
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-[22px] w-[22px] shrink-0 cursor-pointer accent-[#FF6E93]"
        />
        <label htmlFor="sms-consent" className="text-[0.95rem] leading-relaxed text-g1-ink">
          {SMS_CONSENT_TEXT} See our{' '}
          <Link href="/privacy" className="text-g1-accent underline underline-offset-2">Privacy Policy</Link>
          {' '}and{' '}
          <Link href="/terms" className="text-g1-accent underline underline-offset-2">Terms</Link>.
        </label>
      </div>

      <button
        type="submit"
        disabled={!consent || status === 'saving'}
        className="mt-5 inline-flex min-h-[46px] items-center justify-center rounded-full bg-g1-accent px-5 font-medium text-g1-on-accent transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {status === 'saving' ? 'Saving…' : 'Agree and subscribe'}
      </button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </form>
  );
}
