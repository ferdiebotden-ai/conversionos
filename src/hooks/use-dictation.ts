'use client';

/**
 * Web Speech API dictation hook for Design Studio chat input.
 * Transcribes speech to text and fills the input field (does NOT auto-send).
 */

import { useState, useRef, useCallback, useEffect } from 'react';

type DictationStatus = 'idle' | 'recording' | 'unsupported';

interface UseDictationReturn {
  status: DictationStatus;
  transcript: string;
  startDictation: () => void;
  stopDictation: () => void;
  clearTranscript: () => void;
}

export function useDictation(): UseDictationReturn {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [supported, setSupported] = useState(true);

  // Check browser support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false); // eslint-disable-line react-hooks/set-state-in-effect -- browser capability check must run after mount
      setStatus('unsupported');  
    }
  }, []);

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setStatus(prev => prev === 'recording' ? 'idle' : prev);
  }, []);

  const startDictation = useCallback(() => {
    if (!supported) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('unsupported');
      return;
    }

    // Stop any existing session
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognition() as any;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-CA';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.[0]) {
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = () => {
      stopDictation();
    };

    recognition.onend = () => {
      setStatus('idle');
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
    setStatus('recording');
  }, [supported, stopDictation]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { status, transcript, startDictation, stopDictation, clearTranscript };
}
