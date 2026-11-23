"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { conversationNavigation } from '../../../lib/ai/conversation.mjs';
import { chatSnapshot, isDegradedResponse } from '../../../lib/ai/session.mjs';
import {chatPayload, sanitizeSavedPrefs} from '../../../lib/ai/chatRequest.mjs';
import { extractDurablePrefs, extractTripProfile } from '../../../lib/ai/tripProfile.mjs';
import { useLocale, useLocaleReady } from '../LocaleProvider';
import { unavailableReply } from '../../../lib/ai/locale';
import { CLIENT_TIMEOUT_MS } from '../../../lib/ai/chatDeadline.mjs';
import {useHydratedValue} from '../useHydratedValue';

// ===========================================================================
// Miami Elio — the concierge conversation (one thread, every surface).
//
// Mounted once in the layout, so the homepage bar, the floating sphere dock
// and the Discovery Room page are three VIEWS OF ONE CONVERSATION rather than
// three chats that each forget what the others heard. Ask on the homepage,
// open the sphere, continue on /discovery: same transcript, same backend
// session, same cards.
//
// State that must stay consistent across the surfaces:
//   messages    the transcript
//   sessionId   an opaque handle echoed back to /api/chat when the server
//               supplies one (the current Workers AI chain does not)
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
const PREFS_STORAGE_KEY = 'gorgona-concierge-vip-prefs';
const MAX_MESSAGES = 40;
// Above the server's own budget so the server's graceful answer wins the race
// in the normal case; this only fires if the request never comes back at all.

