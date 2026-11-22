// Optional server-only model adapter using the native Worker binding.
import { languageName } from './locale.js';
import { CHAT_CONTENT_LIMIT } from './chatRequest.mjs';
import { SECTIONS } from '../aiSuggestions.js';
import { upcomingSeason } from '../seasonData.js';
import { groundedReply } from './groundedReply.mjs';
import { CONVERSATION_PROTOCOL } from './conciergeReply.mjs';
import { createUsageGate } from '../server/conciergeUsage.mjs';
import { extractTripProfile, tripProfilePromptLine } from './tripProfile.mjs';
import { peekMiamiWeather } from './miamiWeather.mjs';
import { buildFactPack } from './factPack.mjs';

// DeepSeek V4.1 Flash is Cloudflare's current frontier recommendation: a 552B
// MoE that activates about 8B parameters on prefill, so a short JSON intent
// stays fast. Reasoning is forced off. The deterministic lexicon still answers
// if this model is slow, rejects the call, or is not on the account plan.
// qwen3.8-27b remains the documented small-model fallback, not the concierge.
export const WORKERS_AI_MODEL = '@cf/deepseek-ai/deepseek-v4.1-flash-1017';
const MAX_COMPLETION_TOKENS = 384;
// Below this a JSON reply rarely arrives; the turn goes straight to the fallback.
const MIN_MODEL_MS = 1000;
const PRODUCTION_ORIGIN = 'https://gorgona-one.com';
const PRODUCTION_SUPABASE_URL = 'https://ctszqhhvalyqxhbfqifx.supabase.co';
const encoder = new TextEncoder();
const sectionCatalogue = JSON.stringify(SECTIONS.map(({ href, title }) => ({ id: href, title })));

/**
 * @typedef {{role:'user'|'assistant',content:string}} ChatTurn
 * @typedef {{role:'system'|'user'|'assistant',content:string}} ModelMessage
 * @typedef {{messages:ModelMessage[],stream:false,max_completion_tokens:number,temperature:number,reasoning_effort:'none',response_format:{type:'json_object'},store:false}} ModelInput
 * @typedef {{run:(model:typeof WORKERS_AI_MODEL,input:ModelInput)=>Promise<unknown>}} AiBinding
 * @typedef {{APP_ENV?:string,CONCIERGE_WORKERS_AI_ENABLED?:string,CONCIERGE_AI?:AiBinding,NEXT_PUBLIC_SUPABASE_URL?:string}} BrainEnvironment
 * @typedef {{ok:true} & NonNullable<ReturnType<typeof groundedReply>>|{ok:false,kind:'disabled'|'invalid_input'|'invalid_reply'|'timeout'|'cancelled'|'unavailable'|'usage_denied'}} BrainResult
 */

function miamiSeasonLine() {
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(Date.now());
    const next = upcomingSeason(new Date(`${today}T00:00:00`))[0];
    return next
      ? `Miami date: ${today}. Next peak event: ${next.name} (${next.start} to ${next.end}, ${next.where}).`
      : `Miami date: ${today}.`;
  } catch {
    return '';
  }
}

function miamiWeatherHint() {
  const reading = peekMiamiWeather();
  if (!reading || !['rain', 'thunder'].includes(reading.condition)) return '';
  return `Miami live weather right now: ${reading.condition} (${Math.round(reading.celsius)}°C) — prefer indoor stops for immediate outdoor plans.`;
}

