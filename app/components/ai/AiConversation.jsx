"use client";
import { LocalizedText, useSavedText } from "../LocalizedText";


import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVoice } from './useVoice';
import { useConciergeChat } from './ChatProvider';
import { useAuth } from '../AuthProvider';
import { AiActionCards, AiListingCards, AiPlan } from './AiActionCard';
import { useLocale } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18n';
import { STARTER_PROMPTS } from '../../../lib/ai/conciergePrompts';
import { extractTripProfile } from '../../../lib/ai/tripProfile.mjs';
import { formatProfileChips } from '../../../lib/ai/profileChips.mjs';
import { quickRepliesForTurn } from '../../../lib/ai/quickReplies.mjs';
import { thinkingStatusForTurn } from '../../../lib/ai/thinkingStatus.mjs';
import { buildShareablePlanText, buildTelegramShareUrl, buildWhatsAppShareUrl, getShareCopy } from '../../../lib/ai/sharePlan.mjs';
import { buildManagerHandoffUrl, getPageContext, getStage2Copy } from '../../../lib/ai/stage2Copy.mjs';
import {voiceInputUnavailable} from '../../../lib/ai/voiceInputCopy.mjs';
import { configuredManagerTelegram, configuredManagerWhatsApp } from '../../../lib/managerContact.mjs';

// The floating manager buttons hide while the chat is open, so a booking or
// payment answer carries the same live-manager chat links inside the reply.
const managerHref = configuredManagerTelegram();
const managerWhatsAppHref = configuredManagerWhatsApp();

// i18n carries per-locale AI copy; this is the English original, used when a
// locale has not translated the key yet.
const DEFAULT_INTRO =
  'Ask for anything across the MIAMI ELIO ecosystem — travel, dining, yachts, villas, events — and receive elegant, personal recommendations.';

function MicIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3" />
    </svg>
  );
}

function formatAssistantDisplay(raw) {
  const text = String(raw || '').trim();
  if (!text || text.includes('\n') || text.length < 220) return text;
  // Break long single-block answers into two breathable paragraphs at a natural sentence boundary.
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+(?:\s+|$)|[^.!?。！？]+$/g);
  if (!sentences || sentences.length < 3) return text;
  const splitAt = Math.ceil(sentences.length / 2);
  return `${sentences.slice(0, splitAt).join('').trim()}\n\n${sentences.slice(splitAt).join('').trim()}`;
}

function CopyIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ThumbUpIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbDownIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

