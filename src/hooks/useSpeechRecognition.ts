"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_MAX_DURATION_MS = 30_000;

interface UseSpeechRecognitionOptions {
  onTranscript: (transcript: string) => void;
  /** Called whenever listening stops, for any reason (manual, silence, timeout). */
  onEnd?: () => void;
  /** Safety cap so the mic never listens forever. Defaults to 30s. */
  maxDurationMs?: number;
}

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function useSpeechRecognition({
  onTranscript,
  onEnd,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const onEndRef = useRef(onEnd);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const isSupported = getSpeechRecognitionCtor() !== undefined;

  const clearAutoStopTimer = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = undefined;
    }
  }, []);

  const ensureRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.lang =
      typeof navigator !== "undefined" ? navigator.language : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscriptRef.current += `${transcript} `;
        } else {
          interim += transcript;
        }
      }
      onTranscriptRef.current(`${finalTranscriptRef.current}${interim}`.trim());
    };

    recognition.onerror = () => {
      clearAutoStopTimer();
      setIsListening(false);
    };

    recognition.onend = () => {
      clearAutoStopTimer();
      setIsListening(false);
      onEndRef.current?.();
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [clearAutoStopTimer]);

  const stop = useCallback(() => {
    clearAutoStopTimer();
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [clearAutoStopTimer]);

  const start = useCallback(() => {
    const recognition = ensureRecognition();
    if (!recognition) return;
    finalTranscriptRef.current = "";
    setIsListening(true);
    recognition.start();
    clearAutoStopTimer();
    autoStopTimerRef.current = setTimeout(stop, maxDurationMs);
  }, [ensureRecognition, clearAutoStopTimer, stop, maxDurationMs]);

  useEffect(() => {
    return () => {
      // Prevent a late-firing native "end" event from calling back into a
      // now-unmounted (or conversation-switched) component.
      onTranscriptRef.current = () => {};
      onEndRef.current = undefined;
      clearAutoStopTimer();
      recognitionRef.current?.stop();
    };
  }, [clearAutoStopTimer]);

  return { isSupported, isListening, start, stop };
}
