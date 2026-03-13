'use client';

/**
 * Voice Dictation Input
 * MediaRecorder-based audio capture with Whisper transcription.
 * Falls back to text input when microphone is unavailable.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceDictationInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean | undefined;
}

type RecordingState = 'idle' | 'recording' | 'transcribing';

export function VoiceDictationInput({ onTranscript, disabled }: VoiceDictationInputProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [livePreview, setLivePreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasMicrophone, setHasMicrophone] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const MAX_DURATION = 90; // seconds

  // Check microphone availability on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setHasMicrophone(true);
    } else {
      setHasMicrophone(false);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
    setLivePreview('');
  }, []);

  const transcribeAudio = useCallback(
    async (blob: Blob) => {
      setState('transcribing');
      setError(null);

      try {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Transcription failed.' }));
          throw new Error(data.error || 'Transcription failed.');
        }

        const data = (await response.json()) as { text: string };
        onTranscript(data.text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transcription failed. Please try again.');
      } finally {
        setState('idle');
      }
    },
    [onTranscript],
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setLivePreview('');
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        cleanup();
        if (blob.size > 0) {
          transcribeAudio(blob);
        } else {
          setState('idle');
        }
      };

      mediaRecorder.start(250); // collect chunks every 250ms
      setState('recording');

      // Start elapsed timer
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);

      // Optional live preview via Web Speech API
      const SpeechRecognitionCtor = (typeof window !== 'undefined' &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;

      if (SpeechRecognitionCtor) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new SpeechRecognitionCtor() as any;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-CA';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result) {
              transcript += result[0]?.transcript || '';
            }
          }
          setLivePreview(transcript);
        };
        recognition.onerror = () => {
          // Live preview is optional — silently ignore errors
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      cleanup();
      setState('idle');
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access and try again.');
        setHasMicrophone(false);
      } else {
        setError('Could not access microphone. Please check your device settings.');
      }
    }
  }, [cleanup, stopRecording, transcribeAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Fallback: text input only
  if (hasMicrophone === false) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Microphone not available. Type or paste your notes below.
        </p>
        <FallbackTextInput onTranscript={onTranscript} disabled={disabled} />
      </div>
    );
  }

  // Loading check
  if (hasMicrophone === null) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Recording controls */}
      <div className="flex flex-col items-center gap-4">
        {state === 'idle' && (
          <Button
            type="button"
            size="lg"
            onClick={startRecording}
            disabled={disabled}
            className="h-20 w-20 rounded-full"
          >
            <Mic className="h-8 w-8" />
          </Button>
        )}

        {state === 'recording' && (
          <>
            <Button
              type="button"
              size="lg"
              variant="destructive"
              onClick={stopRecording}
              className="h-20 w-20 rounded-full"
            >
              <Square className="h-8 w-8" />
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="font-mono">{formatTime(elapsed)}</span>
              <span className="text-muted-foreground">/ {formatTime(MAX_DURATION)}</span>
            </div>
          </>
        )}

        {state === 'transcribing' && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Transcribing...</p>
          </div>
        )}
      </div>

      {/* Live preview */}
      {state === 'recording' && livePreview && (
        <div className={cn('rounded-md bg-muted p-3')}>
          <p className="text-xs text-muted-foreground mb-1">Live preview (approximate)</p>
          <p className="text-sm">{livePreview}</p>
        </div>
      )}

      {/* Hint text */}
      {state === 'idle' && (
        <p className="text-sm text-muted-foreground text-center">
          Tap to start recording. Describe the job, customer details, and scope.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}

/** Fallback text input for when microphone is unavailable. */
function FallbackTextInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean | undefined;
}) {
  const [text, setText] = useState('');

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Paste email, type notes, or describe the job..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        disabled={disabled}
      />
      <Button
        type="button"
        onClick={() => {
          if (text.trim()) onTranscript(text.trim());
        }}
        disabled={disabled || !text.trim()}
        size="sm"
      >
        Use These Notes
      </Button>
    </div>
  );
}
