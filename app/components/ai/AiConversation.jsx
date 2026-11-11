"use client";
import { LocalizedText } from "../LocalizedText";


import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useVoice } from './useVoice';
import { useConciergeChat } from './ChatProvider';
import { AiActionCards } from './AiActionCard';
import { useLocale } from '../LocaleProvider';
import { getTranslation } from '../../../lib/i18n';
import { STARTER_PROMPTS } from '../../../lib/ai/conciergePrompts';
import { matchSuggestions } from '../../../lib/aiSuggestions';
import { isAppRestricted } from '../../../lib/appRestrictedPaths';
import {voiceInputUnavailable} from '../../../lib/ai/voiceInputCopy.mjs';

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

function Message({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${
          isUser ? 'bg-brand-gold text-black' : 'border border-g1-rule bg-g1-card text-g1-ink'
        }`}
      >
        {content}
      </div>
    </div>
  );
}

export function AiConversation({ variant = 'dock', onNavigate, active=true }) {
  // The transcript, cards and backend session live in ChatProvider (mounted
  // in the layout), so this component is a VIEW of the conversation rather
  // than an owner of it - the homepage bar, the sphere dock and the Discovery
  // Room all render the same thread.
  const { messages, cards, suggestions, isLoading, hydrated, send } = useConciergeChat();
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const voice = useVoice();
  useEffect(()=>{if(!active||!messages.length)voice.stopListening();},[active,messages.length,voice.stopListening]);
  // Every visible string follows the global switcher, so the surface a guest
  // is reading and the language the concierge answers in never disagree.
  const locale = useLocale();
  const t = getTranslation(locale);
  const starters = STARTER_PROMPTS[locale] || STARTER_PROMPTS.en;
  // A starter that leads into a section the iOS app does not carry
  // (lib/appRestrictedPaths.js) is left out there: data-app-hidden, see
  // globals.css. The browser shows every starter.
  const leadsOutOfApp = (prompt) => isAppRestricted(matchSuggestions(prompt, { limit: 1 })[0]?.href);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, cards]);

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
      <div ref={listRef} className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 py-2">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-g1-soft">{t.ai?.conciergeIntro || DEFAULT_INTRO}</p>
            <div className="flex flex-wrap gap-2">
              {starters.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  data-app-hidden={leadsOutOfApp(prompt) ? '' : undefined}
                  disabled={!hydrated||isLoading}
                  onClick={() => submit(prompt)}
                  className="rounded-full border border-g1-rule bg-g1-card px-3 py-1.5 text-xs text-g1-soft transition hover:border-brand-gold/40 hover:text-g1-ink"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <Message key={index} role={message.role} content={message.content} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-g1-rule bg-g1-card px-4 py-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold [animation-delay:240ms]" />
            </div>
          </div>
        )}

        {/* Rich frames for the strongest intents... */}
        <AiActionCards cards={cards} onNavigate={onNavigate} />

        {/* ...and compact chips for any further section they did not cover. */}
        {extraChips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {extraChips.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                data-app-hidden={isAppRestricted(s.href) ? '' : undefined}
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
        className="mt-3 flex items-center gap-2 rounded-full border border-g1-rule bg-g1-card p-1.5 pl-4"
      >
        <input
          aria-label={t.ai?.askPlaceholder || 'Ask the concierge anything…'}
          maxLength={4000}
          disabled={!hydrated||isLoading}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={voice.isListening ? `${t.ai?.listening || 'Listening'}…` : (t.ai?.askPlaceholder || 'Ask the concierge anything…')}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-g1-ink placeholder:text-g1-soft focus:outline-none"
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
                : 'border-g1-rule text-g1-soft hover:border-brand-gold hover:text-brand-gold'
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
      {voice.error&&<p role="alert" className="mt-2 text-xs text-g1-soft">{voiceInputUnavailable(locale)}</p>}
    </div>
  );
}
