"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API has no standard "gender" field on a voice, so gender
// selection is a best-effort heuristic matched against common voice names
// shipped by Chrome/Edge/Safari/iOS across platforms.
const FEMALE_VOICE_HINTS = [
  'female', 'samantha', 'victoria', 'zira', 'susan', 'karen', 'moira', 'tessa',
  'fiona', 'aria', 'jenny', 'salli', 'joanna', 'google us english', 'google uk english female'
];
const MALE_VOICE_HINTS = [
  'male', 'daniel', 'david', 'alex', 'fred', 'george', 'mark', 'guy', 'ryan',
  'google uk english male'
];

function scoreVoice(voice, hints) {
  const name = voice.name.toLowerCase();
  return hints.some((hint) => name.includes(hint)) ? 1 : 0;
}

function pickVoice(voices, gender) {
  if (!voices.length) return null;
  const englishVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const pool = englishVoices.length ? englishVoices : voices;
  const hints = gender === 'male' ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS;
  const ranked = [...pool].sort((a, b) => scoreVoice(b, hints) - scoreVoice(a, hints));
  return ranked[0] || pool[0];
}

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
}

// The browser only ever runs one SpeechRecognition session at a time. This app
// now has two independent voice surfaces mounted together (the Discovery Room /
// AI Dock concierge and the homepage AI sphere), so without a shared guard,
// starting one while the other is listening would throw or silently kill the
// first session. Module scope (not component state) is intentional: it is
// shared by every component that imports this hook, across the whole page.
let activeRecognition = null;

// Tracks which hook instance last started speaking. speechSynthesis is a
// single page-global object, so an unmount-triggered stop must only cancel
// audio this instance actually owns - otherwise, e.g., the Discovery Room
// unmounting (navigating away) could silence the always-mounted AI Dock's
// unrelated, currently-playing reply.
let activeSpeechOwner = null;

// Splits a reply into short, natural phrases so speechSynthesis reads it as a
// sequence of sentences rather than one long, flat utterance - and so a very
// long reply doesn't risk being cut off by engines with per-utterance limits.
function splitIntoSpeechChunks(text) {
  const sentences = String(text)
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[^.!?]+[.!?]*/g);
  return (sentences && sentences.length ? sentences : [text]).map((s) => s.trim()).filter(Boolean);
}

// iOS Safari only allows speechSynthesis to start reliably when it is invoked
// synchronously inside a user-gesture handler (a tap). A reply that arrives
// after an async fetch is no longer "inside" that gesture, so the very first
// utterance in a session can be silently ignored. Speaking-and-cancelling a
// silent utterance during the tap itself "unlocks" the engine for the async
// speak() calls that follow. This is inexpensive and a no-op on browsers that
// don't need it, so it is safe to call unconditionally.
function primeSpeechEngine() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const unlock = new window.SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(unlock);
    window.speechSynthesis.cancel();
  } catch {
    /* best-effort unlock only */
  }
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [voiceGender, setVoiceGenderState] = useState('female');
  // Feature-detection flags start false on every render pass, including the
  // very first client render, so they always match the server-rendered HTML
  // (which never has `window`) - then flip to their real value in an effect,
  // strictly after hydration. Computing these as plain `typeof window !==
  // 'undefined'` checks directly in the render body - the previous approach -
  // is a classic hydration-mismatch trap: it renders one thing on the server
  // and can render another on the client's first pass, and both this hook's
  // consumers (the mic/speaker buttons' presence, this file's own
  // aria-disabled) depend on it.
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [synthesisSupported, setSynthesisSupported] = useState(false);
  const recognitionRef = useRef(null);
  const voicesRef = useRef([]);
  const speechQueueIdRef = useRef(0);
  const ownerRef = useRef(null);
  if (ownerRef.current === null) ownerRef.current = {};

  useEffect(() => {
    setRecognitionSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    setSynthesisSupported('speechSynthesis' in window);
    setIsStandalone(detectStandalone());
    const stored = window.localStorage.getItem('gorgona-voice-gender');
    if (stored === 'male' || stored === 'female') setVoiceGenderState(stored);
  }, []);

  useEffect(() => {
    if (!synthesisSupported) return undefined;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [synthesisSupported]);

  const setVoiceGender = useCallback(
    (gender) => {
      if (!isStandalone) return;
      setVoiceGenderState(gender);
      window.localStorage.setItem('gorgona-voice-gender', gender);
    },
    [isStandalone]
  );

  const startListening = useCallback(
    (onResult) => {
      if (!recognitionSupported) return;
      // Only one recognition session may run at a time across the whole page;
      // stop whichever surface currently owns it before claiming it here.
      activeRecognition?.stop();

      // Priming here (a direct user tap) also covers the case where this is
      // the very first voice interaction of the session on iOS Safari.
      primeSpeechEngine();

      const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionImpl();
      recognition.lang = 'en-US';
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
        // Covers permission denial, no-speech, network errors, etc. - all
        // simply return the UI to its resting state rather than throwing.
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

  const speak = useCallback(
    (text) => {
      if (!synthesisSupported || !text) return;
      window.speechSynthesis.cancel();
      activeSpeechOwner = ownerRef.current;

      const voice = pickVoice(voicesRef.current, voiceGender);
      const requestId = ++speechQueueIdRef.current;

      for (const chunk of splitIntoSpeechChunks(text)) {
        const utterance = new window.SpeechSynthesisUtterance(chunk);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || 'en-US';
        utterance.pitch = voiceGender === 'male' ? 0.95 : 1.05;
        utterance.rate = 1;
        utterance.onstart = () => {
          // A newer speak() call (or an explicit stop) has since superseded
          // this queued chunk - drop it instead of talking over the new one.
          if (requestId !== speechQueueIdRef.current) window.speechSynthesis.cancel();
        };
        window.speechSynthesis.speak(utterance);
      }
    },
    [synthesisSupported, voiceGender]
  );

  const stopSpeaking = useCallback(() => {
    speechQueueIdRef.current += 1;
    // Only cancel audio this instance actually started - speechSynthesis is
    // shared across every surface on the page.
    if (synthesisSupported && activeSpeechOwner === ownerRef.current) {
      window.speechSynthesis.cancel();
      activeSpeechOwner = null;
    }
  }, [synthesisSupported]);

  // Stop any speech this hook instance owns if its component unmounts.
  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  return {
    recognitionSupported,
    synthesisSupported,
    isListening,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isStandalone,
    voiceGender,
    setVoiceGender
  };
}
