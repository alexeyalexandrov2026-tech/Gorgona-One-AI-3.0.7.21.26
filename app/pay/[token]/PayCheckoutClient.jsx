"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../../components/LocaleProvider';
import { btn, eyebrowClass } from '../../components/g1/ui';
import Icon from '../../components/g1/icons';
import { getCheckoutCopy } from '../../../lib/legal/checkoutCopy.mjs';
import { getBookingOsCopy } from '../../../lib/legal/bookingOsCopy.mjs';
import { getBookingStepBCopy } from '../../../lib/legal/bookingStepBCopy.mjs';
import { generateQrMatrix, buildReservationIcs } from '../../../lib/legal/passArtifacts.mjs';
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

const AIRPORT_OPTIONS = [
  'MIA — Miami International Airport',
  'OPF — Opa-Locka Private FBO',
  'FLL — Fort Lauderdale Airport',
  'Miami Beach Marina',
  'Hotel / Private Villa'
];

function PassQrSvg({ value, label }) {
  const { size, grid } = generateQrMatrix(value);
  const quiet = 2;
  const total = size + quiet * 2;
  const cells = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (grid[r][c]) cells.push(`M${c + quiet},${r + quiet}h1v1h-1z`);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label={label}
      className="h-28 w-28 shrink-0 rounded-xl bg-white p-1.5 shadow-sm"
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path d={cells.join('')} fill="#111111" />
    </svg>
  );
}

