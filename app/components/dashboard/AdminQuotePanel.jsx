"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSavedText } from '../LocalizedText';
import { submissionKey } from '../../../lib/bookingSubmission.mjs';
import { getCheckoutCopy } from '../../../lib/legal/checkoutCopy.mjs';
import { getBookingOsCopy } from '../../../lib/legal/bookingOsCopy.mjs';
import { getBookingStepBCopy } from '../../../lib/legal/bookingStepBCopy.mjs';
import { formatUsdCents } from '../../../lib/legal/termsContent.mjs';

const buttonClass =
  'min-h-[40px] rounded-lg border border-villa-obsidian/25 px-3 py-1.5 text-sm font-medium text-villa-obsidian transition hover:bg-villa-obsidian/5 disabled:opacity-50';
const inputClass =
  'min-h-[42px] w-full min-w-0 rounded-lg border border-villa-obsidian/25 bg-white/80 px-3 py-2 text-sm text-villa-obsidian';

const DEFAULT_POLICY =
  'Free cancellation up to 48 hours prior to scheduled service start; weather-related marine cancellations may be rescheduled or refunded in full.';

export default function AdminQuotePanel({ userId, locale, request, api, copilotDraft = null }) {
  const msg = useSavedText();
  const copy = getCheckoutCopy(locale);
  const osCopy = getBookingOsCopy(locale);
  const stepBCopy = getBookingStepBCopy(locale);
  const [quotes, setQuotes] = useState([]);
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const [supplierName, setSupplierName] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [serviceDates, setServiceDates] = useState(request?.dates || '');
  const [cancellationPolicy, setCancellationPolicy] = useState(DEFAULT_POLICY);
  const [notes, setNotes] = useState('');
  const [expiresHours, setExpiresHours] = useState('24');
  const [splitWays, setSplitWays] = useState('1');
  const [depositUsd, setDepositUsd] = useState('');
  const [priceLockUsd, setPriceLockUsd] = useState('');
  const [weatherShieldEnabled, setWeatherShieldEnabled] = useState(true);
  const [kycRequired, setKycRequired] = useState(false);
  const [lineItems, setLineItems] = useState([]);

  const attempt = useRef(null);

  useEffect(() => {
    setServiceDates(request?.dates || '');
  }, [request?.id, request?.dates]);

  useEffect(() => {
    if (!copilotDraft) return;
    setShowForm(true);
    if (copilotDraft.supplierName) setSupplierName(String(copilotDraft.supplierName));
    if (copilotDraft.amountUsd) setAmountUsd(String(copilotDraft.amountUsd));
    if (copilotDraft.depositUsd) setDepositUsd(String(copilotDraft.depositUsd));
    if (copilotDraft.splitWays) setSplitWays(String(copilotDraft.splitWays));
    if (typeof copilotDraft.kycRequired === 'boolean') setKycRequired(copilotDraft.kycRequired);
    if (typeof copilotDraft.weatherShieldEnabled === 'boolean') setWeatherShieldEnabled(copilotDraft.weatherShieldEnabled);
    if (Array.isArray(copilotDraft.lineItems)) setLineItems(copilotDraft.lineItems);
    if (copilotDraft.notes) setNotes(String(copilotDraft.notes));
  }, [copilotDraft]);

  const loadQuotes = useCallback(async () => {
    if (!userId || !request?.id) return;
    setLoading(true);
    setError('');
    try {
      const result = await api(userId, `/api/dashboard/quotes?bookingId=${encodeURIComponent(request.id)}`);
      setQuotes(Array.isArray(result.quotes) ? result.quotes : []);
      setProviders(result.providers || null);
    } catch {
      setError(copy.adminError);
    } finally {
      setLoading(false);
    }
  }, [userId, request?.id, api, copy.adminError]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  async function handleCreate(event) {
    event.preventDefault();
    if (busy) return;
    const numeric = Number(String(amountUsd).replace(/[^0-9.]/g, ''));
    const amountCents = Math.round(numeric * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100 || !supplierName.trim()) {
      setError(copy.adminError);
      return;
    }
    const depositNumeric = Number(String(depositUsd).replace(/[^0-9.]/g, '')) || 0;
    const depositCents = Math.max(0, Math.round(depositNumeric * 100));
    const priceLockNumeric = Number(String(priceLockUsd).replace(/[^0-9.]/g, '')) || 0;
    const priceLockCents = Math.max(0, Math.round(priceLockNumeric * 100));
    const parsedSplitWays = Math.max(1, Math.min(12, Number(splitWays) || 1));
    const cleanedLineItems = lineItems
      .map((item) => {
        const label = String(item.label || '').trim();
        const cents = Math.round((Number(String(item.amountUsd || '').replace(/[^0-9.-]/g, '')) || 0) * 100);
        return label && cents !== 0 ? { label, amountCents: cents, category: item.category || 'base' } : null;
      })
      .filter(Boolean);

    const payload = {
      bookingId: request.id,
      itemTitle: request.item_title || request.item_slug || 'Miami Elio Reservation',
      kind: ['car', 'yacht', 'stay', 'experience', 'dining', 'nightlife', 'jet'].includes(request.kind)
        ? request.kind
        : 'car',
      supplierName: supplierName.trim(),
      serviceDates: serviceDates.trim() || request.dates || 'Confirmed dates',
      cancellationPolicy: cancellationPolicy.trim() || DEFAULT_POLICY,
      notes: notes.trim(),
      amountCents,
      clientName: request.client_name || 'Guest',
      clientEmail: request.client_email || 'guest@gorgona-one.com',
      expiresHours: Math.max(1, Math.min(168, Number(expiresHours) || 24)),
      splitWays: parsedSplitWays,
      depositCents,
      priceLockCents,
      weatherShieldEnabled,
      kycRequired,
      lineItems: cleanedLineItems
    };

    attempt.current = submissionKey(attempt.current, JSON.stringify(payload));
    setBusy(true);
    setError('');
    try {
      await api(userId, '/api/dashboard/quotes', {
        method: 'POST',
        headers: { 'Idempotency-Key': attempt.current.key },
        body: JSON.stringify(payload)
      });
      attempt.current = null;
      setShowForm(false);
      setSupplierName('');
      setAmountUsd('');
      setNotes('');
      setSplitWays('1');
      setDepositUsd('');
      setPriceLockUsd('');
      setLineItems([]);
      await loadQuotes();
    } catch {
      setError(copy.adminError);
    } finally {
      setBusy(false);
    }
  }

  async function handleReleaseHold(quoteId, holdKind) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api(userId, '/api/dashboard/quotes/hold', {
        method: 'POST',
        body: JSON.stringify({ quoteId, holdKind })
      });
      await loadQuotes();
    } catch {
      setError(copy.adminError);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(quoteId) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api(userId, `/api/dashboard/quotes?id=${encodeURIComponent(quoteId)}`, {
        method: 'DELETE'
      });
      await loadQuotes();
    } catch {
      setError(copy.adminError);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(quote) {
    const url = `${window.location.origin}/pay/${quote.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(quote.id);
      setTimeout(() => setCopiedId((prev) => (prev === quote.id ? '' : prev)), 2500);
    } catch {
      window.prompt(copy.adminCopyLink, url);
    }
  }

  const gatewaySummary = providers
    ? `${copy.adminProviderStatus}: Stripe ${providers.stripe ? msg('Configured') : msg('Not configured')} · PayPal ${providers.paypal ? `${msg('Configured')} (${providers.paypalEnv})` : msg('Not configured')}`
    : '';

  return (
    <div className="mt-6 grid gap-4 border-t border-villa-obsidian/20 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <h4 className="font-medium text-villa-obsidian">{copy.adminHeading}</h4>
          <p className="text-xs text-villa-ash">{copy.adminSub}</p>
        </div>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setShowForm((prev) => !prev)}
          disabled={busy}
        >
          {showForm ? copy.adminHideForm : copy.adminNewButton}
        </button>
      </div>

      {gatewaySummary && (
        <p className="text-xs text-villa-ash">{gatewaySummary}</p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-xl border border-villa-obsidian/20 bg-white/70 p-4 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium text-villa-graphite">
            {copy.adminSupplier}
            <input
              className={inputClass}
              required
              maxLength={200}
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-villa-graphite">
            {copy.adminAmountUsd}
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="1"
              max="500000"
              required
              value={amountUsd}
              onChange={(event) => setAmountUsd(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-villa-graphite">
            {copy.adminDates}
            <input
              className={inputClass}
              required
              maxLength={300}
              value={serviceDates}
              onChange={(event) => setServiceDates(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-villa-graphite">
            {copy.adminExpiresHours}
            <input
              className={inputClass}
              type="number"
              min="1"
              max="168"
              required
              value={expiresHours}
              onChange={(event) => setExpiresHours(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-villa-graphite">
            {osCopy.adminSplitWays}
            <input
              className={inputClass}
              type="number"
              min="1"
              max="12"
              value={splitWays}
              onChange={(event) => setSplitWays(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-villa-graphite">
            {osCopy.adminDepositUsd}
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="0"
              max="500000"
              placeholder="0"
              value={depositUsd}
              onChange={(event) => setDepositUsd(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-villa-graphite">
            {osCopy.adminPriceLockUsd}
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="0"
              max="50000"
              placeholder="0"
              value={priceLockUsd}
              onChange={(event) => setPriceLockUsd(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium text-villa-graphite">
            <input
              type="checkbox"
              checked={weatherShieldEnabled}
              onChange={(event) => setWeatherShieldEnabled(event.target.checked)}
              className="h-4 w-4 accent-villa-obsidian"
            />
            <span>{osCopy.adminWeatherShield}</span>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium text-villa-graphite sm:col-span-2">
            <input
              type="checkbox"
              checked={kycRequired}
              onChange={(event) => setKycRequired(event.target.checked)}
              className="h-4 w-4 accent-villa-obsidian"
            />
            <span>{stepBCopy.adminKycRequired}</span>
          </label>
          <div className="grid gap-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-villa-graphite">{osCopy.adminLineItems}</span>
              <button
                type="button"
                className={buttonClass}
                onClick={() => setLineItems((prev) => (prev.length >= 12 ? prev : [...prev, { label: '', amountUsd: '', category: 'base' }]))}
              >
                {osCopy.adminAddLine}
              </button>
            </div>
            {lineItems.map((item, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                <input
                  className={inputClass}
                  placeholder={osCopy.adminLineLabel}
                  maxLength={120}
                  value={item.label}
                  onChange={(event) =>
                    setLineItems((prev) => prev.map((row, i) => (i === idx ? { ...row, label: event.target.value } : row)))
                  }
                />
                <input
                  className={inputClass}
                  type="number"
                  step="0.01"
                  placeholder={osCopy.adminLineAmount}
                  value={item.amountUsd}
                  onChange={(event) =>
                    setLineItems((prev) => prev.map((row, i) => (i === idx ? { ...row, amountUsd: event.target.value } : row)))
                  }
                />
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== idx))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <label className="grid gap-1 text-xs font-medium text-villa-graphite sm:col-span-2">
            {copy.adminCancelPolicy}
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              required
              maxLength={1000}
              value={cancellationPolicy}
              onChange={(event) => setCancellationPolicy(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-villa-graphite sm:col-span-2">
            {copy.adminNotes}
            <textarea
              className={`${inputClass} min-h-[60px] resize-y`}
              maxLength={1500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? copy.adminCreating : copy.adminCreateButton}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

      {!loading && quotes.length === 0 ? (
        <p className="text-xs text-villa-ash">{copy.adminEmpty}</p>
      ) : (
        <ul className="grid gap-2.5">
          {quotes.map((quote) => (
            <li key={quote.id} className="grid gap-2 rounded-xl border border-villa-obsidian/20 bg-white/60 p-3.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-villa-obsidian">{quote.referenceCode}</span>
                  <span className="font-medium text-villa-obsidian">{formatUsdCents(quote.amountCents)}</span>
                  <span className="text-xs text-villa-ash">· {quote.supplierName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded border border-villa-obsidian/20 px-2 py-0.5 uppercase">{quote.status}</span>
                  {quote.esignSignedAt && (
                    <span className="rounded border border-villa-obsidian/25 bg-white px-2 py-0.5">{copy.adminSignedTag}</span>
                  )}
                  {quote.status === 'paid' && (
                    <span className="rounded bg-villa-obsidian px-2 py-0.5 text-white">{copy.adminPaidTag}</span>
                  )}
                  {Number(quote.splitWays || 1) > 1 && (
                    <span className="rounded border border-villa-obsidian/25 bg-white px-2 py-0.5">
                      {osCopy.splitProgress}: {quote.paidSharesCount || 0}/{quote.splitWays}
                    </span>
                  )}
                  {Number(quote.depositCents || 0) > 0 && (
                    <span className="rounded border border-villa-obsidian/25 bg-white px-2 py-0.5">
                      {osCopy.adminHoldBadge}: {formatUsdCents(quote.depositCents)} ({quote.depositStatus})
                    </span>
                  )}
                  {Number(quote.priceLockCents || 0) > 0 && (
                    <span className="rounded border border-villa-obsidian/25 bg-white px-2 py-0.5">
                      {osCopy.adminLockBadge}: {quote.priceLockStatus}
                    </span>
                  )}
                  {quote.kycStatus && quote.kycStatus !== 'none' && (
                    <span className="rounded border border-villa-obsidian/25 bg-white px-2 py-0.5">
                      {quote.kycStatus === 'verified' ? stepBCopy.adminKycVerified : stepBCopy.adminKycPending}
                    </span>
                  )}
                  {quote.flightNumber && (
                    <span className="rounded border border-villa-obsidian/25 bg-white px-2 py-0.5">
                      {stepBCopy.adminFlightBadge}: {quote.flightNumber}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={buttonClass} onClick={() => handleCopy(quote)}>
                  {copiedId === quote.id ? copy.adminCopied : copy.adminCopyLink}
                </button>
                <a
                  href={`/pay/${quote.publicToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                >
                  {copy.adminOpenLink}
                </a>
                {quote.depositStatus === 'held' && (
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => handleReleaseHold(quote.id, 'deposit')}
                  >
                    {osCopy.adminReleaseDeposit}
                  </button>
                )}
                {quote.priceLockStatus === 'locked' && (
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => handleReleaseHold(quote.id, 'price_lock')}
                  >
                    {osCopy.adminReleaseLock}
                  </button>
                )}
                {quote.status !== 'paid' && quote.status !== 'cancelled' && (
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => handleCancel(quote.id)}
                  >
                    {copy.adminCancelQuote}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
