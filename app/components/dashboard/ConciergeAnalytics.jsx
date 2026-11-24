"use client";

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useLocale } from '../LocaleProvider';
import { getAnalyticsCopy } from '../../../lib/ai/analyticsCopy.mjs';

async function fetchMetrics(userId, signal) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data?.session?.user?.id !== userId) throw new Error('Session changed');
  const response = await fetch('/api/dashboard/concierge-metrics', {
    cache: 'no-store',
    signal,
    headers: { Authorization: 'Bearer ' + data.session.access_token }
  });
  if (!response.ok) throw new Error('Metrics unavailable');
  return response.json();
}

export default function ConciergeAnalytics({ userId }) {
  const locale = useLocale();
  const copy = getAnalyticsCopy(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (signal) => {
    setBusy(true);
    setError(false);
    try {
      const result = await fetchMetrics(userId, signal);
      if (!signal?.aborted) setData(result);
    } catch {
      if (!signal?.aborted) setError(true);
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const m = data?.metrics;
  const p7 = data?.persisted7d;
  const f7 = data?.funnel7d;

  const totalTurns = p7?.turns ?? m?.totalTurns;
  const modelSharePct = p7?.turns > 0
    ? Math.round((p7.modelTurns / p7.turns) * 1000) / 10
    : m?.modelSharePct;
  const avgMs = p7?.avgLatencyMs ?? m?.avgLatencyMs;
  const partnerClicks = f7?.partnerClicks ?? p7?.referralClicks ?? m?.totalReferralClicks;

  const kpis = [
    [copy.turns, totalTurns !== undefined && totalTurns !== null ? String(totalTurns) : '—'],
    [copy.modelShare, modelSharePct !== null && modelSharePct !== undefined ? `${modelSharePct}%` : '—'],
    [copy.latency, avgMs !== null && avgMs !== undefined ? `${avgMs} ms` : '—'],
    [copy.clicks, partnerClicks !== undefined && partnerClicks !== null ? String(partnerClicks) : '—'],
    [copy.messengers, f7?.messengerClicks !== undefined ? String(f7.messengerClicks) : '—'],
    [copy.leads, f7?.leadSubmits !== undefined ? String(f7.leadSubmits) : '—'],
    [copy.adEvents, f7?.adAttributedEvents !== undefined ? String(f7.adAttributedEvents) : '—'],
    [copy.openReports, data?.openReportsCount !== null && data?.openReportsCount !== undefined ? String(data.openReportsCount) : '—']
  ];

  const providerRows = f7?.byProvider?.length
    ? f7.byProvider.map((row) => ({ platform: row.provider, shown: null, clicks: row.clicks, ctrPct: null }))
    : (m?.partners || []);

  const sourceRows = Array.isArray(f7?.bySource) ? f7.bySource : [];

  return (
    <section aria-labelledby="concierge-analytics-heading" className="mt-10 grid gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="concierge-analytics-heading" className="font-display text-3xl">{copy.title}</h2>
          <p className="mt-1 text-sm text-villa-obsidian/70">{copy.subtitle}</p>
        </div>
        <button className="w-fit text-sm underline" type="button" onClick={() => refresh()} disabled={busy}>
          {busy ? copy.loading : copy.refresh}
        </button>
      </div>

      {error && <p role="alert" className="text-sm">{copy.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="border-y border-villa-obsidian/20 py-4">
            <p className="text-xs uppercase tracking-wider text-villa-obsidian/70">{label}</p>
            <p className="mt-2 font-display text-2xl">{error ? '—' : value}</p>
          </div>
        ))}
      </div>

      {providerRows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-villa-obsidian/20">
                <th className="py-2 text-start">{copy.partnerCol}</th>
                <th className="py-2 text-start">{copy.clicksCol}</th>
                <th className="py-2 text-start">{copy.shownCol}</th>
                <th className="py-2 text-start">{copy.ctrCol}</th>
              </tr>
            </thead>
            <tbody>
              {providerRows.map((row) => (
                <tr key={row.platform} className="border-t border-villa-obsidian/15">
                  <td className="py-2.5 pe-3 font-medium uppercase">{row.platform}</td>
                  <td className="pe-3">{row.clicks}</td>
                  <td className="pe-3">{row.shown ?? '—'}</td>
                  <td>{row.ctrPct !== null && row.ctrPct !== undefined ? `${row.ctrPct}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && data && <p className="text-sm text-villa-obsidian/70">{copy.noPartners}</p>
      )}

      {sourceRows.length > 0 && (
        <div className="grid gap-2">
          <h3 className="font-display text-xl">{copy.sourcesTitle}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-villa-obsidian/20">
                  <th className="py-2 text-start">{copy.sourceCol}</th>
                  <th className="py-2 text-start">{copy.eventsCol}</th>
                  <th className="py-2 text-start">{copy.clicksCol}</th>
                  <th className="py-2 text-start">{copy.leadsCol}</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((row) => (
                  <tr key={row.source} className="border-t border-villa-obsidian/15">
                    <td className="py-2.5 pe-3 font-medium">{row.source}</td>
                    <td className="pe-3">{row.events}</td>
                    <td className="pe-3">{row.clicks}</td>
                    <td>{row.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