export default function PayCheckoutClient({ token }) {
  const locale = useLocale();
  const copy = getCheckoutCopy(locale);
  const osCopy = getBookingOsCopy(locale);
  const stepBCopy = getBookingStepBCopy(locale);
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
  const [activeShareToken, setActiveShareToken] = useState('');
  const [payerName, setPayerName] = useState('');
  const [copiedShareToken, setCopiedShareToken] = useState('');
  const [startingKyc, setStartingKyc] = useState(false);
  const [flightNumber, setFlightNumber] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('MIA — Miami International Airport');
  const [arrivalTime, setArrivalTime] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [savingLogistics, setSavingLogistics] = useState(false);
  const [logisticsSaved, setLogisticsSaved] = useState(false);
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
      if (data?.quote?.flightNumber) setFlightNumber((prev) => prev || data.quote.flightNumber);
      if (data?.quote?.arrivalAirport) setArrivalAirport(data.quote.arrivalAirport);
      if (data?.quote?.arrivalTime) setArrivalTime((prev) => prev || data.quote.arrivalTime);
      if (data?.quote?.deliveryLocation) setDeliveryLocation((prev) => prev || data.quote.deliveryLocation);
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
    const kindParam = params.get('kind') || '';
    const shareParam = params.get('share') || '';
    const kycSessionId = params.get('kyc_session_id') || '';
    if (shareParam) setActiveShareToken(shareParam);
    if (params.get('cancelled') === '1') setCancelledBanner(true);

    const extraParams = new URLSearchParams();
    if (provider === 'stripe' && sessionId) {
      extraParams.set('provider', 'stripe');
      extraParams.set('session_id', sessionId);
      if (kindParam) extraParams.set('kind', kindParam);
      if (shareParam) extraParams.set('share', shareParam);
    }
    if (kycSessionId) extraParams.set('kyc_session_id', kycSessionId);
    const extra = extraParams.toString() ? `?${extraParams.toString()}` : '';

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
            body: JSON.stringify({ orderId: paypalOrderId, shareToken: shareParam || undefined })
          });
          if (!capRes.ok) {
            setPaymentError(copy.paymentError);
          } else {
            const cleanUrl = shareParam
              ? `/pay/${encodeURIComponent(token)}?share=${encodeURIComponent(shareParam)}`
              : `/pay/${encodeURIComponent(token)}`;
            window.history.replaceState({}, '', cleanUrl);
            await loadQuote('');
          }
        } catch {
          setPaymentError(copy.paymentError);
        } finally {
          setCapturingPayPal(false);
        }
      } else if (provider === 'stripe' && sessionId) {
        const cleanUrl = shareParam
          ? `/pay/${encodeURIComponent(token)}?share=${encodeURIComponent(shareParam)}`
          : `/pay/${encodeURIComponent(token)}`;
        window.history.replaceState({}, '', cleanUrl);
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

  async function handleStartPayment(provider, options = {}) {
    const checkoutKind = options.checkoutKind || 'main';
    const shareToken = options.shareToken || '';
    const actionKey = `${provider}:${checkoutKind}:${shareToken}`;
    if (payingProvider || capturingPayPal) return;
    setPaymentError('');
    setPayingProvider(actionKey);
    try {
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          checkoutKind,
          shareToken: shareToken || undefined,
          payerName: payerName.trim() || undefined
        })
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

  async function handleCopyShareLink(shareToken) {
    const url = `${window.location.origin}/pay/${encodeURIComponent(token)}?share=${encodeURIComponent(shareToken)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShareToken(shareToken);
      setTimeout(() => setCopiedShareToken((prev) => (prev === shareToken ? '' : prev)), 2500);
    } catch {
      window.prompt(osCopy.splitCopyLink, url);
    }
  }

  async function handleStartKyc() {
    if (startingKyc) return;
    setStartingKyc(true);
    setPaymentError('');
    try {
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      const data = await response.json().catch(() => ({}));
      if (data?.alreadyVerified) {
        await loadQuote('');
        setStartingKyc(false);
        return;
      }
      if (!response.ok || !data?.verificationUrl) {
        setPaymentError(copy.paymentError);
        setStartingKyc(false);
        return;
      }
      window.location.assign(data.verificationUrl);
    } catch {
      setPaymentError(copy.paymentError);
      setStartingKyc(false);
    }
  }

  async function handleSaveLogistics(event) {
    event.preventDefault();
    if (savingLogistics) return;
    setSavingLogistics(true);
    setLogisticsSaved(false);
    try {
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}/logistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightNumber: flightNumber.trim(),
          arrivalAirport: arrivalAirport.trim(),
          arrivalTime: arrivalTime.trim(),
          deliveryLocation: deliveryLocation.trim()
        })
      });
      if (response.ok) {
        setLogisticsSaved(true);
        await loadQuote('');
      }
    } finally {
      setSavingLogistics(false);
    }
  }

  function handleDownloadCalendar(quoteObj) {
    const passUrl = `${window.location.origin}/pay/${encodeURIComponent(token)}`;
    const ics = buildReservationIcs(quoteObj, passUrl);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(quoteObj.referenceCode || 'miami-elio-pass').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid justify-items-center gap-1.5">
                <PassQrSvg
                  value={`https://gorgona-one.com/pay/${token}`}
                  label={stepBCopy.passQrLabel}
                />
                <span className="font-g1mono text-[0.6rem] uppercase tracking-[0.12em] text-g1-soft">
                  {quote.referenceCode}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button
                  type="button"
                  data-download-ics="true"
                  onClick={() => handleDownloadCalendar(quote)}
                  className={`${btn.base} ${btn.ink} ${btn.sm}`}
                >
                  {stepBCopy.passCalendarButton}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`${btn.base} ${btn.ghost} ${btn.sm} border border-g1-ink/30`}
                >
                  {copy.printPassButton}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quote.kycStatus === 'verified' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-g1-accent/40 bg-g1-accent-wash px-3 py-1 font-g1mono text-[0.66rem] uppercase tracking-[0.12em] text-g1-ink">
                <Icon name="check" className="h-3 w-3" />
                {stepBCopy.passKycStamp}
              </span>
            )}
            {quote.flightNumber && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-g1-rule bg-g1-paper px-3 py-1 font-g1mono text-[0.66rem] uppercase tracking-[0.12em] text-g1-ink">
                {stepBCopy.passFlightStamp}: {quote.flightNumber}
                {quote.arrivalAirport ? ` · ${quote.arrivalAirport}` : ''}
              </span>
            )}
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

            {/* All-In Transparent Line-Item Breakdown */}
            {((Array.isArray(quote.lineItems) && quote.lineItems.length > 0) || Number(quote.depositCents || 0) > 0) && (
              <div data-allin-breakdown="true" className="grid gap-3 rounded-2xl border border-g1-rule bg-g1-paper p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-g1mono text-[0.72rem] uppercase tracking-[0.16em] text-g1-ink">
                    {osCopy.breakdownTitle}
                  </h3>
                  <span className="rounded-full border border-g1-accent/40 bg-g1-accent-wash px-2.5 py-0.5 font-g1mono text-[0.64rem] uppercase tracking-[0.12em] text-g1-ink">
                    {osCopy.breakdownBadge}
                  </span>
                </div>
                {Array.isArray(quote.lineItems) && quote.lineItems.length > 0 && (
                  <ul className="grid gap-2 border-t border-g1-rule/70 pt-3 text-sm">
                    {quote.lineItems.map((item, idx) => (
                      <li key={`${item.label}-${idx}`} className="flex items-baseline justify-between gap-3">
                        <span className="text-g1-soft">{item.label}</span>
                        <span className="shrink-0 font-g1mono text-g1-ink">{formatUsdCents(item.amountCents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-baseline justify-between gap-3 border-t border-g1-rule pt-3 text-sm font-medium text-g1-ink">
                  <span>{osCopy.breakdownTotalDue}</span>
                  <span className="font-g1mono text-base">{formatUsdCents(quote.amountCents)}</span>
                </div>
                {Number(quote.depositCents || 0) > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-g1-rule bg-g1-card px-3.5 py-2.5 text-xs">
                    <span className="text-g1-soft">{osCopy.breakdownDepositSeparate}</span>
                    <span className="font-g1mono font-medium text-g1-ink">
                      {formatUsdCents(quote.depositCents)} · {osCopy.depositZeroCharge}
                    </span>
                  </div>
                )}
              </div>
            )}
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

          {/* STEP 02: Verified Payment & Group Split-Pay Hub (Strictly locked until ESIGN signed) */}
          {!isPaid && !isInactive && (
            <section
              aria-labelledby="payment-step-heading"
              className={`grid gap-5 rounded-[24px] border p-6 sm:p-7 ${isSigned ? 'border-g1-ink/30 bg-g1-card' : 'border-g1-rule bg-g1-paper/60 opacity-80'}`}
            >
              <div className="grid gap-1.5">
                <p className="font-g1mono text-[0.72rem] uppercase tracking-[0.2em] text-g1-accent">
                  {Number(quote.splitWays || 1) > 1 ? osCopy.splitEyebrow : copy.step2Eyebrow}
                </p>
                <h2 id="payment-step-heading" className="font-g1display text-2xl font-medium text-g1-ink">
                  {Number(quote.splitWays || 1) > 1 ? osCopy.splitTitle : copy.step2Title}
                </h2>
              </div>

              {/* Group Split-Pay Progress Bar & Individual Share Links */}
              {Number(quote.splitWays || 1) > 1 && Array.isArray(quote.shares) && quote.shares.length > 0 && (
                <div data-split-pay-hub="true" className="grid gap-4 rounded-2xl border border-g1-rule bg-g1-paper p-4 sm:p-5">
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-g1-ink">
                        {osCopy.splitProgress}: {quote.paidSharesCount || 0} / {quote.splitWays}
                      </span>
                      <span className="font-g1mono text-xs text-g1-soft">
                        {formatUsdCents(quote.paidAmountCents || 0)} / {formatUsdCents(quote.amountCents)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-g1-rule/70">
                      <div
                        className="h-full rounded-full bg-g1-accent transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round(((quote.paidAmountCents || 0) / Math.max(1, quote.amountCents)) * 100))}%`
                        }}
                      />
                    </div>
                    <p className="text-xs leading-relaxed text-g1-soft">{osCopy.splitAutoUnlock}</p>
                  </div>

                  {activeShareToken && (
                    <p role="status" className="rounded-xl border border-g1-accent/40 bg-g1-accent-wash px-3.5 py-2 text-xs font-medium text-g1-ink">
                      {osCopy.splitActiveHint}
                    </p>
                  )}

                  {isSigned && (
                    <input
                      type="text"
                      maxLength={120}
                      value={payerName}
                      onChange={(event) => setPayerName(event.target.value)}
                      placeholder={osCopy.splitPayerName}
                      className={inputClass}
                    />
                  )}

                  <ul className="grid gap-3">
                    {quote.shares.map((share) => {
                      const isSharePaid = share.status === 'paid';
                      const isHighlighted = activeShareToken && activeShareToken === share.shareToken;
                      return (
                        <li
                          key={share.id || share.shareToken}
                          data-share-index={share.shareIndex}
                          className={`grid gap-3 rounded-2xl border p-4 ${
                            isHighlighted
                              ? 'border-g1-accent bg-g1-accent-wash/40'
                              : isSharePaid
                                ? 'border-g1-rule bg-g1-card/70'
                                : 'border-g1-rule bg-g1-card'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="grid gap-0.5">
                              <span className="text-sm font-medium text-g1-ink">
                                {osCopy.splitGuestLabel} #{share.shareIndex}
                                {share.payerName ? ` · ${share.payerName}` : ''}
                              </span>
                              <span className="font-g1mono text-sm font-medium text-g1-ink">
                                {formatUsdCents(share.amountCents)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-g1mono text-[0.65rem] uppercase tracking-[0.12em] ${
                                  isSharePaid
                                    ? 'border-g1-ink bg-g1-ink text-g1-paper'
                                    : 'border-g1-rule bg-g1-paper text-g1-soft'
                                }`}
                              >
                                {isSharePaid && <Icon name="check" className="h-3 w-3" />}
                                {isSharePaid ? osCopy.splitPaid : osCopy.splitOpen}
                              </span>
                              {!isSharePaid && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyShareLink(share.shareToken)}
                                  className={`${btn.base} ${btn.ghost} ${btn.sm} border border-g1-ink/30 bg-g1-paper/80 hover:border-g1-ink/60`}
                                >
                                  {copiedShareToken === share.shareToken ? osCopy.splitCopied : osCopy.splitCopyLink}
                                </button>
                              )}
                            </div>
                          </div>

                          {!isSharePaid && isSigned && anyGatewayReady && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {providers.stripe && (
                                <button
                                  type="button"
                                  disabled={Boolean(payingProvider)}
                                  onClick={() => handleStartPayment('stripe', { checkoutKind: 'share', shareToken: share.shareToken })}
                                  className={`${btn.base} ${btn.ink} ${btn.sm} w-full disabled:opacity-60`}
                                >
                                  {payingProvider === `stripe:share:${share.shareToken}` ? copy.redirectingPayment : osCopy.splitPayStripe}
                                </button>
                              )}
                              {providers.paypal && (
                                <button
                                  type="button"
                                  disabled={Boolean(payingProvider)}
                                  onClick={() => handleStartPayment('paypal', { checkoutKind: 'share', shareToken: share.shareToken })}
                                  className={`${btn.base} ${btn.ghost} ${btn.sm} w-full border border-g1-ink/30 bg-g1-paper/80 hover:border-g1-ink/60 disabled:opacity-60`}
                                >
                                  {payingProvider === `paypal:share:${share.shareToken}` ? copy.redirectingPayment : osCopy.splitPayPayPal}
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

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
              ) : (Number(quote.splitWays || 1) <= 1 || Number(quote.paidSharesCount || 0) === 0) ? (
                <div className="grid gap-3">
                  {Number(quote.splitWays || 1) > 1 && (
                    <p className="text-xs font-medium text-g1-soft">{osCopy.splitOrPayFull}</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {providers.stripe && (
                      <button
                        type="button"
                        disabled={Boolean(payingProvider)}
                        onClick={() => handleStartPayment('stripe', { checkoutKind: 'main' })}
                        className={`${btn.base} ${btn.ink} w-full disabled:opacity-60`}
                      >
                        {payingProvider === 'stripe:main:' ? copy.redirectingPayment : copy.payCardButton}
                      </button>
                    )}
                    {providers.paypal && (
                      <button
                        type="button"
                        disabled={Boolean(payingProvider)}
                        onClick={() => handleStartPayment('paypal', { checkoutKind: 'main' })}
                        className={`${btn.base} ${btn.ghost} w-full disabled:opacity-60`}
                      >
                        {payingProvider === 'paypal:main:' ? copy.redirectingPayment : copy.payPayPalButton}
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* 24-Hour Price Lock refundable hold */}
              {Number(quote.priceLockCents || 0) > 0 && (
                <div data-price-lock-card="true" className="grid gap-3 rounded-2xl border border-g1-rule bg-g1-paper p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="grid gap-0.5">
                      <p className="font-g1mono text-[0.68rem] uppercase tracking-[0.18em] text-g1-accent">
                        {osCopy.lockEyebrow}
                      </p>
                      <h3 className="text-base font-medium text-g1-ink">{osCopy.lockTitle}</h3>
                    </div>
                    <span className="font-g1mono text-sm font-medium text-g1-ink">
                      {formatUsdCents(quote.priceLockCents)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-g1-soft">{osCopy.lockBody}</p>
                  {quote.priceLockStatus === 'locked' ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-g1-accent/40 bg-g1-accent-wash px-3.5 py-2 text-xs font-medium text-g1-ink">
                      <span>{osCopy.lockActive}</span>
                      {quote.priceLockUntil && (
                        <span className="font-g1mono">{formatMiamiDateTime(quote.priceLockUntil, locale)}</span>
                      )}
                    </div>
                  ) : quote.priceLockStatus === 'released' ? (
                    <p className="font-g1mono text-xs uppercase text-g1-soft">{osCopy.lockReleased}</p>
                  ) : isSigned && providers.stripe ? (
                    <button
                      type="button"
                      disabled={Boolean(payingProvider)}
                      onClick={() => handleStartPayment('stripe', { checkoutKind: 'price_lock' })}
                      className={`${btn.base} ${btn.ghost} ${btn.sm} w-full border border-g1-ink/35 bg-g1-card hover:border-g1-ink/65 sm:w-auto disabled:opacity-60`}
                    >
                      {payingProvider === 'stripe:price_lock:' ? copy.redirectingPayment : `${osCopy.lockButton} · ${formatUsdCents(quote.priceLockCents)}`}
                    </button>
                  ) : null}
                </div>
              )}

              {paymentError && (
                <p role="alert" className="rounded-xl border border-g1-accent bg-g1-accent-wash px-3.5 py-2.5 text-sm text-g1-ink">
                  {paymentError}
                </p>
              )}
            </section>
          )}

          {/* Separate Refundable Security Deposit Pre-Auth (Hold Only — $0 Charged Upfront) */}
          {Number(quote.depositCents || 0) > 0 && !isInactive && (
            <section
              data-deposit-preauth-card="true"
              className="grid gap-4 rounded-[24px] border border-g1-rule bg-g1-card p-6 sm:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="font-g1mono text-[0.7rem] uppercase tracking-[0.2em] text-g1-accent">
                    {osCopy.depositEyebrow}
                  </p>
                  <h2 className="font-g1display text-2xl font-medium text-g1-ink">
                    {osCopy.depositTitle} · {formatUsdCents(quote.depositCents)}
                  </h2>
                </div>
                <span className="rounded-full border border-g1-accent/40 bg-g1-accent-wash px-3 py-1 font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-ink">
                  {quote.depositStatus === 'held'
                    ? osCopy.depositHeld
                    : quote.depositStatus === 'released'
                      ? osCopy.depositReleased
                      : osCopy.depositZeroCharge}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-g1-soft">{osCopy.depositBody}</p>
              {quote.depositStatus === 'pending' && (isSigned || isPaid) && providers.stripe && (
                <div>
                  <button
                    type="button"
                    disabled={Boolean(payingProvider)}
                    onClick={() => handleStartPayment('stripe', { checkoutKind: 'deposit' })}
                    className={`${btn.base} ${btn.ghost} w-full border border-g1-ink/35 bg-g1-paper/80 hover:border-g1-ink/65 sm:w-auto disabled:opacity-60`}
                  >
                    {payingProvider === 'stripe:deposit:' ? copy.redirectingPayment : `${osCopy.depositHoldButton} · ${formatUsdCents(quote.depositCents)}`}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Express 30-Sec Online KYC (Stripe Identity — ID / Driver's License + Selfie) */}
          {!isInactive && (quote.kycRequired || quote.kycStatus !== 'none' || isSigned || isPaid) && (
            <section
              data-kyc-card="true"
              className="grid gap-4 rounded-[24px] border border-g1-rule bg-g1-card p-6 sm:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="font-g1mono text-[0.7rem] uppercase tracking-[0.2em] text-g1-accent">
                    {stepBCopy.kycEyebrow}
                  </p>
                  <h2 className="font-g1display text-2xl font-medium text-g1-ink">
                    {stepBCopy.kycTitle}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-g1-accent/40 bg-g1-accent-wash px-3 py-1 font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-ink">
                  {quote.kycStatus === 'verified' && <Icon name="check" className="h-3 w-3" />}
                  {quote.kycStatus === 'verified'
                    ? stepBCopy.kycVerified
                    : quote.kycStatus === 'requires_input'
                      ? stepBCopy.kycRetry
                      : stepBCopy.kycPending}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-g1-soft">{stepBCopy.kycBody}</p>
              {quote.kycStatus !== 'verified' && providers.stripe && (
                <div>
                  <button
                    type="button"
                    disabled={startingKyc}
                    onClick={handleStartKyc}
                    className={`${btn.base} ${btn.ink} w-full sm:w-auto disabled:opacity-60`}
                  >
                    {startingKyc ? stepBCopy.kycStarting : stepBCopy.kycButton}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Flight-Synced Airport / FBO / Marina Delivery */}
          {!isInactive && (
            <section
              data-flight-sync-card="true"
              className="grid gap-4 rounded-[24px] border border-g1-rule bg-g1-card p-6 sm:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="font-g1mono text-[0.7rem] uppercase tracking-[0.2em] text-g1-accent">
                    {stepBCopy.flightEyebrow}
                  </p>
                  <h2 className="font-g1display text-2xl font-medium text-g1-ink">
                    {stepBCopy.flightTitle}
                  </h2>
                </div>
                {quote.flightNumber && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-g1-accent/40 bg-g1-accent-wash px-3 py-1 font-g1mono text-[0.68rem] uppercase tracking-[0.14em] text-g1-ink">
                    <Icon name="check" className="h-3 w-3" />
                    {stepBCopy.flightAutoSyncBadge}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-g1-soft">{stepBCopy.flightBody}</p>
              <form onSubmit={handleSaveLogistics} className="grid gap-3.5 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-medium text-g1-soft">
                  {stepBCopy.flightNumberLabel}
                  <input
                    type="text"
                    maxLength={32}
                    placeholder={stepBCopy.flightNumberPlaceholder}
                    value={flightNumber}
                    onChange={(event) => setFlightNumber(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-g1-soft">
                  {stepBCopy.airportLabel}
                  <select
                    value={arrivalAirport}
                    onChange={(event) => setArrivalAirport(event.target.value)}
                    className={inputClass}
                  >
                    {AIRPORT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-g1-soft">
                  {stepBCopy.arrivalTimeLabel}
                  <input
                    type="text"
                    maxLength={64}
                    placeholder={stepBCopy.arrivalTimeLabel}
                    value={arrivalTime}
                    onChange={(event) => setArrivalTime(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-g1-soft">
                  {stepBCopy.deliveryLabel}
                  <input
                    type="text"
                    maxLength={240}
                    placeholder={stepBCopy.deliveryPlaceholder}
                    value={deliveryLocation}
                    onChange={(event) => setDeliveryLocation(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={savingLogistics}
                    className={`${btn.base} ${btn.ink} ${btn.sm} disabled:opacity-60`}
                  >
                    {savingLogistics ? stepBCopy.flightSaving : stepBCopy.flightSaveButton}
                  </button>
                  {logisticsSaved && (
                    <span role="status" className="text-xs font-medium text-g1-accent">
                      {stepBCopy.flightSaved}
                    </span>
                  )}
                </div>
              </form>
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

          {quote.weatherShieldEnabled !== false && (
            <section data-weather-shield="true" className="grid gap-3 rounded-[24px] border border-g1-accent/35 bg-g1-card p-6">
              <p className="font-g1mono text-[0.68rem] uppercase tracking-[0.22em] text-g1-accent">
                {osCopy.weatherEyebrow}
              </p>
              <h2 className="font-g1display text-xl font-medium leading-tight text-g1-ink">
                {osCopy.weatherTitle}
              </h2>
              <p className="text-sm leading-relaxed text-g1-soft">{osCopy.weatherBody}</p>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-g1-accent/40 bg-g1-accent-wash px-3 py-1 font-g1mono text-[0.66rem] uppercase tracking-[0.14em] text-g1-ink">
                <Icon name="check" className="h-3 w-3" />
                {osCopy.weatherActive}
              </span>
            </section>
          )}

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
