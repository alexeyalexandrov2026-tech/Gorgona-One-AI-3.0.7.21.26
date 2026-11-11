"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '../../lib/supabase';
import { favoriteItem, favoriteKey, favoriteList } from '../../lib/favoriteRules.mjs';

// ===========================================================================
// Favourites for "My Miami". Signed out: kept on this device (localStorage).
// Signed in: kept in the account (/api/favorites), and anything saved on the
// device first is moved into the account. If the account service is not on
// yet (MY_MIAMI_ENABLED), the device list keeps working.
//
// The iOS app shares this storage through its web views: it hands changes to
// window.__miamiFavorite (or queues them under PENDING before a page loads)
// and hears the current list back on the existing message channel.
// ===========================================================================

const STORAGE = 'gorgona-favorites';
const PENDING = 'gorgona-favorites-pending';
const Context = createContext(null);
const NOOP = { items: [], ready: false, mode: 'local', has: () => false, toggle() {}, set() {} };

const readList = (key) => { try { return favoriteList(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return []; } };
const writeList = (key, list) => { try { if (list.length) localStorage.setItem(key, JSON.stringify(list)); else localStorage.removeItem(key); } catch { /* storage blocked */ } };
function takePending() {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING) || '[]');
    localStorage.removeItem(PENDING);
    return (Array.isArray(raw) ? raw : []).slice(-50).filter((op) => op && typeof op.on === 'boolean' && favoriteItem(op));
  } catch { return []; }
}
function tellApp(items) {
  if (document.documentElement.getAttribute('data-app') !== 'ios') return;
  try { window.webkit.messageHandlers.miamiElio.postMessage({ favorites: items.map((item) => favoriteKey(item.kind, item.slug)) }); } catch { /* not in the app */ }
}

export function FavoritesProvider({ children }) {
  const auth = useAuth();
  const userId = auth?.session?.id || null;
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('local');
  const [ready, setReady] = useState(false);
  const itemsRef = useRef(items), modeRef = useRef(mode);
  itemsRef.current = items; modeRef.current = mode;

  const api = useCallback(async (method, body) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token || data.session.user.id !== userId) throw new Error('Session changed');
    const response = await fetch('/api/favorites', { method, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error('Favourites unavailable'), { status: response.status });
    return favoriteList(result.favorites);
  }, [userId]);

  const load = useCallback(async () => {
    const local = readList(STORAGE);
    if (!userId) { setItems(local); setMode('local'); return; }
    try {
      // Device favourites move into the account once, then leave the device.
      const list = local.length ? await api('POST', { changes: local.slice(0, 100).map((item) => ({ kind: item.kind, slug: item.slug, on: true })) }) : await api('GET');
      if (local.length) writeList(STORAGE, []);
      setItems(list); setMode('account');
    } catch {
      setItems(local); setMode('local');
    }
  }, [userId, api]);

  const set = useCallback(async (value, on) => {
    const item = favoriteItem(value);
    if (!item) return;
    const key = favoriteKey(item.kind, item.slug);
    const before = itemsRef.current;
    const next = on ? [item, ...before.filter((x) => favoriteKey(x.kind, x.slug) !== key)] : before.filter((x) => favoriteKey(x.kind, x.slug) !== key);
    setItems(next);
    if (modeRef.current !== 'account') { writeList(STORAGE, next); return; }
    try { setItems(await api('POST', { changes: [{ kind: item.kind, slug: item.slug, on }] })); }
    catch { setItems(before); }
  }, [api]);

  const has = useCallback((kind, slug) => items.some((x) => x.kind === kind && x.slug === slug), [items]);
  const toggle = useCallback((value) => set(value, !itemsRef.current.some((x) => x.kind === value?.kind && x.slug === value?.slug)), [set]);

  useEffect(() => {
    if (auth?.loading) return undefined;
    let active = true;
    load().finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [auth?.loading, load]);

  // Changes from the app, and from another tab of this browser.
  useEffect(() => {
    if (!ready) return undefined;
    window.__miamiFavorite = (op) => { if (op && typeof op.on === 'boolean') set(op, op.on); };
    window.__miamiFavoritesRefresh = () => { load(); };
    (async () => { for (const op of takePending()) await set(op, op.on); })();
    const onStorage = (event) => { if (event.key === STORAGE && modeRef.current === 'local') setItems(readList(STORAGE)); };
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('storage', onStorage); delete window.__miamiFavorite; delete window.__miamiFavoritesRefresh; };
  }, [ready, set, load]);

  useEffect(() => { if (ready) tellApp(items); }, [ready, items]);

  const value = useMemo(() => ({ items, ready, mode, has, toggle, set }), [items, ready, mode, has, toggle, set]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useFavorites() {
  return useContext(Context) || NOOP;
}
