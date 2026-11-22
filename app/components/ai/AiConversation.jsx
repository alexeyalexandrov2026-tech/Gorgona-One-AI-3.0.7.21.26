"use client";
import { LocalizedText, useSavedText } from "../LocalizedText";


import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useVoice } from './useVoice';
import { useConciergeChat } from './ChatProvider';
import { AiActionCards, AiListingCards, AiPlan } from './AiActionCard';
import { useLocale } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18n';
import { STARTER_PROMPTS } from '../../../lib/ai/conciergePrompts';
import { extractTripProfile } from '../../../lib/ai/tripProfile.mjs';
import { formatProfileChips } from '../../../lib/ai/profileChips.mjs';
import { quickRepliesForTurn } from '../../../lib/ai/quickReplies.mjs';
import { thinkingStatusForTurn } from '../../../lib/ai/thinkingStatus.mjs';
import { buildShareablePlanText, buildTelegramShareUrl, buildWhatsAppShareUrl, getShareCopy } from '../../../lib/ai/sharePlan.mjs';
import {voiceInputUnavailable} from '../../../lib/ai/voiceInputCopy.mjs';
import { configuredManagerTelegram } from '../../../lib/managerContact.mjs';

// The floating manager button hides while the chat is open, so a booking or
// payment answer carries the same live-manager link inside the reply.
const managerHref = configuredManagerTelegram();

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

function AnswerReport({ question, answer, locale }) {
  const msg = useSavedText();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [state, setState] = useState('idle');
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

  if (state === 'received') {
    return <p role="status" className="text-xs text-zinc-300">{msg('Thank you. The report was sent to our team.')}</p>;
  }
  if (!open) {
    return <button type="button" className="min-h-11 text-start text-xs text-zinc-300 underline" onClick={() => setOpen(true)}>{msg('Report this answer')}</button>;
  }
  return (
    <form onSubmit={send} className="grid gap-2 text-xs">
      <label className="grid gap-1">
        <span>{msg('What is wrong with this answer? (optional)')}</span>
        <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000}
          disabled={state === 'sending'} className="rounded-lg border border-white/20 bg-black/20 p-2" />
      </label>
      {state === 'failed' && <p role="alert">{msg('Could not send the request. Try again.')}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={state === 'sending'} className="min-h-11 text-brand-gold underline">
          {state === 'sending' ? msg('Loading...') : msg('Send report')}
        </button>
        <button type="button" disabled={state === 'sending'} className="min-h-11 underline" onClick={() => setOpen(false)}>
          {msg('Cancel')}
        </button>
      </div>
    </form>
  );
}

function Message({ role, content, question, locale, handoff = false, degraded = false }) {
  const isUser = role === 'user';
  const t = getTranslation(locale);
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${
          isUser ? 'bg-brand-gold text-black' : 'border border-white/10 bg-white/5 text-zinc-200'
        }`}
      >
        {!isUser && degraded && (
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-400">
            {t.ai?.offlineAnswer}
          </span>
        )}
        {content}
        {!isUser && handoff && managerHref && (
          <a href={managerHref} target="_blank" rel="noopener noreferrer"
            className="mt-2 block min-h-11 text-xs text-brand-gold underline">
            {t.ai?.liveManager}
          </a>
        )}
        {!isUser && content.trim() && (
          <div className="mt-1">
            <AnswerReport key={JSON.stringify([question, content])} question={question} answer={content} locale={locale} />
          </div>
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
  const [input, setInput] = useState('');
  const [thinkingStage, setThinkingStage] = useState(0);
  const [copiedPlan, setCopiedPlan] = useState(false);
  const listRef = useRef(null);
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
  // Every visible string follows the global switcher, so the surface a guest
  // is reading and the language the concierge answers in never disagree.
  const locale = useLocale();
  const t = getTranslation(locale);
  const starters = STARTER_PROMPTS[locale] || STARTER_PROMPTS.en;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, cards, listings, plan]);

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

  // Chips cover any additional section beyond the two rendered as full cards,
  // so a third relevant match is still one tap away without a third frame
  // crowding the transcript.
  const extraChips = suggestions.filter((s) => !cards.some((c) => c.href === s.href));
  const profile = extractTripProfile(messages, new Date(), savedPrefs);
  const { chips: profileChips, resetLabel } = formatProfileChips(profile, locale);
  const lastMessage = messages.at(-1);
  const shareCopy = getShareCopy(locale);
  const canSharePlan = !isLoading && lastMessage?.role === 'assistant' && !lastMessage.degraded && !lastMessage.handoff
    && (Boolean(plan) || listings.length > 0 || (lastMessage.content?.length || 0) >= 120);
  const shareText = canSharePlan
    ? buildShareablePlanText({ reply: lastMessage.content, plan, listings, locale })
    : '';
  const quickReplies = !isLoading && lastMessage?.role === 'assistant'
    ? quickRepliesForTurn({
        reply: lastMessage.content,
        cards,
        listings,
        locale,
        handoff: lastMessage.handoff === true,
        degraded: lastMessage.degraded === true
      })
    : [];
  const planHrefs = new Set((plan?.sections || []).map((s) => s.href));
  const nonPlanListings = plan
    ? listings.filter((l) => ![...planHrefs].some((root) => l.href === root || l.href.startsWith(root + '/')))
    : listings;
  const nonPlanCards = plan
    ? cards.filter((c) => !planHrefs.has(c.href))
    : cards;

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
      <div ref={listRef} className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 py-2">
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

        {messages.map((message, index) => (
          <Message key={index} role={message.role} content={message.content} handoff={message.handoff === true} degraded={message.degraded === true}
            question={messages[index - 1]?.role === 'user' ? messages[index - 1].content : ''} locale={locale} />
        ))}

        {isLoading && (
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
        )}

        {/* Rich frames for the strongest intents... */}
        {plan ? <AiPlan plan={plan} onNavigate={onNavigate} /> : null}
        <AiListingCards listings={nonPlanListings} onNavigate={onNavigate} />
        <AiActionCards cards={nonPlanCards} onNavigate={onNavigate} profile={profile} />

        {/* One-tap Copy / WhatsApp share for curated VIP itineraries & recommendations. */}
        {canSharePlan && (
          <div className="flex flex-wrap items-center gap-2 pt-1" data-share-plan="true">
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
        {!plan && extraChips.length > 0 && (
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
          aria-label={t.ai?.askPlaceholder || 'Ask the concierge anything…'}
          maxLength={4000}
          disabled={!hydrated||isLoading}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={voice.isListening ? `${t.ai?.listening || 'Listening'}…` : (t.ai?.askPlaceholder || 'Ask the concierge anything…')}
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
