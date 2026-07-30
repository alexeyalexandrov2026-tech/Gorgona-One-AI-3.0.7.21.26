"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { matchActionCards, matchSuggestions } from '../../../lib/aiSuggestions';
import { useLocale } from '../LocaleProvider';
import { unavailableReply } from '../../../lib/ai/locale';

// ===========================================================================
// Gorgona One — the concierge conversation (one thread, every surface).
//
// Mounted once in the layout, so the homepage bar, the floating sphere dock
// and the Discovery Room page are three VIEWS OF ONE CONVERSATION rather than
// three chats that each forget what the others heard. Ask on the homepage,
// open the sphere, continue on /discovery: same transcript, same backend
// session, same cards.
//
// State that must stay consistent across the surfaces:
//   messages    the transcript
//   sessionId   the local brain's server-side memory handle (see
//               lib/ai/localBrain.js - the service rebuilds context from it,
//               so losing it would silently restart the conversation)
//   cards       navigation frames for the newest reply
//   isLoading   so every surface shows the same typing state
//
// Persisted to sessionStorage: a full page load (not client-side navigation)
// keeps the thread, while a new tab starts clean.
//
// FAILURE POLICY: send() never throws and never logs. /api/chat always
// answers 200 with a well-formed body, so a catch here means the network or
// the server itself is gone - and even then the guest gets a concierge-voiced
// line PLUS working navigation cards, because the card matcher runs
// client-side from the very same module the server uses.
// ===========================================================================

const ChatContext = createContext(null);

const STORAGE_KEY = 'gorgona-concierge-thread';
const MAX_MESSAGES = 40;
// Above the server's own budget so the server's graceful answer wins the race
// in the normal case; this only fires if the request never comes back at all.
const CLIENT_TIMEOUT_MS = 60_000;

// Used before the provider mounts (or if a surface is ever rendered outside
// it): inert, but shaped like the real thing so no consumer needs a guard.
const NOOP = {
  messages: [],
  cards: [],
  suggestions: [],
  isLoading: false,
  hydrated: false,
  send() {},
  reset() {}
};

export function ChatProvider({ children }) {
  // The active UI language. Sent with every turn so the model answers in it,
  // and used for the offline fallback line - a guest browsing in Japanese
  // must not be told in English that the concierge is unavailable.
  const locale = useLocale();
  const [messages, setMessages] = useState([]);
  const [cards, setCards] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Transport bookkeeping, not view state - a ref so updating it never
  // re-renders three surfaces.
  const sessionIdRef = useRef(null);
  // Guards against overlapping sends racing each other's results.
  const inFlightRef = useRef(false);

  // Restore the thread on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.messages)) setMessages(data.messages);
        if (Array.isArray(data.cards)) setCards(data.cards);
        if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
        if (typeof data.sessionId === 'string') sessionIdRef.current = data.sessionId;
      }
    } catch {
      /* malformed or blocked storage - start fresh */
    }
    setHydrated(true);
  }, []);

  // Persist whenever the thread changes (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages, cards, suggestions, sessionId: sessionIdRef.current })
      );
    } catch {
      /* storage full or blocked - non-fatal, the thread just won't survive a reload */
    }
  }, [messages, cards, suggestions, hydrated]);

  const send = useCallback(async (rawText) => {
    const content = String(rawText || '').trim();
    if (!content || inFlightRef.current) return;

    inFlightRef.current = true;
    const nextMessages = [...messages, { role: 'user', content }].slice(-MAX_MESSAGES);
    setMessages(nextMessages);
    setIsLoading(true);
    setCards([]);
    setSuggestions([]);

    // A stalled request must never leave the typing indicator spinning
    // forever. Local models are slow, so the budget is generous.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    let answer = unavailableReply(locale);
    // Computed up front from the guest's own words: if the request never
    // reaches the server, these are the cards the guest still gets. The
    // matcher is multilingual, so this holds for any of the 16 UI languages.
    let nextCards = matchActionCards(content, { locale });
    let nextSuggestions = matchSuggestions(content);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          locale,
          ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {})
        }),
        signal: controller.signal
      });

      // A non-JSON body (proxy error page, truncated response) resolves to
      // null instead of throwing, so one code path covers every outcome.
      const data = await response.json().catch(() => null);

      if (typeof data?.reply === 'string' && data.reply.trim()) {
        answer = data.reply.trim();
      }
      // The server ran the same matcher with the reply text as well, so its
      // answer is at least as good as the local one - but only take it if it
      // actually produced something.
      if (Array.isArray(data?.cards) && data.cards.length) nextCards = data.cards;
      if (Array.isArray(data?.suggestions) && data.suggestions.length) nextSuggestions = data.suggestions;
      if (typeof data?.sessionId === 'string' && data.sessionId) sessionIdRef.current = data.sessionId;
    } catch {
      /* aborted, offline, or blocked - the locally matched cards stand */
    } finally {
      clearTimeout(timeout);
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: answer }].slice(-MAX_MESSAGES));
    setCards(nextCards);
    setSuggestions(nextSuggestions);
    setIsLoading(false);
    inFlightRef.current = false;

    return answer;
  }, [messages, locale]);

  const reset = useCallback(() => {
    setMessages([]);
    setCards([]);
    setSuggestions([]);
    sessionIdRef.current = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* blocked storage - in-memory reset already happened */
    }
  }, []);

  const value = useMemo(
    () => ({ messages, cards, suggestions, isLoading, hydrated, send, reset }),
    [messages, cards, suggestions, isLoading, hydrated, send, reset]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useConciergeChat() {
  return useContext(ChatContext) || NOOP;
}
