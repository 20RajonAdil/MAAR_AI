'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice input via the browser's built-in SpeechRecognition — entirely
 * client-side, no API key, no network call, same zero-dependency approach
 * as the existing "read aloud" (SpeechSynthesis) feature. This is the
 * input-side counterpart to that.
 *
 * Support varies: solid in Chrome/Edge, partial in Safari, absent in
 * Firefox. isSupported reflects that so the mic button can hide itself
 * cleanly rather than show a broken control.
 */

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function useVoiceInput(onFinalTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const isSupported =
    typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    if (!isSupported || listening) return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition!;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (finalChunk) onFinalTranscript(finalChunk.trim());
      setInterimText(interim);
    };
    recognition.onerror = () => {
      setListening(false);
      setInterimText('');
    };
    recognition.onend = () => {
      setListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [isSupported, listening, onFinalTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterimText('');
  }, []);

  return { isSupported, listening, interimText, start, stop };
}
