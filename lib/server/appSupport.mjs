import { database, digest, failure, json, readBody, requireKey, RequestError, uuid } from './dashboardCore.mjs';

const maxLengths = { answer: 6000, question: 4000, note: 1000, sessionId: 120, locale: 16 };
const invalid = () => new RequestError(400, 'Invalid request');

function parseReport(body) {
  const report = {};
  for (const [field, limit] of Object.entries(maxLengths)) {
    const value = body[field];
    if (field === 'sessionId' && value == null) continue;
    if (typeof value !== 'string' || value.length > limit || /\u0000/.test(value)) throw invalid();
    report[field] = value.trim();
  }
  if (!report.answer || !/^[a-z]{2,3}$/i.test(report.locale)) throw invalid();
  return report;
}

export function appSupportHandlers(env, fetcher = fetch) {
  const guarded = (fn) => async (request) => {
    try { return await fn(request); } catch (error) { return failure(error); }
  };

  async function submit(db, args) {
    const row = await db.rpc('submit_app_support_request', args);
    if (!uuid(row?.id)) throw new RequestError(503, 'Service unavailable');
    return json({ received: true }, 202);
  }

  async function admin(request) {
    const db = database(env, fetcher);
    const user = await db.identity(request);
    if (user.role !== 'admin') throw new RequestError(403, 'Access denied');
    return { db, user };
  }

  return {
    report: guarded(async (request) => {
      const key = requireKey(request);
      const content = parseReport(await readBody(request, 65536));
      const secret = env.BOOKING_RATE_SECRET;
      if (typeof secret !== 'string' || secret.length < 32) throw new RequestError(503, 'Service unavailable');
      // Cloudflare sets this header at the production ingress.
      const rate = await digest('app-report:' + (request.headers.get('cf-connecting-ip') || 'unavailable'), secret);
      return submit(database(env, fetcher), { p_kind: 'ai_report', p_key: key, p_user: null, p_rate: rate, p_content: content });
    }),
    deletion: guarded(async (request) => {
      const key = requireKey(request);
      const db = database(env, fetcher);
      const user = await db.identity(request);
      return submit(db, { p_kind: 'account_deletion', p_key: key, p_user: user.id, p_rate: null, p_content: {} });
    }),
    list: guarded(async (request) => {
      const { db } = await admin(request);
      const rows = await db.call(
        '/rest/v1/app_support_requests?select=id,kind,user_id,content,created_at&resolved_at=is.null&order=created_at.asc&limit=50',
        { service: true },
      );
      if (!Array.isArray(rows)) throw new RequestError(503, 'Service unavailable');
      return json({ requests: rows });
    }),
    resolve: guarded(async (request) => {
      const { db, user } = await admin(request);
      const { id } = await readBody(request, 256);
      if (!uuid(id)) throw invalid();
      const updated = await db.rpc('resolve_app_support_request', { p_id: id, p_actor: user.id });
      if (updated?.id !== id.toLowerCase()) throw new RequestError(503, 'Service unavailable');
      return json({ resolved: true });
    }),
  };
}
