import Link from 'next/link';
import SmsOptInForm from './SmsOptInForm';

const HELP_EMAIL = 'miami-elio@gorgona-one.com';

export default function SmsAlertsPage() {
  return (
    <main className="min-w-0 flex-1 py-10 font-g1sans text-g1-ink [overflow-wrap:anywhere]">
      <article className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-premium sm:p-8">
        <p className="font-g1mono text-[0.78rem] uppercase tracking-[0.3em] text-g1-accent">SMS alerts</p>
        <h1 className="mt-2 font-g1display text-[clamp(1.85rem,3vw,2.55rem)] font-medium leading-[1.15] tracking-[-0.02em] text-g1-ink">
          Text messages from Miami Elio
        </h1>
        <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-g1-soft">
          Miami Elio (gorgona-one.com) is operated by AAA Logistics LLC dba Miami Elio. Clients who opt in can receive business text messages about their bookings and requests from our toll-free number, (833) 946-8811. This is not a marketing program and is not used for personal messaging.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-g1-ink">What these messages are</h2>
        <p className="mt-3 text-g1-soft">If you opt in, Miami Elio (AAA Logistics LLC dba Miami Elio) may send you:</p>
        <ul className="mt-3 list-disc space-y-2 ps-5 text-g1-soft">
          <li>Booking confirmations for yachts, cars, stays, events, or other Miami Elio services</li>
          <li>Reservation updates, including time, date, or status changes</li>
          <li>Customer service replies about a request you already made</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-g1-soft">
          We do not use this program for promotions, advertising, or personal chats. Elio+ Guide answers stay on the website unless you have opted in and the message is about your booking or request.
        </p>

        <SmsOptInForm />

        <h2 className="mt-8 text-xl font-semibold text-g1-ink">How to stop or get help</h2>
        <p className="mt-3 text-g1-soft">
          Reply <code className="rounded bg-black/30 px-1.5 py-0.5 font-g1mono text-[0.9em] text-g1-ink">STOP</code> to any message to opt out. Reply <code className="rounded bg-black/30 px-1.5 py-0.5 font-g1mono text-[0.9em] text-g1-ink">HELP</code> for help, or write to{' '}
          <a href={`mailto:${HELP_EMAIL}`} className="text-g1-accent underline underline-offset-2">{HELP_EMAIL}</a>.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-g1-ink">Sample messages</h2>
        <p className="mt-3 rounded-2xl border border-g1-rule bg-black/25 px-4 py-3 text-g1-ink">Miami Elio: Your booking is confirmed for Nov 28. View details in your account. Reply STOP to opt out.</p>
        <p className="mt-3 rounded-2xl border border-g1-rule bg-black/25 px-4 py-3 text-g1-ink">Miami Elio: Your reservation was updated. New start time: 3:00 PM. Reply STOP to opt out.</p>
        <p className="mt-3 rounded-2xl border border-g1-rule bg-black/25 px-4 py-3 text-g1-ink">Miami Elio: We received your request and a specialist will reply shortly. Reply STOP to opt out. HELP for help.</p>

        <h2 className="mt-8 text-xl font-semibold text-g1-ink">Your mobile information</h2>
        <p className="mt-3 text-g1-soft">
          Mobile information and SMS opt-in data are not shared with third parties or affiliates for marketing or promotional purposes. We do not sell mobile numbers. See our{' '}
          <Link href="/privacy" className="text-g1-accent underline underline-offset-2">Privacy Policy</Link>
          {' '}and{' '}
          <Link href="/terms" className="text-g1-accent underline underline-offset-2">Terms</Link>.
        </p>
      </article>
    </main>
  );
}
