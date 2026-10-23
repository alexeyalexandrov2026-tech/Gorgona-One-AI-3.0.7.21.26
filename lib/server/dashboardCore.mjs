const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const REQUEST_STATES = ['pending', 'reviewing', 'responded', 'closed'];
export class RequestError extends Error {
  constructor(status, code) { super(code); this.status = status; }
}
export function uuid(value) { return typeof value === 'string' && UUID.test(value); }
export function requireKey(request) {
  const key = request.headers.get('idempotency-key');
  if (!uuid(key) || key[14] !== '4') throw new RequestError(400, 'Invalid request key');
  return key.toLowerCase();
}
export async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, 'Invalid request');
  let size = 0, chunks = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 8192) { await reader.cancel(); throw new RequestError(413, 'Request too large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch (e) { if (e instanceof RequestError) throw e; throw new RequestError(400, 'Invalid request'); }
}
function field(body, key, max) {
  if (typeof body[key] !== 'string') throw new RequestError(400, 'Invalid request');
  const text = body[key].trim();
  if (!text || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new RequestError(400, 'Invalid request');
  return text;
}
export function bookingInput(body) {
  const result = { name: field(body, 'name', 120), email: field(body, 'email', 254).toLowerCase(),
    phone: field(body, 'phone', 40), dates: field(body, 'dates', 600),
    itemSlug: field(body, 'itemSlug', 120), itemTitle: field(body, 'itemTitle', 240), kind: body.kind || 'car' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || !/^[a-z0-9][a-z0-9-]*$/.test(result.itemSlug)
    || !['car', 'yacht', 'stay', 'experience'].includes(result.kind)) throw new RequestError(400, 'Invalid request');
  return result;
}
export function commandInput(body) {
  if (!Number.isSafeInteger(body.version) || body.version < 0 || !['review', 'respond', 'close', 'assign'].includes(body.action)) throw new RequestError(400, 'Invalid request');
  const reply = body.action === 'respond' ? field(body, 'reply', 2000) : '';
  if (body.action === 'assign' && body.partnerId !== null && !uuid(body.partnerId)) throw new RequestError(400, 'Invalid partner');
  return { action: body.action, version: body.version, reply, partnerId: body.action === 'assign' ? body.partnerId : null };
}
export async function digest(text, secret) {
  const bytes = new TextEncoder().encode(text);
  const hash = secret ? await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), bytes)
    : await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Vary': 'Authorization' } });
}
export function failure(error) { return json({ error: error instanceof RequestError ? error.message : 'Service unavailable' }, error instanceof RequestError ? error.status : 503); }

export function database(env, fetcher = fetch) {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) throw new RequestError(503, 'Service unavailable');
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  async function call(path, { token, service = false, method = 'GET', body, headers = {} } = {}) {
    const key = service ? env.SUPABASE_SERVICE_ROLE_KEY : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const response = await fetcher(base + path, { method, signal: AbortSignal.timeout(8000), cache: 'no-store',
      headers: { apikey: key, Authorization: `Bearer ${service ? key : token}`, 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new RequestError(response.status === 401 ? 401 : 503, 'Service unavailable');
    return data;
  }
  return { call,
    async identity(request, optional = false) {
      const header = request.headers.get('authorization');
      if (!header && optional) return null;
      if (!header?.match(/^Bearer [^\s]+$/i)) throw new RequestError(401, 'Sign in required');
      const token = header.slice(7);
      const user = await call('/auth/v1/user', { token });
      if (!uuid(user?.id)) throw new RequestError(401, 'Sign in required');
      const profiles = await call('/rest/v1/profiles?select=id,role,name,company_name&id=eq.' + user.id, { token });
      const profile = profiles?.[0];
      if (!profile || !['user','partner','admin'].includes(profile.role)) throw new RequestError(403, 'Access denied');
      return { ...profile, token };
    },
    async rpc(name, args) {
      const result = await call('/rest/v1/rpc/' + name, { service: true, method: 'POST', body: args });
      if (result?.error) throw new RequestError(({ conflict:409, forbidden:403, rate:429, missing:404 })[result.error] || 503, result.error);
      return result;
    }
  };
}

export function cursor(value) {
  if (!value) return null;
  try {
    const [at, id] = atob(value).split('|');
    if (!uuid(id) || !/^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/.test(at) || !Number.isFinite(Date.parse(at))) throw new Error();
    return { at, id };
  } catch { throw new RequestError(400, 'Invalid cursor'); }
}
