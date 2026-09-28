import { useState, useEffect, useRef, useCallback } from "react";

export interface UseVoiceToTextOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onFinalResult?: (finalTranscript: string) => void;
  onError?: (errorMsg: string) => void;
  autoStopTimeoutMs?: number;
}

export interface UseVoiceToTextReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
}

// Browser compatibility helper for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function useVoiceToText({
  lang = "en-US",
  continuous = false,
  interimResults = true,
  onResult,
  onFinalResult,
  onError,
  autoStopTimeoutMs = 3500
}: UseVoiceToTextOptions = {}): UseVoiceToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const fullTranscriptRef = useRef<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition));
    }
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    clearSilenceTimer();
    fullTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");

    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const err = "Voice input is not supported in this browser. Please use Chrome, Safari, or Edge.";
      setError(err);
      if (onError) onError(err);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        clearSilenceTimer();
        let currentInterim = "";
        let finalSegment = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0]?.transcript || "";
          if (result.isFinal) {
            finalSegment += text;
          } else {
            currentInterim += text;
          }
        }

        if (finalSegment) {
          const updated = (fullTranscriptRef.current + " " + finalSegment).trim();
          fullTranscriptRef.current = updated;
          setTranscript(updated);
          setInterimTranscript("");
          if (onResult) onResult(updated, true);
        } else if (currentInterim) {
          const livePreview = (fullTranscriptRef.current + " " + currentInterim).trim();
          setInterimTranscript(currentInterim);
          if (onResult) onResult(livePreview, false);
        }

        // Set silence timer to automatically stop and deliver final query
        if (autoStopTimeoutMs > 0) {
          silenceTimerRef.current = setTimeout(() => {
            const finalQuery = fullTranscriptRef.current.trim() || currentInterim.trim();
            if (finalQuery && onFinalResult) {
              onFinalResult(finalQuery);
            }
            stopListening();
          }, autoStopTimeoutMs);
        }
      };

      recognition.onerror = (event: any) => {
        let message = "Voice recognition error occurred.";
        if (event.error === "not-allowed") {
          message = "Microphone access was denied. Please allow microphone permissions in your browser.";
        } else if (event.error === "no-speech") {
          message = "No speech detected. Please speak clearly into your microphone.";
        } else if (event.error === "network") {
          message = "Speech network connection issue. Check internet connection.";
        } else if (event.error === "aborted") {
          return;
        }

        setError(message);
        if (onError) onError(message);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalQuery = fullTranscriptRef.current.trim();
        if (finalQuery && onFinalResult) {
          onFinalResult(finalQuery);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error("[useVoiceToText] Failed to start:", err);
      const msg = err?.message || "Failed to initiate voice recognition.";
      setError(msg);
      if (onError) onError(msg);
      setIsListening(false);
    }
  }, [continuous, interimResults, lang, onResult, onFinalResult, onError, autoStopTimeoutMs, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    fullTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript
  };
}