function AnswerActions({ question, answer, locale }) {
  const msg = useSavedText();
  const shareCopy = getShareCopy(locale);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState('idle');
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const inFlight = useRef(false);
  const attempt = useRef(null);

  async function send(event) {
    event.preventDefault();
    if (inFlight.current || state === 'received') return;
    inFlight.current = true;
    setState('sending');
    try {
      const trimmed = note.trim();
      if (attempt.current?.note !== trimmed) attempt.current = { note: trimmed, key: crypto.randomUUID() };
      const response = await fetch('/api/concierge/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.current.key },
        body: JSON.stringify({ question: question.slice(0, 4000), answer: answer.slice(0, 6000), locale, note: trimmed }),
        signal: AbortSignal.timeout(15000),
      });
      if (response.status !== 202 || (await response.json())?.received !== true) throw new Error('Report not received');
      setState('received');
    } catch {
      setState('failed');
    } finally {
      inFlight.current = false;
    }
  }

  function handleCopy() {
    try {
      navigator.clipboard?.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  function handleLike() {
    if (liked) return;
    setLiked(true);
    try {
      fetch('/api/chat?feedback=up', { method: 'GET', keepalive: true }).catch(() => {});
    } catch {}
  }

  return (
    <div className="mt-2 border-t border-white/[0.08] pt-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? shareCopy.copied : shareCopy.copy}
          title={copied ? shareCopy.copied : shareCopy.copy}
          className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          <span>{copied ? shareCopy.copied : shareCopy.copy}</span>
        </button>
        <button
          type="button"
          onClick={handleLike}
          aria-label="👍"
          aria-pressed={liked}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
            liked ? 'bg-brand-gold/20 text-brand-gold' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
          }`}
        >
          <ThumbUpIcon className="h-3.5 w-3.5" />
        </button>
        {state !== 'received' && (
          <button
            type="button"
            aria-label={msg('Report this answer')}
            title={msg('Report this answer')}
            aria-expanded={open}
            onClick={() => {
              setOpen((value) => !value);
              try {
                if (!open) fetch('/api/chat?feedback=down', { method: 'GET', keepalive: true }).catch(() => {});
              } catch {}
            }}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
              open ? 'bg-white/10 text-brand-gold' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
            }`}
          >
            <ThumbDownIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {state === 'received' && (
        <p role="status" className="mt-1.5 text-xs text-zinc-300">{msg('Thank you. The report was sent to our team.')}</p>
      )}
      {open && state !== 'received' && (
        <form onSubmit={send} className="mt-2 grid gap-2 text-xs">
          <label className="grid gap-1">
            <span className="text-zinc-300">{msg('What is wrong with this answer? (optional)')}</span>
            <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000}
              disabled={state === 'sending'} className="rounded-lg border border-white/20 bg-black/30 p-2 text-zinc-100" />
          </label>
          {state === 'failed' && <p role="alert" className="text-rose-300">{msg('Could not send the request. Try again.')}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={state === 'sending'} className="min-h-9 rounded-full bg-brand-gold px-3.5 text-xs font-semibold text-black">
              {state === 'sending' ? msg('Loading...') : msg('Send report')}
            </button>
            <button type="button" disabled={state === 'sending'} className="min-h-9 px-2 text-zinc-300 underline" onClick={() => setOpen(false)}>
              {msg('Cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Message({ role, content, question, locale, handoff = false, degraded = false, smartTelegramHref = null, smartWhatsAppHref = null }) {
  const isUser = role === 'user';
  const t = getTranslation(locale);
  const displayed = isUser ? content : formatAssistantDisplay(content);
  const tgUrl = smartTelegramHref || managerHref;
  const waUrl = smartWhatsAppHref || managerWhatsAppHref;
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${
          isUser ? 'bg-brand-gold text-black font-medium' : 'border border-white/12 bg-white/[0.06] text-zinc-100'
        }`}
      >
        {!isUser && degraded && (
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-400">
            {t.ai?.offlineAnswer}
          </span>
        )}
        {displayed}
        {!isUser && handoff && (tgUrl || waUrl) && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {tgUrl && (
              <a href={tgUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center text-xs text-brand-gold underline">
                {t.ai?.liveManager}
              </a>
            )}
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center text-xs text-brand-gold underline">
                {t.ai?.liveManagerWhatsApp}
              </a>
            )}
          </div>
        )}
        {!isUser && content.trim() && (
          <AnswerActions key={JSON.stringify([question, content])} question={question} answer={content} locale={locale} />
        )}
      </div>
    </div>
  );
}

export function AiConversation({ variant = 'dock', onNavigate, active=true }) {
  // The transcript, cards and backend session live in ChatProvider (mounted
  // in the layout), so this component is a VIEW of the conversation rather
  // than an owner of it - the homepage bar, the sphere dock and the Discovery
  // Room all render the same thread.
  const { messages, cards, suggestions, listings, plan, savedPrefs, isLoading, hydrated, send, reset } = useConciergeChat();
  const auth = useAuth();
  const pathname = usePathname() || '';
  const [input, setInput] = useState('');
  const [thinkingStage, setThinkingStage] = useState(0);
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | sending | sent | error | unavailable
  const listRef = useRef(null);
  const lastAssistantRef = useRef(null);
  const inputRef = useRef(null);
  const voice = useVoice();
  useEffect(()=>{if(!active||!messages.length)voice.stopListening();},[active,messages.length,voice.stopListening]);
  useEffect(() => {
    if (!isLoading) {
      setThinkingStage(0);
      return;
    }
    const timer = setTimeout(() => setThinkingStage(1), 1400);
    return () => clearTimeout(timer);
  }, [isLoading]);
  useEffect(() => {
    if (emailOpen && auth?.session?.email && !emailInput) {
      setEmailInput(auth.session.email);
    }
  }, [emailOpen, auth?.session?.email]);
  // Every visible string follows the global switcher, so the surface a guest
  // is reading and the language the concierge answers in never disagree.
  const locale = useLocale();
  const t = getTranslation(locale);
  const pageContext = getPageContext(pathname, locale);
  const starters = pageContext?.prompts?.length ? pageContext.prompts : (STARTER_PROMPTS[locale] || STARTER_PROMPTS.en);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const latest = messages.at(-1);
    if (!isLoading && latest?.role === 'assistant' && lastAssistantRef.current) {
      const targetTop = Math.max(0, lastAssistantRef.current.offsetTop - 8);
      list.scrollTo({ top: targetTop, behavior: 'smooth' });
      return;
    }
    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // send() never throws and never logs - an offline AI backend is an expected
  // state, and the guest still gets a concierge line plus working navigation
  // cards. The concierge answers in text only; nothing here plays audio.
  async function submit(rawText) {
    const content = String(rawText || '').trim();
    if (!content || isLoading) return;
    voice.stopListening();
    setInput('');
    await send(content);
  }

  const profile = extractTripProfile(messages, new Date(), savedPrefs);
  const { chips: profileChips, resetLabel } = formatProfileChips(profile, locale);
  const lastMessage = messages.at(-1);
  const effectiveLocale = lastMessage?.role === 'assistant' && lastMessage.replyLocale ? lastMessage.replyLocale : locale;
  const activeCards = lastMessage?.role === 'assistant' && Array.isArray(lastMessage.cards) ? lastMessage.cards : cards;
  const activeListings = lastMessage?.role === 'assistant' && Array.isArray(lastMessage.listings) ? lastMessage.listings : listings;
  const activePlan = lastMessage?.role === 'assistant' && lastMessage.plan !== undefined ? lastMessage.plan : plan;
  const activeSuggestions = lastMessage?.role === 'assistant' && Array.isArray(lastMessage.suggestions) ? lastMessage.suggestions : suggestions;
  // Chips cover any additional section beyond the two rendered as full cards,
  // so a third relevant match is still one tap away without a third frame
  // crowding the transcript.
  const extraChips = activeSuggestions.filter((s) => !activeCards.some((c) => c.href === s.href));
  const shareCopy = getShareCopy(effectiveLocale);
  const s2 = getStage2Copy(effectiveLocale);
  const canSharePlan = !isLoading && lastMessage?.role === 'assistant' && !lastMessage.degraded && !lastMessage.handoff
    && (Boolean(activePlan) || activeListings.length > 0 || (lastMessage.content?.length || 0) >= 120);
  const shareText = canSharePlan
    ? buildShareablePlanText({ reply: lastMessage.content, plan: activePlan, listings: activeListings, locale: effectiveLocale })
    : '';
  const quickReplies = !isLoading && lastMessage?.role === 'assistant'
    ? quickRepliesForTurn({
        reply: lastMessage.content,
        cards: activeCards,
        listings: activeListings,
        locale: effectiveLocale,
        handoff: lastMessage.handoff === true,
        degraded: lastMessage.degraded === true,
        profile
      })
    : [];
  const lastAssistantIndex = [...messages].map((m) => m.role).lastIndexOf('assistant');
  const smartTelegramHref = managerHref
    ? buildManagerHandoffUrl({ baseHref: managerHref, profile, pageContext, messages, listings: activeListings, plan: activePlan, locale: effectiveLocale })
    : null;
  const smartWhatsAppHref = managerWhatsAppHref
    ? buildManagerHandoffUrl({ baseHref: managerWhatsAppHref, profile, pageContext, messages, listings: activeListings, plan: activePlan, locale: effectiveLocale })
    : null;

  async function handleEmailPlan(event) {
    event.preventDefault();
    if (emailStatus === 'sending' || !shareText) return;
    const cleanEmail = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setEmailStatus('invalid');
      return;
    }
    setEmailStatus('sending');
    try {
      const response = await fetch('/api/concierge/email-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, planText: shareText, locale: effectiveLocale })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.sent === true) {
        setEmailStatus('sent');
      } else if (response.status === 503) {
        setEmailStatus('unavailable');
      } else {
        setEmailStatus('error');
      }
    } catch {
      setEmailStatus('error');
    }
  }

  function handleMicClick() {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    // Dictation is transcribed in the language selected in the global
    // switcher - see useVoice.
    voice.startListening((text) => submit(text));
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col" aria-busy={!hydrated||isLoading}>
      {pageContext && (
        <div
          data-page-context="true"
          className="mb-1.5 flex items-center gap-2.5 rounded-xl border border-brand-gold/25 bg-brand-gold/[0.08] px-2.5 py-2"
        >
          {pageContext.image ? (
            <img src={pageContext.image} alt="" className="h-8 w-10 shrink-0 rounded-lg object-cover" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-brand-gold/85">{s2.viewing}</p>
            <p className="truncate text-xs font-semibold text-white">{pageContext.title}</p>
            {pageContext.subtitle ? (
              <p className="truncate text-[11px] text-zinc-300/80">{pageContext.subtitle}</p>
            ) : null}
          </div>
        </div>
      )}
      {profileChips.length > 0 && (
        <div
          data-profile-bar="true"
          className="mb-1 flex flex-wrap items-center gap-1.5 border-b border-white/10 px-1 pb-2"
        >
          {profileChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              data-profile-chip={chip.key}
              disabled={!hydrated || isLoading || !chip.editPrefix}
              onClick={() => {
                if (!chip.editPrefix) return;
                setInput(chip.editPrefix);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-brand-gold/30 bg-brand-gold/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-gold transition hover:border-brand-gold hover:bg-brand-gold/20 disabled:cursor-default disabled:opacity-90"
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            data-profile-reset="true"
            disabled={!hydrated || isLoading}
            onClick={reset}
            className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-400 transition hover:border-white/30 hover:text-zinc-200"
          >
            {resetLabel}
          </button>
        </div>
      )}
      <div ref={listRef} className="elio-scroll relative min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain px-1 py-2">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">{t.ai?.conciergeIntro || DEFAULT_INTRO}</p>
            <div className="flex flex-wrap gap-2">
              {starters.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={!hydrated||isLoading}
                  onClick={() => submit(prompt)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition hover:border-brand-gold/40 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const isAssistant = message.role === 'assistant';
          const isLatestAssistant = isAssistant && index === lastAssistantIndex;
          const hasStoredAttachments = Boolean(message.cards?.length || message.listings?.length || message.plan);
          const turnPlan = isAssistant ? (message.plan || (!hasStoredAttachments && isLatestAssistant ? plan : null)) : null;
          const turnListings = isAssistant ? (message.listings?.length ? message.listings : (!hasStoredAttachments && isLatestAssistant ? listings : [])) : [];
          const turnCards = isAssistant ? (message.cards?.length ? message.cards : (!hasStoredAttachments && isLatestAssistant ? cards : [])) : [];
          const turnPlanHrefs = new Set((turnPlan?.sections || []).map((s) => s.href));
          const turnNonPlanListings = turnPlan
            ? turnListings.filter((l) => ![...turnPlanHrefs].some((root) => l.href === root || l.href.startsWith(root + '/')))
            : turnListings;
          const turnNonPlanCards = turnPlan
            ? turnCards.filter((c) => !turnPlanHrefs.has(c.href))
            : turnCards;
          const msgLocale = isAssistant && message.replyLocale ? message.replyLocale : locale;
          return (
            <div key={index} ref={isLatestAssistant ? lastAssistantRef : undefined} className="space-y-2.5">
              <Message
                role={message.role}
                content={message.content}
                handoff={message.handoff === true}
                degraded={message.degraded === true}
                question={messages[index - 1]?.role === 'user' ? messages[index - 1].content : ''}
                locale={msgLocale}
                smartTelegramHref={smartTelegramHref}
                smartWhatsAppHref={smartWhatsAppHref}
              />
              {isAssistant && (
                <>
                  {turnPlan ? <AiPlan plan={turnPlan} onNavigate={onNavigate} profile={profile} /> : null}
                  <AiListingCards listings={turnNonPlanListings} onNavigate={onNavigate} profile={profile} rail={variant === 'dock'} />
                  <AiActionCards cards={turnNonPlanCards} onNavigate={onNavigate} profile={profile} />
                </>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="space-y-2.5">
            <div className="flex justify-start" role="status" aria-live="polite" data-thinking-status="true">
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold [animation-delay:240ms]" />
                </span>
                <span className="text-xs text-zinc-300">
                  {thinkingStatusForTurn({
                    message: [...messages].reverse().find((m) => m.role === 'user')?.content || '',
                    cards,
                    locale,
                    stage: thinkingStage
                  })}
                </span>
              </div>
            </div>
            <AiActionCards cards={cards} onNavigate={onNavigate} profile={profile} />
          </div>
        )}

        {/* One-tap Copy / WhatsApp / Telegram / Email share for curated VIP itineraries & recommendations. */}
        {canSharePlan && (
          <div className="space-y-2 pt-1" data-share-plan="true">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(shareText);
                    setCopiedPlan(true);
                    setTimeout(() => setCopiedPlan(false), 2000);
                  } catch {}
                }}
                className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-300 transition hover:border-brand-gold/50 hover:text-white"
              >
                {copiedPlan ? shareCopy.copied : shareCopy.copy}
              </button>
              <a
                href={buildWhatsAppShareUrl(shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200 transition hover:border-emerald-400/60 hover:bg-emerald-500/20"
              >
                {shareCopy.whatsapp}
              </a>
              <a
                href={buildTelegramShareUrl(shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] text-sky-200 transition hover:border-sky-400/60 hover:bg-sky-500/20"
              >
                {shareCopy.telegram}
              </a>
              <button
                type="button"
                data-email-itinerary-toggle="true"
                onClick={() => {
                  setEmailOpen((v) => !v);
                  if (emailStatus === 'sent' || emailStatus === 'error' || emailStatus === 'invalid') setEmailStatus('idle');
                }}
                className="rounded-full border border-brand-gold/35 bg-brand-gold/10 px-3 py-1 text-[11px] text-brand-gold transition hover:border-brand-gold hover:bg-brand-gold/20"
              >
                {s2.emailItinerary}
              </button>
            </div>
            {emailOpen && (
              emailStatus === 'sent' ? (
                <p role="status" className="text-xs text-emerald-300">{s2.emailSent}</p>
              ) : (
                <form onSubmit={handleEmailPlan} className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/15 bg-black/40 p-2">
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={s2.emailPlaceholder}
                    aria-label={s2.emailPlaceholder}
                    disabled={emailStatus === 'sending'}
                    className="min-w-[140px] flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder:text-zinc-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={emailStatus === 'sending'}
                    className="rounded-full bg-brand-gold px-3 py-1 text-[11px] font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                  >
                    {emailStatus === 'sending' ? s2.sending : s2.sendEmail}
                  </button>
                  {emailStatus === 'invalid' && <p role="alert" className="w-full text-[11px] text-rose-300">{s2.emailInvalid}</p>}
                  {emailStatus === 'unavailable' && <p role="alert" className="w-full text-[11px] text-amber-300">{s2.emailUnavailable}</p>}
                  {emailStatus === 'error' && <p role="alert" className="w-full text-[11px] text-rose-300">{s2.errorFailed}</p>}
                </form>
              )
            )}
          </div>
        )}

        {/* One-tap quick-reply chips matched to the concierge's clarifying question or active topic. */}
        {quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {quickReplies.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={!hydrated || isLoading}
                data-quick-reply={prompt}
                onClick={() => submit(prompt)}
                className="rounded-full border border-brand-gold/30 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200 transition hover:border-brand-gold hover:bg-brand-gold/15 hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* ...and compact chips for any further section they did not cover. */}
        {!isLoading && !activePlan && extraChips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {extraChips.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                onClick={onNavigate}
                className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1.5 text-xs text-brand-gold transition hover:bg-brand-gold hover:text-black"
              >
                {t.ai?.open || <LocalizedText source={"Open"} />} {s.label} &rarr;
              </Link>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="mt-3 flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] p-1.5 pl-4"
      >
        <input
          ref={inputRef}
          aria-label={t.ai?.askPlaceholder || 'Ask ELIO anything…'}
          maxLength={4000}
          disabled={!hydrated||isLoading}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={voice.isListening ? `${t.ai?.listening || 'Listening'}…` : (t.ai?.askPlaceholder || 'Ask ELIO anything…')}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />
        {voice.recognitionSupported && (
          <button
            type="button"
            disabled={!hydrated||isLoading}
            onClick={handleMicClick}
            aria-label={voice.isListening ? (t.ai?.stopListening || 'Stop listening') : (t.ai?.speakRequest || 'Speak your request')}
            aria-pressed={voice.isListening}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
              voice.isListening
                ? 'border-brand-gold bg-brand-gold text-black'
                : 'border-white/10 text-zinc-300 hover:border-brand-gold hover:text-brand-gold'
            }`}
          >
            <MicIcon className="h-4 w-4" />
          </button>
        )}
        {/* No speaker toggle: the concierge is text-only. The spoken-reply
            button and the male/female voice picker that used to sit here are
            gone along with the speechSynthesis code behind them. */}
        <button
          type="submit"
          disabled={!hydrated||isLoading||!input.trim()}
          className="shrink-0 rounded-full bg-brand-gold px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110"
        >
          {t.ai?.ask || <LocalizedText source={"Ask"} />}
        </button>
      </form>
      {voice.error&&<p role="alert" className="mt-2 text-xs text-zinc-300">{voiceInputUnavailable(locale)}</p>}
    </div>
  );
}
