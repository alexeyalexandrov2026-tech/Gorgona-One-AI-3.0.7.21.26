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
// The mobile apps share this storage through their web views: they hand changes to
// window.__miamiFavorite (or queues them under PENDING before a page loads)
// and hears the current list back on the existing message channel.
// ===========================================================================

const STORAGE = 'gorgona-favorites';
const PENDING = 'gorgona-favorites-pending';
const Context = createContext(null);
const NOOP = { items: [], ready: false, mode: 'local', has: () => false, toggle() {}, set() {} };

const readList = (key) => { try { return favoriteList(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return []; } };
function writeList(key, list) {
  try {
    if (list.length) localStorage.setItem(key, JSON.stringify(list));
    else localStorage.removeItem(key);
    return true;
  } catch { return false; }
}
function takePending() {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING) || '[]');
    localStorage.removeItem(PENDING);
    return (Array.isArray(raw) ? raw : []).slice(-50).filter((op) => op && typeof op.on === 'boolean' && favoriteItem(op));
  } catch { return []; }
}
function postToApp(message) {
  try { window.webkit.messageHandlers.miamiElio.postMessage(message); } catch { /* not in the app */ }
}

function tellApp(items, owner) {
  const app = document.documentElement.getAttribute('data-app');
  const favorites = items.map((item) => favoriteKey(item.kind, item.slug));
  if (app === 'ios') postToApp({ favorites });
  if (app === 'android') postToApp({ favorites, favoritesOwner: owner, favoritesVersion: 2 });
}

export function FavoritesProvider({ children }) {
  const auth = useAuth();
  const userId = auth?.session?.id || null;
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('local');
  const [readyOwner, setReadyOwner] = useState(undefined);
  const ready = !auth?.loading && readyOwner === userId;
  const itemsRef = useRef(items), modeRef = useRef(mode);
  const activeUser = useRef(undefined);
  activeUser.current = auth?.loading ? undefined : userId;
  itemsRef.current = items; modeRef.current = mode;

  const api = useCallback(async (method, body) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token || data.session.user.id !== userId) throw new Error('Session changed');
    const response = await fetch('/api/favorites', { method, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error('Favourites unavailable'), { status: response.status });
    if (!Array.isArray(result.favorites)) throw new Error('Invalid favourites response');
    return favoriteList(result.favorites);
  }, [userId]);

  const load = useCallback(async () => {
    const local = readList(STORAGE);
    if (!userId) {
      itemsRef.current = local;
      modeRef.current = 'local';
      setItems(local);
      setMode('local');
      return;
    }
    try {
      // Device favourites move into the account once, then leave the device.
      let list;
      for (let start = 0; start < local.length; start += 100) {
        list = await api('POST', { changes: local.slice(start, start + 100).map((item) => ({ kind: item.kind, slug: item.slug, on: true })) });
      }
      list ??= await api('GET');
      if (activeUser.current !== userId) return;
      if (local.length) writeList(STORAGE, []);
      itemsRef.current = list;
      modeRef.current = 'account';
      setItems(list);
      setMode('account');
    } catch {
      if (activeUser.current !== userId) return;
      itemsRef.current = local;
      modeRef.current = 'local';
      setItems(local);
      setMode('local');
    }
  }, [userId, api]);

  const set = useCallback(async (value, on) => {
    if (activeUser.current !== userId) return false;
    const item = favoriteItem(value);
    if (!item) return false;
    const key = favoriteKey(item.kind, item.slug);
    const before = itemsRef.current;
    const without = before.filter((x) => favoriteKey(x.kind, x.slug) !== key);
    const next = on ? favoriteList([item, ...without]) : without;
    if (modeRef.current !== 'account') {
      if (!writeList(STORAGE, next)) return false;
      itemsRef.current = next;
      setItems(next);
      return true;
    }
    try {
      const result = await api('POST', { changes: [{ kind: item.kind, slug: item.slug, on }] });
      if (activeUser.current !== userId) return false;
      itemsRef.current = result;
      setItems(result);
      return true;
    } catch {
      return false;
    }
  }, [api, userId]);

  const has = useCallback((kind, slug) => items.some((x) => x.kind === kind && x.slug === slug), [items]);
  const toggle = useCallback((value) => set(value, !itemsRef.current.some((x) => x.kind === value?.kind && x.slug === value?.slug)), [set]);

  useEffect(() => {
    if (auth?.loading) return undefined;
    let active = true;
    load().finally(() => { if (active) setReadyOwner(userId); });
    return () => { active = false; };
  }, [auth?.loading, load, userId]);

  // Changes from the app, and from another tab of this browser.
  useEffect(() => {
    if (!ready || auth?.loading) return undefined;
    let changes = Promise.resolve();
    const enqueue = (op) => {
      if (op && typeof op.on === 'boolean') {
        changes = changes.then(() => set(op, op.on)).catch(() => {});
      }
    };
    window.__miamiFavorite = enqueue;
    window.__miamiFavoriteV2 = (op) => {
      if (!/^[0-9a-f-]{36}$/.test(op?.receipt || '')) return;
      changes = changes.then(async () => {
        let saved = false;
        try {
          // The WebView may have changed accounts since Android queued the edit.
          const { data, error } = await supabase.auth.getSession();
          const actual = data?.session?.user?.id || null;
          if (!error && actual === userId && activeUser.current === userId && op.owner === userId &&
              typeof op.on === 'boolean' && (!userId || modeRef.current === 'account')) {
            saved = await set(op, op.on);
          }
        } finally {
          postToApp({ favoriteReceipt: { id: op.receipt, saved } });
        }
      }).catch(() => {});
    };
    window.__miamiFavoritesRefresh = () => { changes = changes.then(load).catch(() => {}); };
    for (const op of takePending()) enqueue(op);
    const onStorage = (event) => { if (event.key === STORAGE && modeRef.current === 'local') setItems(readList(STORAGE)); };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      delete window.__miamiFavorite;
      delete window.__miamiFavoriteV2;
      delete window.__miamiFavoritesRefresh;
    };
  }, [ready, auth?.loading, set, load, userId]);

  useEffect(() => {
    if (!ready || (userId && mode !== 'account')) return;
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active && !error && activeUser.current === userId && (data?.session?.user?.id || null) === userId) {
        tellApp(items, userId);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [ready, items, mode, userId]);

  const value = useMemo(() => ready ? { items, ready, mode, has, toggle, set } : NOOP, [items, ready, mode, has, toggle, set]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useFavorites() {
  return useContext(Context) || NOOP;
}
