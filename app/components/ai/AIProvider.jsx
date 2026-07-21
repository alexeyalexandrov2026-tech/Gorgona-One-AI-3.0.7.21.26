"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// ===========================================================================
// Gorgona One AI — session state (Phase 3).
//
// Holds the user's live AI session: recent searches, saved results, and the
// Discovery Room open/closed state. Mounted once in the app layout, so the state
// SURVIVES client-side navigation across the whole ecosystem — the user can ask
// on the homepage, browse a listing, and return to the Discovery Room with their
// history, recommendations, and saved items intact. Persisted to localStorage so
// it also survives a reload. No backend — this is the client-side companion.
// ===========================================================================

const AIStateContext = createContext(null);
const STORAGE_KEY = 'gorgona-ai-session';
const MAX_HISTORY = 30;
const MAX_SAVED = 60;

const NOOP = {
  history: [], saved: [], roomOpen: false, hydrated: false,
  recordQuery() {}, saveResult() {}, removeSaved() {}, clearHistory() {},
  openRoom() {}, closeRoom() {}, toggleRoom() {}, isSaved: () => false
};

export function AIProvider({ children }) {
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState([]);
  const [roomOpen, setRoomOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore the session on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.history)) setHistory(data.history);
        if (Array.isArray(data.saved)) setSaved(data.saved);
      }
    } catch {
      /* ignore malformed/blocked storage */
    }
    setHydrated(true);
  }, []);

  // Persist whenever session data changes (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ history, saved }));
    } catch {
      /* storage full/blocked — non-fatal */
    }
  }, [history, saved, hydrated]);

  const recordQuery = useCallback((entry) => {
    const query = (entry?.query || '').trim();
    if (!query) return;
    setHistory((prev) => {
      const next = [
        {
          id: `q-${Date.now()}`,
          at: Date.now(),
          query,
          world: entry.world || null,
          lang: entry.lang || null,
          results: (entry.results || []).slice(0, 6),
          selected: entry.selected || null
        },
        // drop an immediately-preceding duplicate of the same query
        ...prev.filter((h) => h.query.toLowerCase() !== query.toLowerCase())
      ];
      return next.slice(0, MAX_HISTORY);
    });
  }, []);

  const saveResult = useCallback((entity) => {
    if (!entity?.id) return;
    setSaved((prev) => (prev.some((x) => x.id === entity.id) ? prev : [entity, ...prev].slice(0, MAX_SAVED)));
  }, []);

  const removeSaved = useCallback((id) => setSaved((prev) => prev.filter((x) => x.id !== id)), []);
  const clearHistory = useCallback(() => setHistory([]), []);
  const openRoom = useCallback(() => setRoomOpen(true), []);
  const closeRoom = useCallback(() => setRoomOpen(false), []);
  const toggleRoom = useCallback(() => setRoomOpen((o) => !o), []);

  const value = useMemo(
    () => ({
      history, saved, roomOpen, hydrated,
      recordQuery, saveResult, removeSaved, clearHistory, openRoom, closeRoom, toggleRoom,
      isSaved: (id) => saved.some((x) => x.id === id)
    }),
    [history, saved, roomOpen, hydrated, recordQuery, saveResult, removeSaved, clearHistory, openRoom, closeRoom, toggleRoom]
  );

  return <AIStateContext.Provider value={value}>{children}</AIStateContext.Provider>;
}

export function useAI() {
  return useContext(AIStateContext) || NOOP;
}
