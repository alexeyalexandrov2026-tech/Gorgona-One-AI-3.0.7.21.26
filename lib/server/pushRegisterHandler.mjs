// Authenticated device push token registration endpoint (/api/push/register).
// Strictly requires a verified Supabase Bearer JWT and stores tokens under RLS.
import { database, readBody, json, failure, RequestError } from './dashboardCore.mjs';

const VALID_PLATFORMS = new Set(['android', 'ios', 'web']);
const TOKEN_RE = /^[A-Za-z0-9:._-]{32,512}$/;

export function pushRegisterHandlers(env = process.env, fetcher = fetch) {
  return {
    register: async (request) => {
      try {
        const db = database(env, fetcher);
        const user = await db.identity(request);
        const body = await readBody(request, 4096);
        const token = typeof body?.token === 'string' ? body.token.trim() : '';
        if (!TOKEN_RE.test(token)) throw new RequestError(400, 'Invalid push token');
        const platform = VALID_PLATFORMS.has(body?.platform) ? body.platform : 'android';
        const locale = typeof body?.locale === 'string' && body.locale.trim()
          ? body.locale.trim().slice(0, 12)
          : 'en';
        const appVersion = typeof body?.appVersion === 'string' && body.appVersion.trim()
          ? body.appVersion.trim().slice(0, 32)
          : null;

        await db.call('/rest/v1/rpc/push_token_upsert', {
          method: 'POST',
          token: user.token,
          body: {
            p_token: token,
            p_platform: platform,
            p_locale: locale,
            p_app_version: appVersion
          }
        });
        return json({ ok: true });
      } catch (error) {
        return failure(error);
      }
    },

    unregister: async (request) => {
      try {
        const db = database(env, fetcher);
        const user = await db.identity(request);
        const body = await readBody(request, 2048);
        const token = typeof body?.token === 'string' ? body.token.trim() : '';
        if (!TOKEN_RE.test(token)) throw new RequestError(400, 'Invalid push token');

        await db.call(`/rest/v1/device_push_tokens?token=eq.${encodeURIComponent(token)}`, {
          method: 'DELETE',
          token: user.token
        });
        return json({ ok: true });
      } catch (error) {
        return failure(error);
      }
    }
  };
}
