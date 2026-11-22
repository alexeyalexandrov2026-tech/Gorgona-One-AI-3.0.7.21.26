// ===========================================================================
// Zero-PII in-isolate telemetry collector for Miami Elio AI Concierge.
//
// Aggregates strictly anonymous operational and conversion metrics:
// - model vs lexicon vs fact share, error & handoff counts
// - rolling avg / p95 server turn latency (bounded 200-sample ring buffer)
// - top actions & locales
// - partner referral impressions vs clicks (CTR % per platform)
//
// Never stores guest messages, replies, IP addresses, or any PII.
// ===========================================================================

const MAX_LATENCY_SAMPLES = 200;

function freshState() {
  return {
    startedAt: new Date().toISOString(),
    totalTurns: 0,
    byDecider: { model: 0, lexicon: 0, fact: 0 },
    errorTurns: 0,
    handoffTurns: 0,
    byAction: {},
    byLocale: {},
    referralsShown: {},
    referralClicks: {},
    latencies: []
  };
}

let state = freshState();

function bump(map, key) {
  if (!key || typeof key !== 'string') return;
  map[key] = (map[key] || 0) + 1;
}

/** Record one completed /api/chat turn (metadata only, zero PII). */
export function recordChatTurn({
  decidedBy = 'lexicon',
  action = 'recommend',
  locale = 'en',
  referrals = [],
  handoff = false,
  error = false,
  ms = null
} = {}) {
  state.totalTurns += 1;
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
  if (typeof platform !== 'string' || !platform) return;
  bump(state.referralClicks, platform);
}

/** Compute an immutable zero-PII metrics snapshot for the Admin Console. */
export function getConciergeMetricsSnapshot() {
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
    byDecider: { ...state.byDecider },
    modelSharePct,
    errorTurns: state.errorTurns,
    handoffTurns: state.handoffTurns,
    avgLatencyMs,
    p95LatencyMs,
    totalReferralClicks,
    byAction: { ...state.byAction },
    byLocale: { ...state.byLocale },
    partners
  };
}

/** Reset isolate metrics (used in tests). */
export function resetConciergeMetrics() {
  state = freshState();
}
