"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '../LocaleProvider';
import { speechLocale } from '../../../lib/ai/locale';

// ===========================================================================
// Gorgona One — voice INPUT for the AI concierge.
//
// Speech-to-text only. There is deliberately NO text-to-speech here: the
// concierge is strictly text and UI. The hook previously exposed speak() /
// stopSpeaking() / voice-gender selection built on window.speechSynthesis,
// and every reply - including failure lines like "the concierge is
// temporarily unavailable" - was read aloud in a synthetic voice. All of it
// is removed rather than merely disabled, so no surface can reintroduce
// audio by flipping a flag. (The unused Google Cloud TTS route at
// /api/tts + lib/ai/voice.js has no caller and stays dormant.)
//
// Recognition language follows the global language switcher, so the mic
// transcribes whatever the guest is browsing in - all three AI surfaces call
// this one hook, so none of them can drift.
// ===========================================================================

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
}

// The browser only ever runs one SpeechRecognition session at a time. This app
// has two independent voice surfaces mounted together (the concierge dock and
// the homepage AI sphere), so without a shared guard, starting one while the
// other is listening would throw or silently kill the first session. Module
// scope (not component state) is intentional: it is shared by every component
// that imports this hook, across the whole page.
let activeRecognition = null;

export function useVoice() {
  const locale = useLocale();
  const [isListening, setIsListening] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  // Feature-detection flags start false on every render pass, including the
  // very first client render, so they always match the server-rendered HTML
  // (which never has `window`) - then flip to their real value in an effect,
  // strictly after hydration. Computing these as plain `typeof window !==
  // 'undefined'` checks directly in the render body - the previous approach -
  // is a classic hydration-mismatch trap, and this hook's consumers gate the
  // mic button's very presence on it.
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Read through a ref so startListening does not need `locale` in its
  // dependency list - switching language mid-session must not tear down and
  // recreate the callback under a live recognition session.
  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => {
    setRecognitionSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    setIsStandalone(detectStandalone());
  }, []);

  const startListening = useCallback(
    (onResult) => {
      if (!recognitionSupported) return;
      // Only one recognition session may run at a time across the whole page;
      // stop whichever surface currently owns it before claiming it here.
      activeRecognition?.stop();

      const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionImpl();
      // Bound to the global language switcher, not hardcoded to en-US - that
      // was why the mic only ever understood English. Read at start() time so
      // the very next utterance uses the language showing in the UI.
      recognition.lang = speechLocale(localeRef.current);
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        onResult?.(text);
      };
      recognition.onend = () => {
        if (activeRecognition === recognition) activeRecognition = null;
        setIsListening(false);
      };
      recognition.onerror = () => {
        // Covers permission denial, no-speech, network errors, an unsupported
        // language - all simply return the UI to its resting state rather
        // than throwing.
        if (activeRecognition === recognition) activeRecognition = null;
        setIsListening(false);
      };
      recognitionRef.current = recognition;
      activeRecognition = recognition;
      setIsListening(true);
      recognition.start();
    },
    [recognitionSupported]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    if (activeRecognition === recognitionRef.current) activeRecognition = null;
    setIsListening(false);
  }, []);

  // Stop any recognition this hook instance owns if its component unmounts
  // mid-session (e.g. the user navigates away from the page while listening).
  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if (activeRecognition === recognitionRef.current) activeRecognition = null;
    },
    []
  );

  return {
    recognitionSupported,
    isListening,
    startListening,
    stopListening,
    isStandalone,
    // The BCP-47 tag actually in force, for diagnostics and tests.
    speechLang: speechLocale(locale)
  };
}
