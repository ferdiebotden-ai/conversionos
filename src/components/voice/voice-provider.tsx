'use client';

/**
 * Voice Provider
 * Core abstraction wrapping @elevenlabs/react useConversation hook
 * Provides voice state, controls, and transcript via React context
 */

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { useConversation } from '@elevenlabs/react';
import type { PageContext } from '@/lib/ai/personas/types';
import {
  isVoiceSupported,
  getMicrophonePermission,
  type VoiceConnectionStatus,
  type VoiceMode,
  type VoiceTranscriptEntry,
  type VoiceErrorCode,
  VOICE_ERROR_MESSAGES,
} from '@/lib/voice/config';
import { MicrophonePermissionDialog } from './microphone-permission-dialog';

interface VoiceContextValue {
  // Connection state
  status: VoiceConnectionStatus;
  mode: VoiceMode;
  isSpeaking: boolean;
  isMuted: boolean;
  error: string | null;

  // Volume levels (0-1)
  inputVolume: number;
  outputVolume: number;

  // Transcript
  transcript: VoiceTranscriptEntry[];

  // Duration tracking
  durationMs: number;

  // Actions
  startVoice: (context: PageContext) => Promise<void>;
  endVoice: () => Promise<void>;
  toggleMute: () => void;

  // Feature check
  isSupported: boolean;
  isApiConfigured: boolean | null;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return ctx;
}

interface VoiceProviderProps {
  children: ReactNode;
  onMessage?: (entry: VoiceTranscriptEntry) => void;
}

export function VoiceProvider({ children, onMessage }: VoiceProviderProps) {
  const [transcript, setTranscript] = useState<VoiceTranscriptEntry[]>([]);
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [isApiConfigured, setIsApiConfigured] = useState<boolean | null>(null);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);

  // Permission dialog state
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permDialogState, setPermDialogState] = useState<'prompt' | 'denied'>('prompt');
  const pendingContextRef = useRef<PageContext | null>(null);

  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const connectingRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const supported = isVoiceSupported();

  // Check API configuration on mount
  useEffect(() => {
    fetch('/api/voice/check')
      .then((res) => setIsApiConfigured(res.ok))
      .catch(() => setIsApiConfigured(false));
  }, []);

  // Cleanup duration interval on unmount (prevents memory leak if navigating away while connected)
  useEffect(() => {
    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    };
  }, []);

  const conversation = useConversation({
    micMuted: isMuted,
    onConnect: () => {
      setError(null);
      setDurationMs(0);
      durationRef.current = setInterval(() => {
        setDurationMs((d) => d + 1000);
      }, 1000);
    },
    onDisconnect: () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
      setMode('idle');
      setIsMuted(false);
      setInputVolume(0);
      setOutputVolume(0);
    },
    onMessage: (message) => {
      const msg = message as { message?: string; source?: string };
      if (msg.message && msg.source) {
        const entry: VoiceTranscriptEntry = {
          id: crypto.randomUUID(),
          role: msg.source === 'user' ? 'user' : 'assistant',
          content: msg.message,
          timestamp: new Date(),
          source: 'voice',
        };
        setTranscript((prev) => [...prev, entry]);
        onMessageRef.current?.(entry);
      }
    },
    onModeChange: (modeData) => {
      const data = modeData as { mode?: string };
      if (data.mode === 'speaking') {
        setMode('speaking');
      } else if (data.mode === 'listening') {
        setMode('listening');
      }
    },
    onError: (err) => {
      console.error('ElevenLabs voice error:', err);
      setError('Voice connection error. Please try again.');
    },
  });

  // Track volume from conversation via polling
  useEffect(() => {
    if (conversation.status !== 'connected') {
      setInputVolume(0);
      setOutputVolume(0);
      return;
    }

    const interval = setInterval(() => {
      if (typeof conversation.getInputVolume === 'function') {
        setInputVolume(conversation.getInputVolume());
      }
      if (typeof conversation.getOutputVolume === 'function') {
        setOutputVolume(conversation.getOutputVolume());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [conversation.status, conversation]);

  // Core connect logic (called after permission is confirmed)
  const connectVoice = useCallback(
    async (context: PageContext) => {
      connectingRef.current = true;
      setError(null);
      setTranscript([]);
      setDurationMs(0);
      setMode('idle');

      try {
        const res = await fetch(`/api/voice/signed-url?context=${context}`, {
          method: 'POST',
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to get voice session');
        }

        const { signedUrl, voicePrompt } = await res.json();

        // Pass context-aware prompt as session override if available
        const sessionOpts: Parameters<typeof conversation.startSession>[0] = {
          signedUrl,
        };
        if (voicePrompt) {
          sessionOpts.overrides = {
            agent: { prompt: { prompt: voicePrompt } },
          };
        }

        await conversation.startSession(sessionOpts);
      } catch (err) {
        console.error('Voice start error:', err);
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError(VOICE_ERROR_MESSAGES.PERMISSION_DENIED);
        } else {
          setError(
            err instanceof Error ? err.message : VOICE_ERROR_MESSAGES.UNKNOWN
          );
        }
      } finally {
        connectingRef.current = false;
      }
    },
    [conversation]
  );

  // Permission-aware start: check mic permission first
  const startVoice = useCallback(
    async (context: PageContext) => {
      if (connectingRef.current) return;

      if (!supported) {
        setError(VOICE_ERROR_MESSAGES.NOT_SUPPORTED);
        return;
      }

      if (isApiConfigured === false) {
        setError(VOICE_ERROR_MESSAGES.API_NOT_CONFIGURED);
        return;
      }

      const permState = await getMicrophonePermission();

      if (permState === 'granted' || permState === 'unknown') {
        // Already granted or can't check — connect directly
        await connectVoice(context);
      } else if (permState === 'prompt') {
        // Show pre-permission dialog
        pendingContextRef.current = context;
        setPermDialogState('prompt');
        setPermDialogOpen(true);
      } else {
        // denied
        pendingContextRef.current = context;
        setPermDialogState('denied');
        setPermDialogOpen(true);
      }
    },
    [supported, isApiConfigured, connectVoice]
  );

  // Called when user clicks "Allow & Connect" in permission dialog
  const handlePermissionAllow = useCallback(async () => {
    setPermDialogOpen(false);
    const ctx = pendingContextRef.current;
    if (ctx) {
      pendingContextRef.current = null;
      await connectVoice(ctx);
    }
  }, [connectVoice]);

  const endVoice = useCallback(async () => {
    await conversation.endSession();
    setMode('idle');
  }, [conversation]);

  const toggleMute = useCallback(() => {
    // micMuted is passed as controlled state to useConversation
    // Toggling this state actually mutes/unmutes the mic via the SDK
    setIsMuted((prev) => !prev);
  }, []);

  // Map ElevenLabs status to our status type
  const status: VoiceConnectionStatus =
    conversation.status === 'connected'
      ? 'connected'
      : conversation.status === 'connecting'
        ? 'connecting'
        : 'disconnected';

  const value: VoiceContextValue = {
    status,
    mode,
    isSpeaking: conversation.isSpeaking ?? false,
    isMuted,
    error,
    inputVolume,
    outputVolume,
    transcript,
    durationMs,
    startVoice,
    endVoice,
    toggleMute,
    isSupported: supported,
    isApiConfigured,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
      <MicrophonePermissionDialog
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        context={pendingContextRef.current ?? 'general'}
        permissionState={permDialogState}
        onAllow={handlePermissionAllow}
      />
    </VoiceContext.Provider>
  );
}
