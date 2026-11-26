"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { chatSnapshot, isDegradedResponse } from '../../../lib/ai/session.mjs';
import { chatPayload, sanitizeSavedPrefs } from '../../../lib/ai/chatRequest.mjs';
import { stripStreamingMarkdown } from '../../../lib/ai/streamingMarkdown.mjs';
import { useLocale, useLocaleReady } from '../LocaleProvider';
import { CLIENT_TIMEOUT_MS } from '../../../lib/ai/chatDeadline.mjs';
import { useHydratedValue } from '../useHydratedValue';
import { supabase } from '../../../lib/supabase';

const ChatContext = createContext(null);

const STORAGE_KEY = 'gorgona-concierge-thread';
const PREFS_STORAGE_KEY = 'gorgona-concierge-vip-prefs';
const THREAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 40;

async function buildConversationSummary(allMessages, savedPrefs) {
  if (!Array.isArray(allMessages) || allMessages.length <= 10) return '';
  const dropped = allMessages.slice(0, -10).filter((m) => m?.role === 'user' && typeof m.content === 'string');
  if (!dropped.length) return '';
  const { extractTripProfile, tripProfilePromptLine } = await import('../../../lib/ai/tripProfile.mjs');
  const profileLine = tripProfilePromptLine(extractTripProfile(allMessages.slice(0, -10), new Date(), savedPrefs));
  const topics = dropped
    .slice(-4)
    .map((m) => m.content.replace(/\s+/g, ' ').trim().slice(0, 72))
    .filter(Boolean)
    .join(' | ');
  return [profileLine, topics ? `Earlier requests: ${topics}` : ''].filter(Boolean).join(' ').slice(0, 380);
}

const NOOP = {
  messages: [],
  cards: [],
  suggestions: [],
  listings: [],
  plan: null,
  savedPrefs: null,
  streamingText: '',
  streamStatus: '',
  isLoading: false,
  hydrated: false,
  send() {},
  stop() {},
  reset() {}
};

async function readSseChatStream(response, { onStatus, onPreview, onDelta, onReset }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalData = null;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
        let eventName = 'message';
        const dataLines = [];
        for (const line of frame.split(/\r?\n/)) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (!dataLines.length) continue;
        let parsed = null;
        try { parsed = JSON.parse(dataLines.join('\n')); } catch { continue; }
        if (eventName === 'status' && typeof parsed?.label === 'string') onStatus?.(parsed.label);
        else if (eventName === 'preview') onPreview?.(parsed);
        else if (eventName === 'reset') onReset?.();
        else if (eventName === 'delta' && typeof parsed?.text === 'string') onDelta?.(parsed.text);
        else if (eventName === 'done') finalData = parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return finalData;
}

