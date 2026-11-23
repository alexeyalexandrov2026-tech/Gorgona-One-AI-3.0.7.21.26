"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../../components/LocaleProvider';
import { btn, eyebrowClass } from '../../components/g1/ui';
import Icon from '../../components/g1/icons';
import { getCheckoutCopy } from '../../../lib/legal/checkoutCopy.mjs';
import { formatUsdCents } from '../../../lib/legal/termsContent.mjs';

const inputClass =
  'min-h-[46px] w-full min-w-0 rounded-xl border border-g1-rule bg-g1-paper px-3.5 text-[1rem] text-g1-ink outline-none transition placeholder:text-g1-soft focus:border-g1-accent';

function formatMiamiDateTime(value, locale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale || 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York'
  }).format(date);
}

function statusMeta(status, copy) {
  switch (status) {
    case 'paid':
      return { label: copy.statusPaid, tone: 'border-g1-ink bg-g1-ink text-g1-paper' };
    case 'signed':
      return { label: copy.statusSigned, tone: 'border-g1-accent bg-g1-accent-wash text-g1-ink' };
    case 'expired':
      return { label: copy.statusExpired, tone: 'border-g1-rule bg-g1-paper text-g1-soft' };
    case 'cancelled':
      return { label: copy.statusCancelled, tone: 'border-g1-rule bg-g1-paper text-g1-soft' };
    default:
      return { label: copy.statusOpen, tone: 'border-g1-rule bg-g1-card text-g1-ink' };
  }
}

