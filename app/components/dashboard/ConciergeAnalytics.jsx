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
  const kpis = [
    [copy.turns, m ? String(m.totalTurns) : '—'],
    [copy.modelShare, m?.modelSharePct !== null && m?.modelSharePct !== undefined ? `${m.modelSharePct}%` : '—'],
    [copy.latency, m?.avgLatencyMs !== null && m?.avgLatencyMs !== undefined ? `${m.avgLatencyMs} / ${m.p95LatencyMs ?? m.avgLatencyMs} ms` : '—'],
    [copy.clicks, m ? String(m.totalReferralClicks) : '—'],
    [copy.openReports, data?.openReportsCount !== null && data?.openReportsCount !== undefined ? String(data.openReportsCount) : '—']
  ];

  return (
    <section aria-labelledby="concierge-analytics-heading" className="mt-10 grid gap-4">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(([label, value]) => (
          <div key={label} className="border-y border-villa-obsidian/20 py-4">
            <p className="text-xs uppercase tracking-wider text-villa-obsidian/70">{label}</p>
            <p className="mt-2 font-display text-2xl">{error ? '—' : value}</p>
          </div>
        ))}
      </div>

      {m?.partners?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-villa-obsidian/20">
                <th className="py-2 text-start">{copy.partnerCol}</th>
                <th className="py-2 text-start">{copy.shownCol}</th>
                <th className="py-2 text-start">{copy.clicksCol}</th>
                <th className="py-2 text-start">{copy.ctrCol}</th>
              </tr>
            </thead>
            <tbody>
              {m.partners.map((row) => (
                <tr key={row.platform} className="border-t border-villa-obsidian/15">
                  <td className="py-2.5 pe-3 font-medium uppercase">{row.platform}</td>
                  <td className="pe-3">{row.shown}</td>
                  <td className="pe-3">{row.clicks}</td>
                  <td>{row.ctrPct !== null ? `${row.ctrPct}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !error && data && <p className="text-sm text-villa-obsidian/70">{copy.noPartners}</p>
      )}
    </section>
  );
}
