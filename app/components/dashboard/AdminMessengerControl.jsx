"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useLocale } from '../LocaleProvider';
import { getCopilotCopy } from '../../../lib/ai/copilotCopy.mjs';

const btnClass =
  'min-h-[38px] rounded-lg border border-villa-obsidian/25 bg-white/80 px-3 py-1.5 text-xs font-medium text-villa-obsidian transition hover:bg-villa-obsidian/10 disabled:opacity-50';
const primaryBtnClass =
  'min-h-[38px] rounded-lg bg-villa-obsidian px-4 py-1.5 text-xs font-medium text-villa-parchment transition hover:opacity-90 disabled:opacity-50';
const inputClass =
  'min-h-[40px] rounded-lg border border-villa-obsidian/25 bg-white/85 px-3 py-1.5 text-sm text-villa-obsidian';

async function adminApi(userId, path, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data?.session?.user?.id !== userId) throw new Error('Session changed');
  const res = await fetch(path, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + data.session.access_token,
      ...options.headers
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Request failed');
  return json;
}

export default function AdminMessengerControl({ userId }) {
  const locale = useLocale();
  const copy = getCopilotCopy(locale);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [syncingTelegram, setSyncingTelegram] = useState(false);
  const [telegramSync, setTelegramSync] = useState(null);
  const [telegramSyncError, setTelegramSyncError] = useState(false);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState('24_7');
  const [takeoverHours, setTakeoverHours] = useState('4');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    try {
      const result = await adminApi(userId, '/api/dashboard/messenger');
      setData(result);
      if (result?.settings?.mode) setMode(result.settings.mode);
      if (result?.settings?.takeoverHours) setTakeoverHours(String(result.settings.takeoverHours));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(false);
    setSavedNotice(false);
    try {
      await adminApi(userId, '/api/dashboard/messenger', {
        method: 'POST',
        body: JSON.stringify({
          action: 'settings',
          mode,
          takeoverHours: Math.max(1, Math.min(48, Number(takeoverHours) || 4))
        })
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
      await load();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  async function syncTelegramWebhook() {
    if (syncingTelegram) return;
    setSyncingTelegram(true);
    setTelegramSyncError(false);
    try {
      const result = await adminApi(userId, '/api/dashboard/messenger', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync_telegram_webhook' })
      });
      setTelegramSync(result?.telegram || null);
    } catch {
      setTelegramSyncError(true);
    } finally {
      setSyncingTelegram(false);
    }
  }

  async function toggleThreadPause(threadId, isPaused) {
    setSaving(true);
    try {
      await adminApi(userId, '/api/dashboard/messenger', {
        method: 'POST',
        body: JSON.stringify({
          action: isPaused ? 'resume' : 'pause',
          threadId,
          hours: Math.max(1, Math.min(48, Number(takeoverHours) || 4))
        })
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (!userId) return null;
  const channels = data?.channels || {};
  const threads = Array.isArray(data?.threads) ? data.threads : [];

  return (
    <section
      data-admin-messenger-control="true"
      className="my-10 min-w-0 border-t border-villa-obsidian/20 pt-8 text-villa-obsidian"
      aria-label={copy.omnichannelTitle}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-villa-charcoal">{copy.omnichannelTitle}</h2>
          <p className="mt-1 max-w-3xl text-sm text-villa-ash">{copy.omnichannelSubtitle}</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className={btnClass}>
          {loading ? copy.loading : copy.refresh}
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-villa-obsidian/20 bg-white/60 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-villa-ash">{copy.telegramStatus}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-villa-graphite">{channels.webhookUrls?.telegram || '—'}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${channels.telegramConfigured ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
              {channels.telegramConfigured ? copy.statusReady : copy.statusNeedsKeys}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={syncTelegramWebhook}
              disabled={!channels.telegramConfigured || syncingTelegram}
              className={primaryBtnClass}
              data-sync-telegram-webhook="true"
            >
              {syncingTelegram ? copy.syncingTelegramWebhook : copy.syncTelegramWebhook}
            </button>
            {telegramSync && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
                {copy.telegramSynced}
                {telegramSync.botUsername ? ` · @${telegramSync.botUsername}` : ''}
              </span>
            )}
          </div>

          {telegramSync && (
            <p className={`mt-2 text-xs ${telegramSync.canConnectToBusiness ? 'text-emerald-900' : 'text-amber-900'}`}>
              {telegramSync.canConnectToBusiness ? copy.telegramBusinessReady : copy.telegramBusinessOff}
            </p>
          )}
          {telegramSyncError && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-700">
              {copy.telegramSyncError}
            </p>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border border-villa-obsidian/20 bg-white/60 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-villa-ash">{copy.whatsappStatus}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-villa-graphite">{channels.webhookUrls?.whatsapp || '—'}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${channels.whatsappConfigured ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
            {channels.whatsappConfigured ? copy.statusReady : copy.statusNeedsKeys}
          </span>
        </div>
      </div>

      <form onSubmit={saveSettings} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-villa-obsidian/20 bg-white/60 p-4">
        <label className="grid min-w-[240px] flex-1 gap-1 text-xs font-medium text-villa-ash">
          {copy.modeLabel}
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
            <option value="24_7">{copy.mode247}</option>
            <option value="after_hours">{copy.modeAfterHours}</option>
            <option value="copilot_only">{copy.modeCopilotOnly}</option>
          </select>
        </label>

        <label className="grid w-44 gap-1 text-xs font-medium text-villa-ash">
          {copy.takeoverLabel}
          <input
            type="number"
            min={1}
            max={48}
            value={takeoverHours}
            onChange={(e) => setTakeoverHours(e.target.value)}
            className={inputClass}
          />
        </label>

        <button type="submit" disabled={saving} className={primaryBtnClass}>
          {savedNotice ? copy.saved : copy.saveSettings}
        </button>
      </form>

      {error && (
        <p role="alert" className="mb-4 text-xs font-medium text-red-700">
          {copy.saveError}
        </p>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-villa-ash">{copy.recentThreads}</h3>
        {!threads.length ? (
          <p className="text-sm text-villa-ash">{copy.noThreads}</p>
        ) : (
          <div className="grid gap-2.5">
            {threads.map((thread) => {
              const paused = Boolean(thread.humanPausedUntil && Date.parse(thread.humanPausedUntil) > Date.now());
              return (
                <div
                  key={thread.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-villa-obsidian/15 bg-white/60 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-villa-obsidian px-2 py-0.5 font-mono text-[10px] uppercase text-villa-parchment">
                        {thread.channel}
                      </span>
                      <span className="font-medium text-villa-obsidian">
                        {thread.customerName || thread.customerHandle || thread.id.slice(0, 8)}
                      </span>
                      <span className="font-mono text-xs uppercase text-villa-ash">{thread.locale}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${paused ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                        {paused ? copy.pausedBadge : copy.activeBadge}
                      </span>
                      {thread.bookingId && (
                        <span className="rounded-full border border-villa-obsidian/20 px-2 py-0.5 text-[11px] text-villa-obsidian">
                          {copy.leadLinked}
                        </span>
                      )}
                    </div>
                    {thread.lastMessagePreview && (
                      <p className="mt-1 truncate text-xs text-villa-graphite">{thread.lastMessagePreview}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => toggleThreadPause(thread.id, paused)}
                    className={btnClass}
                  >
                    {paused ? copy.resumeAi : copy.pauseAi}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