export default function PayCheckoutClient({ token }) {
  const locale = useLocale();
  const copy = getCheckoutCopy(locale);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelledBanner, setCancelledBanner] = useState(false);

  const [agencyChecked, setAgencyChecked] = useState(false);
  const [shieldChecked, setShieldChecked] = useState(false);
  const [fullName, setFullName] = useState('');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState('');

  const [payingProvider, setPayingProvider] = useState('');
  const [capturingPayPal, setCapturingPayPal] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const paypalCapturedRef = useRef(false);

  const loadQuote = useCallback(async (extraSearch = '') => {
    setLoading(true);
    setNotFound(false);
    try {
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}${extraSearch}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        setNotFound(true);
        setPayload(null);
        return null;
      }
      const data = await response.json();
      setPayload(data);
      if (data?.quote?.clientName) {
        setFullName((prev) => prev || data.quote.clientName);
      }
      return data;
    } catch {
      setNotFound(true);
      setPayload(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const provider = params.get('provider');
    const sessionId = params.get('session_id');
    const paypalOrderId = params.get('token');
    if (params.get('cancelled') === '1') setCancelledBanner(true);

    const extra = provider === 'stripe' && sessionId
      ? `?provider=stripe&session_id=${encodeURIComponent(sessionId)}`
      : '';

    loadQuote(extra).then(async (loaded) => {
      if (
        loaded?.quote?.status === 'signed' &&
        provider === 'paypal' &&
        paypalOrderId &&
        !paypalCapturedRef.current
      ) {
        paypalCapturedRef.current = true;
        setCapturingPayPal(true);
        setPaymentError('');
        try {
          const capRes = await fetch(`/api/pay/${encodeURIComponent(token)}/paypal-capture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: paypalOrderId })
          });
          if (!capRes.ok) {
            setPaymentError(copy.paymentError);
          } else {
            window.history.replaceState({}, '', `/pay/${encodeURIComponent(token)}`);
            await loadQuote('');
          }
        } catch {
          setPaymentError(copy.paymentError);
        } finally {
          setCapturingPayPal(false);
        }
      } else if (provider === 'stripe' && sessionId) {
        window.history.replaceState({}, '', `/pay/${encodeURIComponent(token)}`);
      }
    });
  }, [token, loadQuote, copy.paymentError]);

  async function handleSign(event) {
    event.preventDefault();
    if (signing) return;
    setSignError('');
    if (!agencyChecked || !shieldChecked || fullName.trim().length < 2) {
      setSignError(copy.signErrorMissing);
      return;
    }
    setSigning(true);
    try {
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          acceptedAgencyTerms: true,
          acceptedShieldTerms: true
        })
      });
      if (!response.ok) {
        setSignError(copy.signErrorFailed);
        return;
      }
      await loadQuote('');
    } catch {
      setSignError(copy.signErrorFailed);
    } finally {
      setSigning(false);
    }
  }

  async function handleStartPayment(provider) {
    if (payingProvider || capturingPayPal) return;
    setPaymentError('');
    setPayingProvider(provider);
    try {
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.checkoutUrl) {
        setPaymentError(copy.paymentError);
        setPayingProvider('');
        return;
      }
      window.location.assign(data.checkoutUrl);
    } catch {
      setPaymentError(copy.paymentError);
      setPayingProvider('');
    }
  }

  if (loading && !payload) {
    return (
      <main className="mx-auto min-w-0 w-full max-w-4xl flex-1 py-12 font-g1sans text-g1-ink">
        <div role="status" className="rounded-[24px] border border-g1-rule bg-g1-card p-8 text-g1-soft">
          {copy.loadingQuote}
        </div>
      </main>
    );
  }

  if (notFound || !payload?.quote) {
    return (
      <main className="mx-auto min-w-0 w-full max-w-3xl flex-1 py-12 font-g1sans text-g1-ink">
        <div className="grid gap-5 rounded-[24px] border border-g1-rule bg-g1-card p-8 sm:p-10">
          <p className={eyebrowClass}>{copy.payEyebrow}</p>
          <h1 className="font-g1display text-3xl font-medium text-g1-ink sm:text-4xl">{copy.notFoundTitle}</h1>
          <p className="max-w-[58ch] text-[1rem] leading-relaxed text-g1-soft">{copy.notFoundBody}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/" className={`${btn.base} ${btn.ink} ${btn.sm}`}>
              {copy.backHome}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { quote, esignClauses = [], providers = {}, chatContacts = {}, confirmedSupport } = payload;
  const badge = statusMeta(quote.status, copy);
  const isPaid = quote.status === 'paid';
  const isSigned = quote.status === 'signed';
  const isOpen = quote.status === 'open';
  const isInactive = quote.status === 'expired' || quote.status === 'cancelled';
  const anyGatewayReady = Boolean(providers.stripe || providers.paypal);

  return (
    <main className="mx-auto min-w-0 w-full max-w-5xl flex-1 py-8 font-g1sans text-g1-ink sm:py-12 [overflow-wrap:anywhere]">
      {/* Editorial header */}
      <header className="grid gap-4 border-b border-g1-rule pb-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={eyebrowClass}>{copy.payEyebrow}</p>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-g1mono text-[0.72rem] uppercase tracking-[0.14em] ${badge.tone}`}>
            {isPaid && <Icon name="check" className="h-3.5 w-3.5" />}
            {badge.label}
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <h1 className="g1-display font-g1display text-[clamp(2rem,3.2vw+0.8rem,3.4rem)] font-medium leading-[1.04] text-g1-ink">
              {quote.itemTitle}
            </h1>
            <p className="font-g1mono text-[0.78rem] uppercase tracking-[0.16em] text-g1-soft">
              {copy.referenceLabel}: {quote.referenceCode}
            </p>
          </div>
          <div className="grid text-start sm:text-end">
            <span className="font-g1mono text-[0.68rem] uppercase tracking-[0.16em] text-g1-soft">{copy.totalLabel}</span>
            <span className="font-g1display text-3xl font-medium text-g1-ink sm:text-4xl">
              {formatUsdCents(quote.amountCents)}
            </span>
          </div>
        </div>
      </header>

      {cancelledBanner && !isPaid && !isInactive && (
        <div role="status" className="mt-6 rounded-2xl border border-g1-rule bg-g1-card px-5 py-4 text-sm text-g1-ink">
          {copy.paymentCancelledBanner}
        </div>
      )}

      {quote.status === 'expired' && (
        <div role="alert" className="mt-6 rounded-2xl border border-g1-accent bg-g1-accent-wash px-5 py-4 text-sm text-g1-ink">
          {copy.expiredNotice}
        </div>
      )}

      {quote.status === 'cancelled' && (
        <div role="alert" className="mt-6 rounded-2xl border border-g1-rule bg-g1-card px-5 py-4 text-sm text-g1-soft">
          {copy.cancelledNotice}
        </div>
      )}

      {/* CONFIRMED RESERVATION PASS — shown strictly after verified payment */}
      {isPaid && (
        <section
          aria-labelledby="confirmed-pass-heading"
          className="mt-8 grid gap-6 rounded-[26px] border border-g1-ink/30 bg-g1-card p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-g1-rule pb-5">
            <div className="grid gap-2">
              <p className="font-g1mono text-[0.72rem] uppercase tracking-[0.22em] text-g1-accent">
                {copy.passEyebrow}
              </p>
              <h2 id="confirmed-pass-heading" className="font-g1display text-3xl font-medium text-g1-ink">
                {copy.passTitle}
              </h2>
              <p className="max-w-[60ch] text-sm leading-relaxed text-g1-soft">{copy.passSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className={`${btn.base} ${btn.ghost} ${btn.sm} print:hidden`}
            >
              {copy.printPassButton}
            </button>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1">
              <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.14em] text-g1-soft">{copy.paidAtLabel}</dt>
              <dd className="text-sm font-medium text-g1-ink">{formatMiamiDateTime(quote.paidAt, locale)}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.14em] text-g1-soft">{copy.paymentMethodLabel}</dt>
              <dd className="text-sm font-medium uppercase text-g1-ink">{quote.paymentProvider || '—'}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.14em] text-g1-soft">{copy.receiptLabel}</dt>
              <dd className="font-g1mono text-xs text-g1-ink">{quote.providerPaymentId || quote.referenceCode}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.14em] text-g1-soft">{copy.shieldEyebrow}</dt>
              <dd className="text-sm font-medium text-g1-accent">{copy.shieldActiveStamp}</dd>
            </div>
          </dl>

          {/* Private 24/7 Direct Phone Line — rendered EXCLUSIVELY when status === 'paid' */}
          <div className="grid gap-3 rounded-2xl border border-g1-accent/45 bg-g1-paper p-5 sm:flex sm:items-center sm:justify-between">
            <div className="grid gap-1">
              <p className="font-g1mono text-[0.7rem] uppercase tracking-[0.18em] text-g1-accent">
                {copy.directLineTitle}
              </p>
              <p className="text-sm text-g1-soft">
                {confirmedSupport?.phoneHref ? copy.directLineSubtitle : copy.directLinePending}
              </p>
              {confirmedSupport?.phoneDisplay && (
                <p className="mt-1 font-g1mono text-lg font-medium text-g1-ink">
                  {confirmedSupport.phoneDisplay}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {confirmedSupport?.phoneHref && (
                <a href={confirmedSupport.phoneHref} className={`${btn.base} ${btn.ink} ${btn.sm}`}>
                  {copy.directLineCallCta}
                </a>
              )}
              {chatContacts.telegram && (
                <a href={chatContacts.telegram} target="_blank" rel="noopener noreferrer" className={`${btn.base} ${btn.ghost} ${btn.sm}`}>
                  {copy.chatTelegram}
                </a>
              )}
              {chatContacts.whatsapp && (
                <a href={chatContacts.whatsapp} target="_blank" rel="noopener noreferrer" className={`${btn.base} ${btn.ghost} ${btn.sm}`}>
                  {copy.chatWhatsApp}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Main 2-column editorial layout */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid min-w-0 gap-8">
          {/* Quote breakdown */}
          <section className="grid gap-5 rounded-[24px] border border-g1-rule bg-g1-card p-6 sm:p-7">
            <h2 className="font-g1display text-2xl font-medium text-g1-ink">{copy.quoteSummaryTitle}</h2>
            <dl className="grid gap-4 border-t border-g1-rule pt-5 sm:grid-cols-2">
              <div className="grid gap-1">
                <dt className="font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-soft">{copy.supplierLabel}</dt>
                <dd className="text-[0.98rem] font-medium text-g1-ink">{quote.supplierName}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-soft">{copy.datesLabel}</dt>
                <dd className="text-[0.98rem] font-medium text-g1-ink">{quote.serviceDates}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-soft">{copy.clientLabel}</dt>
                <dd className="text-[0.95rem] text-g1-ink">{quote.clientName} · {quote.clientEmail}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-soft">{copy.validUntilLabel}</dt>
                <dd className="text-[0.95rem] text-g1-ink">{formatMiamiDateTime(quote.expiresAt, locale)}</dd>
              </div>
              <div className="grid gap-1 sm:col-span-2">
                <dt className="font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-soft">{copy.cancellationLabel}</dt>
                <dd className="text-sm leading-relaxed text-g1-ink">{quote.cancellationPolicy}</dd>
              </div>
              {quote.notes && (
                <div className="grid gap-1 sm:col-span-2">
                  <dt className="font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-soft">{copy.notesLabel}</dt>
                  <dd className="whitespace-pre-wrap text-sm leading-relaxed text-g1-soft">{quote.notes}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* STEP 01: ESIGN Electronic Agreement */}
          <section
            aria-labelledby="esign-step-heading"
            className="grid gap-5 rounded-[24px] border border-g1-rule bg-g1-card p-6 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1.5">
                <p className="font-g1mono text-[0.72rem] uppercase tracking-[0.2em] text-g1-accent">
                  {copy.step1Eyebrow}
                </p>
                <h2 id="esign-step-heading" className="font-g1display text-2xl font-medium text-g1-ink">
                  {copy.step1Title}
                </h2>
                {isOpen && <p className="text-sm text-g1-soft">{copy.step1Subtitle}</p>}
              </div>
              {(isSigned || isPaid) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-g1-accent/40 bg-g1-accent-wash px-3 py-1 font-g1mono text-[0.7rem] uppercase tracking-[0.14em] text-g1-ink">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  {copy.signedBadge}
                </span>
              )}
            </div>

            <div className="grid max-h-[340px] gap-4 overflow-y-auto rounded-2xl border border-g1-rule bg-g1-paper p-5 text-sm leading-relaxed text-g1-soft">
              {esignClauses.map((clause) => (
                <article key={clause.id} className="grid gap-1 border-b border-g1-rule/70 pb-3.5 last:border-b-0 last:pb-0">
                  <h3 className="font-medium text-g1-ink">{clause.title}</h3>
                  <p>{clause.body}</p>
                </article>
              ))}
            </div>

            {(isSigned || isPaid) ? (
              <dl className="grid gap-3 rounded-2xl border border-g1-rule bg-g1-paper p-4 text-sm sm:grid-cols-3">
                <div className="grid gap-1">
                  <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.12em] text-g1-soft">{copy.signedByLabel}</dt>
                  <dd className="font-medium text-g1-ink">{quote.esignFullName}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.12em] text-g1-soft">{copy.signedAtLabel}</dt>
                  <dd className="text-g1-ink">{formatMiamiDateTime(quote.esignSignedAt, locale)}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="font-g1mono text-[0.66rem] uppercase tracking-[0.12em] text-g1-soft">{copy.hashLabel}</dt>
                  <dd className="font-g1mono text-xs text-g1-soft">
                    {quote.esignDocumentHash ? `${quote.esignDocumentHash.slice(0, 18)}…` : '—'}
                  </dd>
                </div>
              </dl>
            ) : !isInactive ? (
              <form onSubmit={handleSign} className="grid gap-4 border-t border-g1-rule pt-5">
                <label className="flex items-start gap-3 text-sm leading-relaxed text-g1-ink">
                  <input
                    type="checkbox"
                    required
                    checked={agencyChecked}
                    onChange={(event) => setAgencyChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-g1-ink"
                  />
                  <span>{copy.checkAgency}</span>
                </label>
                <label className="flex items-start gap-3 text-sm leading-relaxed text-g1-ink">
                  <input
                    type="checkbox"
                    required
                    checked={shieldChecked}
                    onChange={(event) => setShieldChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-g1-ink"
                  />
                  <span>{copy.checkShield}</span>
                </label>
                <label className="grid gap-1.5 text-[0.82rem] font-medium text-g1-soft">
                  {copy.fullNameLabel}
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    placeholder={copy.fullNamePlaceholder}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className={inputClass}
                  />
                </label>
                {signError && (
                  <p role="alert" className="rounded-xl border border-g1-accent bg-g1-accent-wash px-3.5 py-2.5 text-sm text-g1-ink">
                    {signError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={signing}
                  className={`${btn.base} ${btn.ink} w-full disabled:opacity-60`}
                >
                  {signing ? copy.signingButton : copy.signButton}
                </button>
              </form>
            ) : null}
          </section>

          {/* STEP 02: Verified Payment (Strictly locked until ESIGN signed) */}
          {!isPaid && !isInactive && (
            <section
              aria-labelledby="payment-step-heading"
              className={`grid gap-5 rounded-[24px] border p-6 sm:p-7 ${isSigned ? 'border-g1-ink/30 bg-g1-card' : 'border-g1-rule bg-g1-paper/60 opacity-80'}`}
            >
              <div className="grid gap-1.5">
                <p className="font-g1mono text-[0.72rem] uppercase tracking-[0.2em] text-g1-accent">
                  {copy.step2Eyebrow}
                </p>
                <h2 id="payment-step-heading" className="font-g1display text-2xl font-medium text-g1-ink">
                  {copy.step2Title}
                </h2>
              </div>

              {!isSigned ? (
                <p className="rounded-2xl border border-dashed border-g1-rule bg-g1-paper px-4 py-3.5 text-sm text-g1-soft">
                  {copy.step2Locked}
                </p>
              ) : capturingPayPal ? (
                <p role="status" className="rounded-2xl border border-g1-rule bg-g1-paper px-4 py-4 text-sm text-g1-ink">
                  {copy.capturingPayPal}
                </p>
              ) : !anyGatewayReady ? (
                <div className="grid gap-4 rounded-2xl border border-g1-rule bg-g1-paper p-5">
                  <p className="text-sm leading-relaxed text-g1-ink">{copy.providerPendingConfig}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {chatContacts.telegram && (
                      <a href={chatContacts.telegram} target="_blank" rel="noopener noreferrer" className={`${btn.base} ${btn.ink} ${btn.sm}`}>
                        {copy.chatTelegram}
                      </a>
                    )}
                    {chatContacts.whatsapp && (
                      <a href={chatContacts.whatsapp} target="_blank" rel="noopener noreferrer" className={`${btn.base} ${btn.ghost} ${btn.sm}`}>
                        {copy.chatWhatsApp}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {providers.stripe && (
                    <button
                      type="button"
                      disabled={Boolean(payingProvider)}
                      onClick={() => handleStartPayment('stripe')}
                      className={`${btn.base} ${btn.ink} w-full disabled:opacity-60`}
                    >
                      {payingProvider === 'stripe' ? copy.redirectingPayment : copy.payCardButton}
                    </button>
                  )}
                  {providers.paypal && (
                    <button
                      type="button"
                      disabled={Boolean(payingProvider)}
                      onClick={() => handleStartPayment('paypal')}
                      className={`${btn.base} ${btn.ghost} w-full disabled:opacity-60`}
                    >
                      {payingProvider === 'paypal' ? copy.redirectingPayment : copy.payPayPalButton}
                    </button>
                  )}
                </div>
              )}

              {paymentError && (
                <p role="alert" className="rounded-xl border border-g1-accent bg-g1-accent-wash px-3.5 py-2.5 text-sm text-g1-ink">
                  {paymentError}
                </p>
              )}
            </section>
          )}
        </div>

        {/* Right rail: ELIO+ Shield & Care 24/7 + Chat-only specialist support */}
        <aside className="grid gap-6 lg:sticky lg:top-24">
          <section className="grid gap-4 rounded-[24px] border border-g1-rule bg-g1-card p-6">
            <p className="font-g1mono text-[0.7rem] uppercase tracking-[0.22em] text-g1-accent">
              {copy.shieldEyebrow}
            </p>
            <h2 className="font-g1display text-2xl font-medium leading-tight text-g1-ink">
              {copy.shieldTitle}
            </h2>
            <ul className="grid gap-3 border-t border-g1-rule pt-4 text-sm leading-relaxed text-g1-soft">
              <li className="flex items-start gap-2.5">
                <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-g1-accent" />
                <span>{copy.shieldP1}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-g1-accent" />
                <span>{copy.shieldP2}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-g1-accent" />
                <span>{copy.shieldP3}</span>
              </li>
            </ul>
            <p className="border-t border-g1-rule pt-3 text-xs leading-relaxed text-g1-soft">
              {copy.shieldLegalNote}
            </p>
          </section>

          <section className="grid gap-3 rounded-[24px] border border-g1-rule bg-g1-paper p-6">
            <p className="text-sm font-medium text-g1-ink">{copy.chatTitle}</p>
            <div className="grid gap-2.5">
              {chatContacts.telegram && (
                <a href={chatContacts.telegram} target="_blank" rel="noopener noreferrer" className={`${btn.base} ${btn.ghost} ${btn.sm} w-full`}>
                  {copy.chatTelegram}
                </a>
              )}
              {chatContacts.whatsapp && (
                <a href={chatContacts.whatsapp} target="_blank" rel="noopener noreferrer" className={`${btn.base} ${btn.ghost} ${btn.sm} w-full`}>
                  {copy.chatWhatsApp}
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-g1-rule pt-3 text-xs text-g1-soft">
              <Link href="/terms" className="underline hover:text-g1-ink">{copy.termsLink}</Link>
              <Link href="/privacy" className="underline hover:text-g1-ink">{copy.privacyLink}</Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