export function ChatProvider({ children }) {
  const locale = useLocale();
  const localeReady = useLocaleReady();
  const pathname = usePathname() || '';
  const [messages, setMessages] = useState([]);
  const [cards, setCards] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [listings, setListings] = useState([]);
  const [plan, setPlan] = useState(null);
  const [savedPrefs, setSavedPrefs] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamStatus, setStreamStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [storageReady, setHydrated] = useState(false);
  const hydrated = storageReady && localeReady;

  const sessionIdRef = useRef(null);
  const inFlightRef = useRef(false);
  const operationRef = useRef(null);
  const generationRef = useRef(0);
  const streamingRef = useRef('');
  const userStoppedRef = useRef(false);

  useEffect(() => () => { generationRef.current++; operationRef.current?.abort(); }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const expired = Number.isFinite(parsed?.savedAt) && Date.now() - parsed.savedAt > THREAD_TTL_MS;
        if (expired) {
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(STORAGE_KEY);
        } else {
          const data = chatSnapshot(parsed);
          setMessages(data.messages);
          setCards(data.cards);
          setSuggestions(data.suggestions);
          setListings(data.listings || []);
          setPlan(data.plan || null);
          sessionIdRef.current = data.sessionId;
        }
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

  useEffect(() => {
    if (!hydrated) return undefined;
    try {
      const serialized = JSON.stringify({
        messages,
        cards,
        suggestions,
        listings,
        plan,
        sessionId: sessionIdRef.current,
        savedAt: Date.now()
      });
      localStorage.setItem(STORAGE_KEY, serialized);
      sessionStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      /* storage full or blocked - non-fatal */
    }
    if (!messages.length) return undefined;
    let active = true;
    import('../../../lib/ai/tripProfile.mjs')
      .then(({ extractDurablePrefs, extractTripProfile }) => {
        if (!active) return;
        const durable = extractDurablePrefs(extractTripProfile(messages, new Date(), savedPrefs));
        if (durable) {
          try { localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(durable)); } catch {}
          if (JSON.stringify(durable) !== JSON.stringify(savedPrefs)) setSavedPrefs(durable);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [messages, cards, suggestions, listings, plan, hydrated, savedPrefs]);

  const stop = useCallback(() => {
    if (!inFlightRef.current) return;
    userStoppedRef.current = true;
    operationRef.current?.abort();
  }, []);

  const send = useCallback(async (rawText, options = {}) => {
    const content = String(rawText || '').trim();
    const voiceMode = options?.voiceMode === true;
    if (!hydrated || !content || content.length > 4000 || inFlightRef.current) return;

    inFlightRef.current = true;
    userStoppedRef.current = false;
    streamingRef.current = '';
    setStreamingText('');
    setStreamStatus('');
    const nextMessages = [...messages, { role: 'user', content }].slice(-MAX_MESSAGES);
    setMessages(nextMessages);
    setIsLoading(true);

    const controller = new AbortController();
    const generation = ++generationRef.current;
    operationRef.current = controller;
    let timeout;

    let navigation = { cards: [], suggestions: [] };
    try {
      const { conversationNavigation } = await import('../../../lib/ai/conversation.mjs');
      if (generation !== generationRef.current) {
        inFlightRef.current = false;
        return;
      }
      navigation = conversationNavigation(nextMessages, { locale });
    } catch {
      /* non-fatal - server response still provides authoritative cards */
    }
    setCards(navigation.cards);
    setSuggestions(navigation.suggestions);
    setListings([]);
    setPlan(null);

    let answer = '';
    let handoff = false;
    let degraded = true;
    let nextReplyLocale = null;
    let nextCards = navigation.cards;
    let nextSuggestions = navigation.suggestions;
    let nextListings = [];
    let nextPlan = null;
    let nextFollowups = [];
    let nextHandoffSummary = '';
    let prepared = null;

    try {
      let authToken = null;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        authToken = sessionData?.session?.access_token || null;
      } catch {}

      const conversationSummary = await buildConversationSummary(nextMessages, savedPrefs);
      timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(globalThis.crypto?.randomUUID ? { 'Idempotency-Key': crypto.randomUUID() } : {})
        },
        body: JSON.stringify(chatPayload(nextMessages, { locale, sessionId: sessionIdRef.current, pagePath: pathname, savedPrefs, conversationSummary, voiceMode })),
        signal: controller.signal
      });

      const contentType = (response.headers?.get?.('content-type') || '').toLowerCase();
      let data = null;
      if (response.ok && contentType.includes('text/event-stream') && response.body) {
        data = await readSseChatStream(response, {
          onStatus: (label) => {
            if (generation === generationRef.current) setStreamStatus(label);
          },
          onPreview: (preview) => {
            if (generation !== generationRef.current) return;
            const snap = chatSnapshot(preview);
            if (snap.cards.length) {
              nextCards = snap.cards;
              setCards(snap.cards);
            }
            if (snap.suggestions.length) {
              nextSuggestions = snap.suggestions;
              setSuggestions(snap.suggestions);
            }
          },
          onReset: () => {
            if (generation !== generationRef.current) return;
            streamingRef.current = '';
            setStreamingText('');
          },
          onDelta: (chunk) => {
            if (generation !== generationRef.current) return;
            streamingRef.current += chunk;
            setStreamingText(streamingRef.current);
          }
        });
      } else {
        data = await response.json().catch(() => null);
      }

      if (response.ok && typeof data?.reply === 'string' && data.reply.trim()) {
        answer = data.reply.trim();
        handoff = data.handoff === true;
        degraded = isDegradedResponse(response.ok, data);
        if (typeof data.replyLocale === 'string' && data.replyLocale.trim()) {
          nextReplyLocale = data.replyLocale.trim();
        }
        if (Array.isArray(data.followups) && data.followups.length) {
          nextFollowups = data.followups.filter((f) => typeof f === 'string' && f.trim()).slice(0, 3);
        }
        if (typeof data.handoffSummary === 'string' && data.handoffSummary.trim()) {
          nextHandoffSummary = data.handoffSummary.trim().slice(0, 260);
        }
        if (data.tripPatch && typeof data.tripPatch === 'object') {
          const mergedPrefs = sanitizeSavedPrefs({ ...(savedPrefs || {}), ...data.tripPatch });
          if (mergedPrefs && generation === generationRef.current) {
            setSavedPrefs(mergedPrefs);
            try { localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(mergedPrefs)); } catch {}
          }
        }
      }
      const safe = chatSnapshot(data);
      const authoritative = response.ok && data?.responsePolicy === 'conversation-v1';
      if (safe.cards.length || (authoritative && Array.isArray(data.cards))) nextCards = safe.cards;
      if (safe.suggestions.length || (authoritative && Array.isArray(data.suggestions))) nextSuggestions = safe.suggestions;
      if (response.ok && Array.isArray(data?.listings)) nextListings = safe.listings;
      if (response.ok && data && Object.prototype.hasOwnProperty.call(data, 'plan')) nextPlan = safe.plan;
      if (generation === generationRef.current && safe.sessionId) sessionIdRef.current = safe.sessionId;
    } catch {
      /* aborted, offline, or blocked - local fallback or partial stopped text */
    } finally {
      clearTimeout(timeout);
      if (generation !== generationRef.current) {
        inFlightRef.current = false;
        return;
      }
      const wasStoppedByUser = userStoppedRef.current;
      const partialText = stripStreamingMarkdown(streamingRef.current).replace(/\\+$/, '').trim();
      setStreamingText('');
      setStreamStatus('');
      streamingRef.current = '';

      if (wasStoppedByUser) {
        operationRef.current = null;
        if (partialText) {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: partialText,
            degraded: true,
            ...(nextCards.length ? { cards: nextCards } : {}),
            ...(nextSuggestions.length ? { suggestions: nextSuggestions } : {})
          }].slice(-MAX_MESSAGES));
        }
        setIsLoading(false);
        inFlightRef.current = false;
        return;
      }

      if (!answer) {
        prepared = await import('../../../lib/ai/catalogueAnswer.mjs').then(async (mod) => {
          const answerSet = mod.catalogueAnswer(nextMessages, locale);
          const [{ buildPlan }, { syncPlanCatalog }] = await Promise.all([
            import('../../../lib/ai/plan.mjs'),
            import('../../../lib/ai/syncPlanCatalog.mjs')
          ]);
          return { ...answerSet, plan: buildPlan(nextMessages, { catalog: syncPlanCatalog(), locale }) };
        }).catch(() => null);
        if (generation !== generationRef.current) {
          inFlightRef.current = false;
          return;
        }
        if (prepared?.listings?.length) nextListings = prepared.listings;
        if (prepared?.plan) nextPlan = prepared.plan;
        if (prepared?.matched) {
          answer = prepared.reply;
        } else {
          const { unavailableReply } = await import('../../../lib/ai/locale');
          answer = unavailableReply(locale);
        }
        handoff = prepared?.handoff === true;
        degraded = true;
      }
      operationRef.current = null;
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: answer,
        ...(handoff ? { handoff: true } : {}),
        ...(degraded ? { degraded: true } : {}),
        ...(nextReplyLocale ? { replyLocale: nextReplyLocale } : {}),
        ...(nextCards.length ? { cards: nextCards } : {}),
        ...(nextSuggestions.length ? { suggestions: nextSuggestions } : {}),
        ...(nextListings.length ? { listings: nextListings } : {}),
        ...(nextPlan ? { plan: nextPlan } : {}),
        ...(nextFollowups.length ? { followups: nextFollowups } : {}),
        ...(nextHandoffSummary ? { handoffSummary: nextHandoffSummary } : {})
      }].slice(-MAX_MESSAGES));
      setCards(nextCards);
      setSuggestions(nextSuggestions);
      setListings(nextListings);
      setPlan(nextPlan);
      setIsLoading(false);
      inFlightRef.current = false;
    }

    return answer;
  }, [messages, locale, hydrated, pathname, savedPrefs]);

  const reset = useCallback((opts = {}) => {
    const clearPrefs = Boolean(opts && typeof opts === 'object' && opts.clearPrefs === true);
    generationRef.current++;
    operationRef.current?.abort();
    operationRef.current = null;
    inFlightRef.current = false;
    streamingRef.current = '';
    setStreamingText('');
    setStreamStatus('');
    setIsLoading(false);
    setMessages([]);
    setCards([]);
    setSuggestions([]);
    setListings([]);
    setPlan(null);
    if (clearPrefs) setSavedPrefs(null);
    sessionIdRef.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      if (clearPrefs) localStorage.removeItem(PREFS_STORAGE_KEY);
    } catch {
      /* blocked storage - in-memory reset already happened */
    }
  }, []);

  const value = useMemo(
    () => ({ messages, cards, suggestions, listings, plan, savedPrefs, streamingText, streamStatus, isLoading, hydrated, send, stop, reset }),
    [messages, cards, suggestions, listings, plan, savedPrefs, streamingText, streamStatus, isLoading, hydrated, send, stop, reset]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useConciergeChat() {
  return useHydratedValue(useContext(ChatContext) || NOOP, NOOP);
}
