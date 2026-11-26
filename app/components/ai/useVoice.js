"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useLocaleReady } from '../LocaleProvider';
import { speechLocale } from '../../../lib/ai/locale';

// ===========================================================================
// Miami Elio — Voice 2.0 INPUT for ELIO+ Guide.
//
// 1. Live browser SpeechRecognition with `interimResults = true` so the guest
//    sees their words appear in real time before sending (zero blind sends).
// 2. Automatic MediaRecorder -> POST /api/concierge/transcribe (Cloudflare
//    Workers AI Whisper) fallback on iPhone Safari, Firefox, and in-app
//    browsers that do not implement Web SpeechRecognition.
// 3. Single shared active session across all surfaces (HomeHero + AiDock +
//    Discovery Room) with granular error reporting.
// ===========================================================================

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
}

let activeSession = null;
function stopSession(session) {
  try {
    session?.stop?.();
  } catch {
    /* Already closed or blocked: restore the text interface. */
  }
}

function mapRecognitionError(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'permission';
  if (code === 'no-speech') return 'no-speech';
  return 'unavailable';
}

export function useVoice() {
  const locale = useLocale();
  const localeReady = useLocaleReady();
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [nativeSpeechSupported, setNativeSpeechSupported] = useState(false);
  const [whisperFallbackSupported, setWhisperFallbackSupported] = useState(false);
  const sessionRef = useRef(null);

  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => {
    const hasNative = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasRecorder = !hasNative && Boolean(window.navigator?.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined');
    setNativeSpeechSupported(hasNative);
    setWhisperFallbackSupported(hasRecorder);
    setIsStandalone(detectStandalone());
  }, []);

  const recognitionSupported = nativeSpeechSupported || whisperFallbackSupported;

  const startWhisperRecording = useCallback(
    async (onResult) => {
      setError(null);
      setInterimText('');
      let stream;
      try {
        stream = await window.navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        setError(err?.name === 'NotAllowedError' ? 'permission' : 'unavailable');
        setIsListening(false);
        return;
      }

      const chunks = [];
      let recorder;
      try {
        const mimeType = typeof window.MediaRecorder.isTypeSupported === 'function'
          ? (['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => window.MediaRecorder.isTypeSupported(m)) || '')
          : '';
        recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream);
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        setError('unavailable');
        setIsListening(false);
        return;
      }

      const session = {
        cancelled: false,
        stop() {
          if (recorder.state !== 'inactive') {
            try { recorder.stop(); } catch {}
          }
          stream.getTracks().forEach((t) => t.stop());
        },
        cancel() {
          this.cancelled = true;
          this.stop();
        }
      };

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onerror = () => {
        if (sessionRef.current !== session) return;
        session.cancel();
        if (activeSession === session) activeSession = null;
        sessionRef.current = null;
        setIsListening(false);
        setIsTranscribing(false);
        setError('unavailable');
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (sessionRef.current !== session || session.cancelled) return;
        if (activeSession === session) activeSession = null;
        sessionRef.current = null;
        setIsListening(false);
        if (!chunks.length) {
          setError('no-speech');
          return;
        }
        setIsTranscribing(true);
        try {
          const recMime = String(recorder.mimeType || '').toLowerCase();
          const blob = new Blob(chunks, { type: recMime || 'audio/webm' });
          const ext = recMime.includes('mp4')
            ? 'mp4'
            : recMime.includes('ogg')
              ? 'ogg'
              : recMime.includes('mpeg') || recMime.includes('mp3')
                ? 'mp3'
                : 'webm';
          const form = new FormData();
          form.append('audio', blob, `dictation.${ext}`);
          // Auto-detect spoken language so multilingual guests speaking Russian/Spanish
          // on an English UI (or vice versa) get accurate Whisper transcription.
          form.append('locale', 'auto');
          const res = await fetch('/api/concierge/transcribe', {
            method: 'POST',
            body: form,
            signal: AbortSignal.timeout(15000)
          });
          const data = await res.json().catch(() => null);
          if (res.ok && typeof data?.text === 'string' && data.text.trim()) {
            onResult?.(data.text.trim().slice(0, 4000));
          } else if (res.ok && data?.empty) {
            setError('no-speech');
          } else {
            setError('unavailable');
          }
        } catch {
          setError('unavailable');
        } finally {
          setIsTranscribing(false);
        }
      };

      sessionRef.current = session;
      activeSession = session;
      setIsListening(true);
      try {
        recorder.start();
        // Auto-stop safety cap at 30 seconds so audio never exceeds 4MB limit.
        setTimeout(() => {
          if (sessionRef.current === session && recorder.state === 'recording') {
            session.stop();
          }
        }, 30_000);
      } catch {
        session.cancel();
        if (activeSession === session) activeSession = null;
        sessionRef.current = null;
        setIsListening(false);
        setError('unavailable');
      }
    },
    []
  );

  const startListening = useCallback(
    (onResult, onInterim = null) => {
      if (!recognitionSupported || !localeReady) return;
      const previous = activeSession;
      activeSession = null;
      sessionRef.current = null;
      stopSession(previous);
      setError(null);
      setInterimText('');

      if (!nativeSpeechSupported && whisperFallbackSupported) {
        void startWhisperRecording(onResult);
        return;
      }

      let recognition;
      try {
        const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognitionImpl();
        recognition.lang = speechLocale(localeRef.current);
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.onresult = (event) => {
          if (sessionRef.current !== recognition || activeSession !== recognition) return;
          const results = event?.results;
          if (!results || !results.length) {
            setError('unavailable');
            return;
          }
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = 0; i < results.length; i += 1) {
            const item = results[i];
            const text = item?.[0]?.transcript;
            if (typeof text !== 'string') continue;
            // Synthetic test events omit isFinal; treat undefined or true as final.
            if (item.isFinal === false) interimTranscript += text;
            else finalTranscript += text;
          }
          const live = (finalTranscript + interimTranscript).trim();
          if (interimTranscript.trim() && !finalTranscript.trim()) {
            setInterimText(live.slice(0, 4000));
            onInterim?.(live.slice(0, 4000));
            return;
          }
          const cleanFinal = finalTranscript.trim();
          if (cleanFinal && cleanFinal.length <= 4000) {
            setInterimText('');
            onInterim?.(cleanFinal);
            onResult?.(cleanFinal);
          } else {
            setError('unavailable');
          }
        };
        recognition.onend = () => {
          if (sessionRef.current !== recognition) return;
          if (activeSession === recognition) activeSession = null;
          setIsListening(false);
          setInterimText('');
        };
        recognition.onerror = (event) => {
          if (sessionRef.current !== recognition) return;
          const owned = activeSession === recognition;
          if (owned) activeSession = null;
          if (owned && event?.error !== 'aborted') setError(mapRecognitionError(event?.error));
          setIsListening(false);
          setInterimText('');
        };
        sessionRef.current = recognition;
        activeSession = recognition;
        setIsListening(true);
        recognition.start();
      } catch {
        if (activeSession === recognition) activeSession = null;
        sessionRef.current = null;
        stopSession(recognition);
        setIsListening(false);
        setInterimText('');
        setError('unavailable');
      }
    },
    [recognitionSupported, nativeSpeechSupported, whisperFallbackSupported, localeReady, startWhisperRecording]
  );

  const cancelListening = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session && typeof session.cancel === 'function') session.cancel();
    else stopSession(session);
    if (activeSession === session) activeSession = null;
    setError(null);
    setInterimText('');
    setIsListening(false);
  }, []);

  const stopListening = useCallback(() => {
    const session = sessionRef.current;
    // For Whisper MediaRecorder, stopping triggers upload & transcription (not cancel).
    if (session && typeof session.cancel === 'function') {
      session.stop();
      setIsListening(false);
      return;
    }
    cancelListening();
  }, [cancelListening]);

  useEffect(() => {
    if (!localeReady) cancelListening();
  }, [localeReady, cancelListening]);

  useEffect(
    () => () => {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session && typeof session.cancel === 'function') session.cancel();
      else stopSession(session);
      if (activeSession === session) activeSession = null;
    },
    []
  );

  return {
    recognitionSupported: recognitionSupported && localeReady,
    isListening,
    isTranscribing,
    interimText,
    usingWhisper: !nativeSpeechSupported && whisperFallbackSupported,
    error,
    startListening,
    stopListening,
    cancelListening,
    isStandalone,
    speechLang: speechLocale(locale)
  };
}
