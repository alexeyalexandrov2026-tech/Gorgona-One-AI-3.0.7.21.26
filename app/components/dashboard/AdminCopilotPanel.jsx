"use client";

import { useState } from 'react';
import { getCopilotCopy } from '../../../lib/ai/copilotCopy.mjs';

const btnClass =
  'min-h-[38px] rounded-lg border border-villa-obsidian/25 bg-white/80 px-3 py-1.5 text-xs font-medium text-villa-obsidian transition hover:bg-villa-obsidian/10 disabled:opacity-50';
const primaryBtnClass =
  'min-h-[38px] rounded-lg bg-villa-obsidian px-3.5 py-1.5 text-xs font-medium text-villa-parchment transition hover:opacity-90 disabled:opacity-50';

export default function AdminCopilotPanel({ userId, locale, request, api, onInsertReply, onApplyQuote }) {
  const copy = getCopilotCopy(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!userId || !request?.id) return null;

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(false);
    setApplied(false);
    try {
      const result = await api(userId, '/api/dashboard/copilot', {
        method: 'POST',
        body: JSON.stringify({ bookingId: request.id })
      });
      setDraft(result);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function copyDraftText() {
    if (!draft?.replyDraft) return;
    try {
      await navigator.clipboard.writeText(draft.replyDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  function applyQuoteDraft() {
    if (!draft?.quoteDraft || !onApplyQuote) return;
    onApplyQuote(draft.quoteDraft);
    setApplied(true);
  }

  return (
    <div
      data-admin-copilot="true"
      className="mt-6 rounded-xl border border-villa-obsidian/25 bg-white/75 p-4 text-villa-obsidian shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-wide text-villa-charcoal">{copy.copilotTitle}</p>
          <p className="mt-0.5 text-xs text-villa-ash">{copy.copilotSubtitle}</p>
        </div>
        <button type="button" onClick={generate} disabled={busy} className={primaryBtnClass}>
          {busy ? copy.generating : draft ? copy.regenerate : copy.generateBtn}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-700">
          {copy.copilotError}
        </p>
      )}

      {draft && (
        <div className="mt-4 grid gap-4 border-t border-villa-obsidian/15 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-villa-ash">
            <span>{copy.detectedLang}:</span>
            <span className="rounded-full border border-villa-obsidian/20 bg-villa-parchment px-2.5 py-0.5 font-mono uppercase text-villa-obsidian">
              {String(draft.clientLanguage || 'en').toUpperCase()}
            </span>
          </div>

          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-villa-ash">{copy.replyDraftLabel}</p>
            <div className="rounded-lg border border-villa-obsidian/15 bg-villa-parchment/70 p-3 text-sm leading-relaxed text-villa-obsidian whitespace-pre-wrap">
              {draft.replyDraft}
            </div>
            <div className="flex flex-wrap gap-2">
              {onInsertReply && (
                <button type="button" onClick={() => onInsertReply(draft.replyDraft)} className={primaryBtnClass}>
                  {copy.insertReply}
                </button>
              )}
              <button type="button" onClick={copyDraftText} className={btnClass}>
                {copied ? copy.copied : copy.copyReply}
              </button>
              {draft.directLinks?.whatsappHref && (
                <a
                  href={draft.directLinks.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass + ' inline-flex items-center'}
                >
                  {copy.openWhatsApp}
                </a>
              )}
              {draft.directLinks?.telegramHref && (
                <a
                  href={draft.directLinks.telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnClass + ' inline-flex items-center'}
                >
                  {copy.openTelegram}
                </a>
              )}
            </div>
          </div>

          {draft.quoteDraft && (
            <div className="grid gap-2 rounded-lg border border-villa-obsidian/15 bg-white/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-villa-ash">{copy.quoteDraftTitle}</p>
                {onApplyQuote && (
                  <button type="button" onClick={applyQuoteDraft} className={btnClass}>
                    {applied ? copy.appliedQuote : copy.applyQuote}
                  </button>
                )}
              </div>
              <p className="text-xs text-villa-graphite">
                {`${draft.quoteDraft.supplierName} · $${Number(draft.quoteDraft.amountUsd || 0).toLocaleString('en-US')} · Deposit $${Number(draft.quoteDraft.depositUsd || 0).toLocaleString('en-US')} · Split ×${draft.quoteDraft.splitWays || 1}`}
              </p>
            </div>
          )}

          {Array.isArray(draft.managerTips) && draft.managerTips.length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-villa-ash">{copy.managerNotesTitle}</p>
              <ul className="grid gap-1 text-xs text-villa-graphite">
                {draft.managerTips.map((tip, index) => (
                  <li key={index} className="leading-relaxed">
                    {`• ${tip}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
