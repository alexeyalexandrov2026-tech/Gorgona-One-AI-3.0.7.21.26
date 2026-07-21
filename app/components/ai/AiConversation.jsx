"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useVoice } from './useVoice';

const STARTER_PROMPTS = [
  'Plan a weekend in Miami',
  'Find a yacht for 8 guests',
  'Book a table for a birthday dinner',
  'Best sportsbook offers right now'
];

function MicIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3" />
    </svg>
  );
}

function SpeakerIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 9v6h4l5 5V4L8 9H4Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}

function Message({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'bg-brand-gold text-black' : 'border border-white/10 bg-white/5 text-zinc-200'
        }`}
      >
        {content}
      </div>
    </div>
  );
}

export function AiConversation({ variant = 'dock' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const listRef = useRef(null);
  const voice = useVoice();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  async function send(rawText) {
    const content = rawText.trim();
    if (!content || isLoading) return;
    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setSuggestions([]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages })
      });
      const data = await response.json();
      const reply = data.reply || "I couldn't reach the concierge just now - please try again.";
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setSuggestions(data.suggestions || []);
      if (autoSpeak) voice.speak(reply);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'The concierge is temporarily unavailable. Please try again shortly.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleMicClick() {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    setAutoSpeak(true);
    voice.startListening((text) => send(text));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 py-2">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Ask for anything across the GORGONA ONE ecosystem — travel, dining, yachts, villas, events — and
              receive elegant, personal recommendations.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition hover:border-brand-gold/40 hover:text-white"
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
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-gold [animation-delay:240ms]" />
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1.5 text-xs text-brand-gold transition hover:bg-brand-gold hover:text-black"
              >
                Open {s.label} &rarr;
              </Link>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] p-1.5 pl-4"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={voice.isListening ? 'Listening…' : 'Ask the concierge anything…'}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />
        {voice.recognitionSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={voice.isListening ? 'Stop voice input' : 'Start voice input'}
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
        {voice.synthesisSupported && (
          <button
            type="button"
            onClick={() => setAutoSpeak((v) => !v)}
            aria-label={autoSpeak ? 'Turn off spoken replies' : 'Turn on spoken replies'}
            aria-pressed={autoSpeak}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
              autoSpeak
                ? 'border-brand-gold bg-brand-gold text-black'
                : 'border-white/10 text-zinc-300 hover:border-brand-gold hover:text-brand-gold'
            }`}
          >
            <SpeakerIcon className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="shrink-0 rounded-full bg-brand-gold px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110"
        >
          Ask
        </button>
      </form>

      {voice.isStandalone && voice.synthesisSupported && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-zinc-400">
          <span>Concierge voice</span>
          <div className="flex gap-1">
            {['female', 'male'].map((gender) => (
              <button
                key={gender}
                type="button"
                onClick={() => voice.setVoiceGender(gender)}
                className={`rounded-full px-3 py-1 capitalize transition ${
                  voice.voiceGender === gender ? 'bg-brand-gold text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>
      )}

      {variant === 'room' && !voice.isStandalone && (
        <p className="mt-2 text-center text-[0.65rem] uppercase tracking-[0.2em] text-zinc-600">
          Add GORGONA ONE to your home screen to choose a male or female concierge voice
        </p>
      )}
    </div>
  );
}
