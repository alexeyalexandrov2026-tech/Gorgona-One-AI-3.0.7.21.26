// ===========================================================================
// Zero-PII telemetry collector & optional Supabase persistence for ELIO+ Guide.
//
// Aggregates strictly anonymous operational, caching, feedback & CTR metrics:
// - model vs lexicon vs fact share, cache hits, error & handoff counts
// - rolling avg / p95 server turn latency (bounded 200-sample ring buffer)
// - top actions, locales, thumbs up/down counts
// - partner referral impressions vs clicks (CTR % per platform)
// - non-blocking persistence to Supabase `elio_telemetry_events` & PII-scrubbed
//   `elio_training_samples` (dataset foundation for future ELIO-1 model).
// ===========================================================================

import { database } from './dashboardCore.mjs';

const MAX_LATENCY_SAMPLES = 200;

function freshState() {
  return {
    startedAt: new Date().toISOString(),
    totalTurns: 0,
    cacheHits: 0,
    byDecider: { model: 0, lexicon: 0, fact: 0 },
    errorTurns: 0,
    handoffTurns: 0,
    feedbackUp: 0,
    feedbackDown: 0,
    byAction: {},
    byLocale: {},
    referralsShown: {},
    referralClicks: {},
    mcpCalls: 0,
    mcpErrors: 0,
    mcpByTool: {},
    latencies: []
  };
}

const GLOBAL_TELEMETRY_KEY = '__elioConciergeTelemetryState';
function getState() {
  if (!globalThis[GLOBAL_TELEMETRY_KEY]) {
    globalThis[GLOBAL_TELEMETRY_KEY] = freshState();
  }
  return globalThis[GLOBAL_TELEMETRY_KEY];
}
let state = getState();

function bump(map, key) {
  if (!key || typeof key !== 'string') return;
  map[key] = (map[key] || 0) + 1;
}