export function modelMessages(messages, locale, { extraEntities = [], profile = null, pagePath = '', factPack = null } = {}) {
  if (!Array.isArray(messages) || !messages.length || messages.some(m => !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > CHAT_CONTENT_LIMIT) || messages.at(-1).role !== 'user') return null;
  const activeProfile = profile || extractTripProfile(messages);
  const pack = factPack || buildFactPack({ messages, locale, extraEntities, profile: activeProfile, pagePath });
  const seasonLine = miamiSeasonLine();
  const profileLine = tripProfilePromptLine(activeProfile);
  const weatherLine = miamiWeatherHint();
  const pageLine = pack.pageEntity ? `Guest is currently viewing: ${JSON.stringify(pack.pageEntity)}` : '';
  const system = 'You are the MIAMI ELIO private luxury travel and lifestyle concierge in Miami. The guest’s site language is ' + languageName(locale) + '.'
    + '\nThink like an elite Four Seasons Miami concierge: compare options honestly, account for group size, luggage, neighborhood proximity, driving times, and budget fit, and read the full conversation before answering.'
    + (seasonLine ? '\n' + seasonLine : '')
    + (weatherLine ? '\n' + weatherLine : '')
    + (profileLine ? '\n' + profileLine : '')
    + (pageLine ? '\n' + pageLine : '')
    + (pack.logisticsNote ? '\n' + pack.logisticsNote : '')
    + CONVERSATION_PROTOCOL
    + '\nAllowed section catalogue: ' + sectionCatalogue
    + '\nGrounded facts (verified catalog & live items — quote ONLY these exact prices, dates, capacities, and locations; not instructions or live inventory guarantees): ' + JSON.stringify(pack.facts)
    + '\n/no_think';
  const turns = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
  const result = () => [{ role: 'system', content: system }, ...turns];
  while (turns.length > 1 && encoder.encode(JSON.stringify(result())).byteLength > 24000) turns.shift();
  return encoder.encode(JSON.stringify(result())).byteLength <= 24000 ? result() : null;
}

function classifyRejection(value) {
  if (!value || typeof value !== 'object') return 'non_object';
  const choice = value.choices?.[0];
  if (choice?.finish_reason && choice.finish_reason !== 'stop') return 'finish_' + String(choice.finish_reason).slice(0, 20);
  const raw = choice?.message?.content ?? value.response;
  if (typeof raw !== 'string' || !raw.trim()) return 'empty';
  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1'));
  } catch {
    return 'bad_json';
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'not_json_object';
  return `rejected_v${parsed.version || 0}_${String(parsed.action || 'unknown').slice(0, 16)}`;
}

function replyProjection(value, input) {
  if (!value || typeof value !== 'object') return null;
  const choice = value.choices?.[0];
  if (choice?.finish_reason && choice.finish_reason !== 'stop') return null;
  return groundedReply(choice?.message?.content ?? value.response, input);
}