// Used before the provider mounts (or if a surface is ever rendered outside
// it): inert, but shaped like the real thing so no consumer needs a guard.
const NOOP = {
  messages: [],
  cards: [],
  suggestions: [],
  listings: [],
  plan: null,
  savedPrefs: null,
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
  const localeReady = useLocaleReady();
  const pathname = usePathname() || '';
  const [messages, setMessages] = useState([]);
  const [cards, setCards] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [listings, setListings] = useState([]);
  const [plan, setPlan] = useState(null);
  const [savedPrefs, setSavedPrefs] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [storageReady, setHydrated] = useState(false);
  const hydrated = storageReady && localeReady;

  // Transport bookkeeping, not view state - a ref so updating it never
  // re-renders three surfaces.
  const sessionIdRef = useRef(null);
  // Guards against overlapping sends racing each other's results.
  const inFlightRef = useRef(false);
  const operationRef = useRef(null), generationRef = useRef(0);
  useEffect(()=>()=>{generationRef.current++;operationRef.current?.abort();},[]);

  // Restore the thread on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = chatSnapshot(JSON.parse(raw));
        setMessages(data.messages);setCards(data.cards);setSuggestions(data.suggestions);setListings(data.listings||[]);setPlan(data.plan||null);
        sessionIdRef.current = data.sessionId;
      }
      const rawPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
      if (rawPrefs) {
        const cleanPrefs = sanitizeSavedPrefs(JSON.parse(rawPrefs));
        if (cleanPrefs) setSavedPrefs(cleanPrefs);
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
        JSON.stringify({ messages, cards, suggestions, listings, plan, sessionId: sessionIdRef.current })
      );
      if (messages.length) {
        const durable = extractDurablePrefs(extractTripProfile(messages, new Date(), savedPrefs));
        if (durable) {
          localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(durable));
          if (JSON.stringify(durable) !== JSON.stringify(savedPrefs)) setSavedPrefs(durable);
        }
      }
    } catch {
      /* storage full or blocked - non-fatal, the thread just won't survive a reload */
    }
  }, [messages, cards, suggestions, listings, plan, hydrated, savedPrefs]);

  const send = useCallback(async (rawText) => {
    const content = String(rawText || '').trim();
    if (!hydrated || !content || content.length>4000 || inFlightRef.current) return;

    inFlightRef.current = true;
    const nextMessages = [...messages, { role: 'user', content }].slice(-MAX_MESSAGES);
    setMessages(nextMessages);
    setIsLoading(true);
    // Links appear before the model answers, so a slow or hung request never
    // leaves an empty dock. The same matcher runs if the network never returns.
    const navigation=conversationNavigation(nextMessages,{locale});
    setCards(navigation.cards);
    setSuggestions(navigation.suggestions);
    setListings([]);
    setPlan(null);

    const controller = new AbortController();
    const generation=++generationRef.current;operationRef.current=controller;
    // Started just before the request leaves, so loading the local fallback
    // does not eat into the time the server has to answer.
    let timeout;

    let answer = '';
    let handoff = false;
    // Offline unless the server says a real engine answered: like the Android
    // app, a degraded turn is shown but never sent back as history.
    let degraded = true;
    let nextCards=navigation.cards,nextSuggestions=navigation.suggestions,nextListings=[],nextPlan=null;
    let prepared=null;

    try {
      timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',...(globalThis.crypto?.randomUUID?{'Idempotency-Key':crypto.randomUUID()}:{}) },
        body: JSON.stringify(chatPayload(nextMessages,{locale,sessionId:sessionIdRef.current,pagePath:pathname,savedPrefs})),
        signal: controller.signal
      });

      // A non-JSON body (proxy error page, truncated response) resolves to
      // null instead of throwing, so one code path covers every outcome.
      const data = await response.json().catch(() => null);

      if (response.ok && typeof data?.reply === 'string' && data.reply.trim()) {
        answer = data.reply.trim();
        handoff = data.handoff === true;
        degraded = isDegradedResponse(response.ok, data);
      }
      // Conversation replies can explicitly omit navigation, even when the
      // offline matcher recognized a place or section name in the question.
      const safe=chatSnapshot(data);
      const authoritative=response.ok&&data?.responsePolicy==='conversation-v1';
      if (safe.cards.length||(authoritative&&Array.isArray(data.cards))) nextCards = safe.cards;
      if (safe.suggestions.length||(authoritative&&Array.isArray(data.suggestions))) nextSuggestions = safe.suggestions;
      if (response.ok && Array.isArray(data?.listings)) nextListings = safe.listings;
      if (response.ok && data && Object.prototype.hasOwnProperty.call(data,'plan')) nextPlan = safe.plan;
      if (generation===generationRef.current&&safe.sessionId)sessionIdRef.current=safe.sessionId;
    } catch {
      /* aborted, offline, or blocked - the locally matched cards stand */
    } finally {
      clearTimeout(timeout);
      if(generation!==generationRef.current){
        inFlightRef.current=false;
        return;
      }
      if(!answer){
        prepared=await import('../../../lib/ai/catalogueAnswer.mjs').then(async (mod)=>{
          const answerSet=mod.catalogueAnswer(nextMessages,locale);
          const [{buildPlan},{syncPlanCatalog}]=await Promise.all([
            import('../../../lib/ai/plan.mjs'),
            import('../../../lib/ai/syncPlanCatalog.mjs')
          ]);
          return {...answerSet,plan:buildPlan(nextMessages,{catalog:syncPlanCatalog(),locale})};
        }).catch(()=>null);
        if(generation!==generationRef.current){
          inFlightRef.current=false;
          return;
        }
        if(prepared?.listings?.length) nextListings = prepared.listings;
        if(prepared?.plan) nextPlan = prepared.plan;
        answer = prepared?.matched ? prepared.reply : unavailableReply(locale);
        handoff = prepared?.handoff === true;
        degraded = true;
      }
      operationRef.current=null;
      setMessages(prev=>[...prev,{role:'assistant',content:answer,...(handoff?{handoff:true}:{}),...(degraded?{degraded:true}:{})}].slice(-MAX_MESSAGES));
      setCards(nextCards);
      setSuggestions(nextSuggestions);
      setListings(nextListings);
      setPlan(nextPlan);
      setIsLoading(false);
      inFlightRef.current = false;
    }

    return answer;
  }, [messages, locale, hydrated, pathname, savedPrefs]);

  const reset = useCallback(() => {
    generationRef.current++;operationRef.current?.abort();operationRef.current=null;
    inFlightRef.current=false;setIsLoading(false);
    setMessages([]);
    setCards([]);
    setSuggestions([]);
    setListings([]);
    setPlan(null);
    setSavedPrefs(null);
    sessionIdRef.current = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PREFS_STORAGE_KEY);
    } catch {
      /* blocked storage - in-memory reset already happened */
    }
  }, []);

  const value = useMemo(
    () => ({ messages, cards, suggestions, listings, plan, savedPrefs, isLoading, hydrated, send, reset }),
    [messages, cards, suggestions, listings, plan, savedPrefs, isLoading, hydrated, send, reset]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useConciergeChat() {
  return useHydratedValue(useContext(ChatContext) || NOOP,NOOP);
}