/** Scrub emails, phone numbers, card-like digits and long IDs before storing ELIO-1 training samples. */
export function redactPiiForTraining(raw) {
  return String(raw || '')
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]{2,}\b/g, '[email]')
    .replace(/\b\d{13,19}\b/g, '[redacted]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Record one completed /api/chat turn (metadata only, zero PII). */
export function recordChatTurn({
  decidedBy = 'lexicon',
  action = 'recommend',
  locale = 'en',
  referrals = [],
  handoff = false,
  error = false,
  cached = false,
  ms = null
} = {}) {
  state = getState();
  state.totalTurns += 1;
  if (cached) state.cacheHits += 1;
  if (Object.hasOwn(state.byDecider, decidedBy)) state.byDecider[decidedBy] += 1;
  if (error) state.errorTurns += 1;
  if (handoff) state.handoffTurns += 1;
  if (action) bump(state.byAction, String(action).slice(0, 24));
  if (locale) bump(state.byLocale, String(locale).slice(0, 8));
  if (Array.isArray(referrals)) {
    for (const platform of new Set(referrals)) {
      if (typeof platform === 'string' && platform) bump(state.referralsShown, platform);
    }
  }
  if (Number.isFinite(ms) && ms >= 0 && ms < 120_000) {
    state.latencies.push(Math.round(ms));
    if (state.latencies.length > MAX_LATENCY_SAMPLES) state.latencies.shift();
  }
}

/** Record one verified partner referral click beacon (zero PII). */
export function recordReferralClick(platform) {
  state = getState();
  if (typeof platform !== 'string' || !platform) return;
  bump(state.referralClicks, platform);
}

/** Record one guest thumbs up/down feedback beacon (zero PII). */
export function recordFeedbackVote(vote) {
  state = getState();
  if (vote === 'up') state.feedbackUp += 1;
  else if (vote === 'down') state.feedbackDown += 1;
}

/** Record one external MCP server tool invocation (zero PII). */
export function recordMcpCall({ tool = '', error = false, ms = null } = {}) {
  state = getState();
  state.mcpCalls += 1;
  if (error) state.mcpErrors += 1;
  if (typeof tool === 'string' && tool) bump(state.mcpByTool, tool.slice(0, 48));
  if (Number.isFinite(ms) && ms >= 0 && ms < 120_000) {
    state.latencies.push(Math.round(ms));
    if (state.latencies.length > MAX_LATENCY_SAMPLES) state.latencies.shift();
  }
}

/**
 * Non-blocking fail-safe insert into Supabase `elio_telemetry_events`.
 * Never throws and adds zero wait time when called fire-and-forget.
 */
export async function persistTelemetryEvent(event, env = process.env, fetcher = fetch) {
  if (!event || !env?.NEXT_PUBLIC_SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const db = database(env, fetcher);
    const row = {
      event_type: event.eventType || 'turn',
      locale: String(event.locale || 'en').slice(0, 12),
      decided_by: event.decidedBy || null,
      action: event.action ? String(event.action).slice(0, 32) : null,
      platform: event.platform ? String(event.platform).slice(0, 32) : null,
      vote: event.vote === 'up' || event.vote === 'down' ? event.vote : null,
      latency_ms: Number.isFinite(event.latencyMs) && event.latencyMs >= 0 && event.latencyMs < 120000
        ? Math.round(event.latencyMs)
        : null,
      handoff: Boolean(event.handoff),
      error: Boolean(event.error),
      cached: Boolean(event.cached),
      ...(Number.isSafeInteger(event.amountCents) && event.amountCents >= 0 && event.amountCents <= 50_000_000
        ? { amount_cents: event.amountCents }
        : {})
    };
    await db.call('/rest/v1/elio_telemetry_events', {
      service: true,
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: row
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Store a strictly PII-scrubbed Q&A feedback sample in `elio_training_samples`
 * for future ELIO-1 evaluation & fine-tuning. Never throws.
 */
export async function persistTrainingSample({ question, answer, vote, locale = 'en', action = null }, env = process.env, fetcher = fetch) {
  if (!env?.NEXT_PUBLIC_SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) return false;
  if (vote !== 'up' && vote !== 'down') return false;
  const cleanQ = redactPiiForTraining(question).slice(0, 2000);
  const cleanA = redactPiiForTraining(answer).slice(0, 4000);
  if (!cleanQ || !cleanA) return false;
  try {
    const db = database(env, fetcher);
    await db.call('/rest/v1/elio_training_samples', {
      service: true,
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: {
        locale: String(locale || 'en').slice(0, 12),
        action: action ? String(action).slice(0, 32) : null,
        vote,
        question_redacted: cleanQ,
        answer_text: cleanA,
        curated: false
      }
    });
    return true;
  } catch {
    return false;
  }
}

/** Compute an immutable zero-PII metrics snapshot for the Admin Console. */
export function getConciergeMetricsSnapshot() {
  state = getState();
  const aiEligible = state.byDecider.model + state.byDecider.lexicon;
  const modelSharePct = aiEligible > 0 ? Math.round((state.byDecider.model / aiEligible) * 1000) / 10 : null;

  let avgLatencyMs = null;
  let p95LatencyMs = null;
  if (state.latencies.length) {
    const sorted = [...state.latencies].sort((a, b) => a - b);
    avgLatencyMs = Math.round(sorted.reduce((sum, v) => sum + v, 0) / sorted.length);
    p95LatencyMs = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  }

  const platforms = [...new Set([...Object.keys(state.referralsShown), ...Object.keys(state.referralClicks)])];
  const partners = platforms
    .map((platform) => {
      const shown = state.referralsShown[platform] || 0;
      const clicks = state.referralClicks[platform] || 0;
      const ctrPct = shown > 0 ? Math.round((clicks / shown) * 1000) / 10 : null;
      return { platform, shown, clicks, ctrPct };
    })
    .sort((a, b) => b.clicks - a.clicks || b.shown - a.shown || a.platform.localeCompare(b.platform));

  const totalReferralClicks = Object.values(state.referralClicks).reduce((a, b) => a + b, 0);

  return {
    startedAt: state.startedAt,
    totalTurns: state.totalTurns,
    cacheHits: state.cacheHits,
    byDecider: { ...state.byDecider },
    modelSharePct,
    errorTurns: state.errorTurns,
    handoffTurns: state.handoffTurns,
    feedbackUp: state.feedbackUp,
    feedbackDown: state.feedbackDown,
    avgLatencyMs,
    p95LatencyMs,
    totalReferralClicks,
    byAction: { ...state.byAction },
    byLocale: { ...state.byLocale },
    mcp: {
      calls: state.mcpCalls,
      errors: state.mcpErrors,
      byTool: { ...state.mcpByTool }
    },
    partners
  };
}

/** Reset isolate metrics (used in tests). */
export function resetConciergeMetrics() {
  const next = freshState();
  globalThis[GLOBAL_TELEMETRY_KEY] = next;
  state = next;
}
