import { buildTicketNetworkSearch, normalizeTicketNetworkResults } from './ticketnetworkSearch.js';

const OFFICIAL_ORIGIN = 'https://www.ticketnetwork.com';
const CONFIG_TTL = 6 * 60 * 60 * 1000;
const FRESH_TTL = 5 * 60 * 1000;
const STALE_TTL = 24 * 60 * 60 * 1000;
const MAX_BODY = 3 * 1024 * 1024;

// Resolve only the intentionally public search configuration shipped by the
// current official storefront. No login, private API, or account credential.
// Do not pin a hashed bundle URL or commit a vendor key that can rotate.
export function readPublicTicketNetworkConfig(source) {
  if (!source.includes('x-typesense-api-key') || !source.includes('/collections/')) return null;
  const match = source.match(/dev:\{host:"([a-z0-9-]+\.a1\.typesense\.net)",apiKey:"([A-Za-z0-9_-]{16,256})"/);
  return match ? { host: match[1], key: match[2] } : null;
}

async function body(response) {
  if (!response.ok) throw new Error(`Supplier HTTP ${response.status}`);
  if (Number(response.headers.get('content-length')) > MAX_BODY) throw new Error('Supplier response too large');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) throw new Error('Supplier response too large');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(joined);
}

export function createTicketNetworkSource({ fetcher = fetch, cache, now = Date.now } = {}) {
  const memory = new Map();
  const pending = new Map();
  let configuration;
  let configurationPending;

  async function read(key, ttl) {
    let entry = memory.get(key);
    if (!entry && cache) {
      try {
        const cached = await cache.match(key);
        if (cached) entry = await cached.json();
      } catch { /* Cache failure must not prevent a live request. */ }
    }
    if (!entry || !Number.isFinite(entry.savedAt) || now() - entry.savedAt < 0 || now() - entry.savedAt > ttl) return null;
    return entry;
  }

  async function write(key, value, ttl) {
    const entry = { savedAt: now(), value };
    memory.delete(key);
    memory.set(key, entry);
    while (memory.size > 100) memory.delete(memory.keys().next().value);
    if (cache) {
      try { await cache.put(key, Response.json(entry, { headers: { 'Cache-Control': `public, max-age=${Math.floor(ttl / 1000)}` } })); }
      catch { /* Keep the successful response if edge cache storage fails. */ }
    }
    return entry;
  }

  async function discover() {
    const configKey = 'https://gorgona-one.com/__ticketnetwork-cache/config-v1';
    const stored = await read(configKey, CONFIG_TTL);
    if (stored) return stored;
    const options = { signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store' };
    const html = await body(await fetcher(`${OFFICIAL_ORIGIN}/en/affiliate-plugin`, options));
    const paths = [...new Set([...html.matchAll(/<script[^>]+src="([^"?#]+\.js)"/g)].map(match => match[1]))]
      .filter(path => /^\/_next\/static\/chunks\/[A-Za-z0-9%_[\]./-]+\.js$/.test(path) && !/polyfills|main-app|webpack|\/app\//.test(path)).slice(0, 16);
    for (let index = 0; index < paths.length; index += 4) {
      const candidates = await Promise.allSettled(paths.slice(index, index + 4).map(async path =>
        readPublicTicketNetworkConfig(await body(await fetcher(`${OFFICIAL_ORIGIN}${path}`, options)))));
      const config = candidates.find(result => result.status === 'fulfilled' && result.value)?.value;
      if (config) return write(configKey, config, CONFIG_TTL);
    }
    throw new Error('Supplier search configuration unavailable');
  }

  async function config() {
    if (configuration && now() - configuration.savedAt < CONFIG_TTL) return configuration.value;
    if (!configurationPending) configurationPending = discover().then(entry => { configuration = entry; return entry.value; }).finally(() => { configurationPending = null; });
    return configurationPending;
  }

  async function load(query, key) {
    const saved = await read(key, STALE_TTL);
    if (saved && now() - saved.savedAt < FRESH_TTL) return { ...saved.value, updatedAt: new Date(saved.savedAt).toISOString(), stale: false };
    try {
      const current = await config();
      const url = `https://${current.host}/collections/Event/documents/search?${buildTicketNetworkSearch(query)}`;
      const response = await fetcher(url, {
        headers: { Accept: 'application/json', 'X-TYPESENSE-API-KEY': current.key },
        signal: AbortSignal.timeout(10000), redirect: 'error', cache: 'no-store'
      });
      // A rotated public search key must trigger rediscovery on the next try.
      if (response.status === 401 || response.status === 403) {
        configuration = null;
        memory.delete('https://gorgona-one.com/__ticketnetwork-cache/config-v1');
        try { await cache?.delete('https://gorgona-one.com/__ticketnetwork-cache/config-v1'); } catch {}
      }
      const data = normalizeTicketNetworkResults(JSON.parse(await body(response)), query);
      const entry = await write(key, data, STALE_TTL);
      return { ...data, updatedAt: new Date(entry.savedAt).toISOString(), stale: false };
    } catch (cause) {
      if (saved) return { ...saved.value, updatedAt: new Date(saved.savedAt).toISOString(), stale: true };
      throw new Error('TicketNetwork search unavailable', { cause });
    }
  }

  return {
    async get(query) {
      const key = `https://gorgona-one.com/__ticketnetwork-cache/events-v1?${new URLSearchParams(Object.entries(query))}`;
      if (!pending.has(key) && pending.size >= 20) throw new Error('TicketNetwork search busy');
      if (!pending.has(key)) pending.set(key, load(query, key).finally(() => pending.delete(key)));
      return pending.get(key);
    }
  };
}