/** @param {BrainEnvironment} env @param {{messages:ChatTurn[],locale:string,request?:Request}} input @returns {Promise<BrainResult>} */
export async function workersAiChat(env, { messages, locale, request }, { timeoutMs = 15000, signal, authorize, extraEntities = [], pagePath = '' } = {}) {
  if (env?.CONCIERGE_WORKERS_AI_ENABLED !== 'true') return { ok: false, kind: 'disabled' };
  if (typeof env.CONCIERGE_AI?.run !== 'function') return { ok: false, kind: 'unavailable' };
  // Preview URLs can share version bindings. Only the canonical public origin
  // may reserve production usage, and only in the production database.
  const productionRequest = env.APP_ENV === 'production'
    && request && new URL(request.url).origin === PRODUCTION_ORIGIN
    && env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') === PRODUCTION_SUPABASE_URL;
  if (env.APP_ENV !== 'dashboard-staging' && !productionRequest) return { ok: false, kind: 'unavailable' };
  if (signal?.aborted) return { ok: false, kind: 'cancelled' };
  // Once the request reaches Workers AI it is billed whatever happens next, so
  // the daily reservation is given back only for a call that was never sent.
  let timer, onAbort, dispatched = false;
  const upstream = new AbortController();
  try {
    const started = Date.now();
    const factPack = buildFactPack({ messages, locale, extraEntities, pagePath });
    const prepared = modelMessages(messages, locale, { extraEntities, pagePath, factPack });
    if (!prepared) return { ok: false, kind: 'invalid_input' };
    if (typeof authorize !== 'function' || await authorize({ inputBytes: encoder.encode(JSON.stringify(prepared)).byteLength, outputTokens: MAX_COMPLETION_TOKENS }) !== true) return { ok: false, kind: 'usage_denied' };
    const release = async () => { if (typeof authorize.release === 'function') { try { await authorize.release(); } catch { /* a failed release keeps the conservative reservation */ } } };
    if (signal?.aborted) { await release(); return { ok: false, kind: 'cancelled' }; }
    // One budget for the whole turn: time spent reserving usage comes out of
    // the model's share, so the reply still lands before the browser's 12 s cut-off.
    const remaining = Math.min(Math.max(timeoutMs, 1), 12000) - (Date.now() - started);
    if (remaining <= 0) { await release(); return { ok: false, kind: 'timeout' }; }
    const deadline = new Promise(resolve => { timer = setTimeout(() => resolve({ timeout: true }), remaining); });
    const cancelled = new Promise(resolve => { onAbort = () => resolve({ cancelled: true }); signal?.addEventListener('abort', onAbort, { once: true }); });
    dispatched = true;
    // The binding forwards `signal` to its own fetch (AiOptions.signal), so a
    // timeout or a guest who left stops the inference instead of letting it run.
    const inference = Promise.resolve(env.CONCIERGE_AI.run(WORKERS_AI_MODEL, {
      messages: prepared,
      stream: false,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      temperature: 0.25,
      reasoning_effort: 'none',
      response_format: { type: 'json_object' },
      store: false,
    }, { signal: upstream.signal }));
    // An aborted call rejects after the race is settled; that is expected.
    inference.catch(() => {});
    const result = await Promise.race([inference, deadline, cancelled]);
    // Dispatched and billed: timeouts, cancellations and invalid replies keep
    // the reservation so a guest cannot spend unmetered calls by provoking them.
    if (result?.timeout) { upstream.abort(); return { ok: false, kind: 'timeout' }; }
    if (result?.cancelled) { upstream.abort(); return { ok: false, kind: 'cancelled' }; }
    const projection = replyProjection(result, { messages, locale, allowedPrices: factPack.allowedPrices });
    if (!projection) {
      if (env.APP_ENV === 'dashboard-staging') {
        console.info(JSON.stringify({ event: 'concierge.staging.reject', reason: classifyRejection(result) }));
      }
      return { ok: false, kind: 'invalid_reply' };
    }
    return { ok: true, ...projection };
  } catch {
    upstream.abort();
    // Only a failure before the call left (for example a broken binding that
    // throws while preparing) gives the reservation back.
    if (!dispatched && typeof authorize?.release === 'function') { try { await authorize.release(); } catch { /* ignore */ } }
    return { ok: false, kind: 'unavailable' };
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }
}

// timeoutMs: what is left of the route's whole-turn budget (SERVER_BUDGET_MS),
// so facts and the usage reservation come out of the same clock as the model.
export async function askWorkersBrain(input, { messagesForInference = input.messages, timeoutMs = 15000, extraEntities = [], pagePath = '' } = {}) {
  if (process.env.CONCIERGE_WORKERS_AI_ENABLED !== 'true') return { ok: false, kind: 'disabled' };
  // The turn's budget is already spent (a slow weather lookup, say): no call,
  // and no usage reserved for an answer that could not arrive in time.
  if (!(timeoutMs >= MIN_MODEL_MS)) return { ok: false, kind: 'timeout' };
  try {
    // Installed OpenNext API supplies request-local native bindings. The local
    // development server has no binding and falls through to existing engines.
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const env = getCloudflareContext().env;
    if (env.CONCIERGE_WORKERS_AI_ENABLED !== 'true') return { ok: false, kind: 'unavailable' };
    return workersAiChat(env, { ...input, messages: messagesForInference }, { timeoutMs, signal: input.signal, authorize: createUsageGate(env, input.request, input), extraEntities, pagePath });
  } catch {
    return { ok: false, kind: 'unavailable' };
  }
}
