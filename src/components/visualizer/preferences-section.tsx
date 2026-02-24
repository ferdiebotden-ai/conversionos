'use client';

/**
 * Preferences Section
 * Equal-prominence text/voice choice → selected mode → session status
 * for the streamlined visualizer form
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { TalkButton } from '@/components/voice/talk-button';
import { useVoice } from '@/components/voice/voice-provider';
import { VoiceIndicator } from '@/components/voice/voice-indicator';
import { PersonaAvatar } from '@/components/voice/persona-avatar';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  PenLine,
  Mic,
} from 'lucide-react';
import { VoiceChatBubble } from './voice-chat-bubble';
import type { VoiceTranscriptEntry } from '@/lib/voice/config';
import type { VoiceExtractedPreferences } from '@/lib/schemas/design-preferences';

type InputMode = 'text' | 'voice' | null;

interface PreferencesSectionProps {
  textValue: string;
  onTextChange: (value: string) => void;
  voiceTranscript: VoiceTranscriptEntry[];
  voiceSummary?: string | undefined;
  onVoiceSummaryReady: (summary: string, extracted: VoiceExtractedPreferences) => void;
  className?: string | undefined;
}

export function PreferencesSection({
  textValue,
  onTextChange,
  voiceTranscript,
  voiceSummary,
  onVoiceSummaryReady,
  className,
}: PreferencesSectionProps) {
  const { status } = useVoice();
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const prevStatusRef = useRef(status);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const isVoiceActive = status === 'connected' || status === 'connecting';
  const hasTranscript = voiceTranscript.length > 0;
  const isPostCall = !isVoiceActive && hasTranscript;

  // Auto-switch to voice mode when voice becomes active
  useEffect(() => {
    if (isVoiceActive) {
      setInputMode('voice');
    }
  }, [isVoiceActive]);

  // Auto-scroll transcript feed when new entries arrive (container-scoped, not page)
  useEffect(() => {
    if (isVoiceActive && transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTo({
        top: transcriptContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [voiceTranscript.length, isVoiceActive]);

  // Detect voice disconnection and auto-summarize
  const summarizeTranscript = useCallback(async () => {
    if (voiceTranscript.length === 0) return;

    setIsSummarizing(true);
    setSummaryError(null);

    try {
      const res = await fetch('/api/ai/summarize-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: voiceTranscript.map((entry) => ({
            role: entry.role,
            content: entry.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to summarize voice consultation');
      }

      const data = await res.json();
      onVoiceSummaryReady(data.summary, data.extractedPreferences);
    } catch (err) {
      console.error('Voice summarization error:', err);
      setSummaryError(
        err instanceof Error ? err.message : 'Could not summarize voice session'
      );
    } finally {
      setIsSummarizing(false);
    }
  }, [voiceTranscript, onVoiceSummaryReady]);

  useEffect(() => {
    const wasConnected = prevStatusRef.current === 'connected';
    const nowDisconnected = status === 'disconnected';
    prevStatusRef.current = status;

    if (wasConnected && nowDisconnected && voiceTranscript.length > 0 && !voiceSummary) {
      summarizeTranscript();
    }
  }, [status, voiceTranscript.length, voiceSummary, summarizeTranscript]);

  const charCount = textValue.length;
  const maxChars = 500;

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h3 className="text-lg font-semibold">
          Anything specific you&apos;d like in your design?
        </h3>
        <p className="text-sm text-muted-foreground">
          Tell us what matters most to you
        </p>
      </div>

      {/* Input mode chooser — equal-prominence cards */}
      {inputMode === null && !isVoiceActive && !isPostCall && (
        <div className="grid grid-cols-2 gap-3">
          {/* Text option */}
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={cn(
              'flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border',
              'bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all',
              'text-center cursor-pointer'
            )}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <PenLine className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Type your vision</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Describe what you want in writing
              </p>
            </div>
          </button>

          {/* Voice option */}
          <button
            type="button"
            onClick={() => setInputMode('voice')}
            className={cn(
              'flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border',
              'bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all',
              'text-center cursor-pointer'
            )}
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Talk to Emma</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Describe your vision by voice
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Text input mode */}
      {inputMode === 'text' && !isVoiceActive && !isPostCall && (
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              value={textValue}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  onTextChange(e.target.value);
                }
              }}
              placeholder='e.g. "Keep my existing cabinets", "Add more storage", "Make it brighter"'
              className="min-h-[100px] resize-none"
              maxLength={maxChars}
              autoFocus
            />
            <span
              className={cn(
                'absolute bottom-2 right-3 text-xs tabular-nums',
                charCount > maxChars * 0.9
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {charCount}/{maxChars}
            </span>
          </div>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            onClick={() => setInputMode('voice')}
          >
            <Mic className="h-3.5 w-3.5" />
            Or talk to Emma instead
          </button>
        </div>
      )}

      {/* Voice mode: pre-call invitation */}
      {inputMode === 'voice' && !isVoiceActive && !isPostCall && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30">
            <PersonaAvatar context="visualizer" size="md" state="static" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Consult with Emma, your renovation assistant
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tell her what you&apos;re envisioning and she&apos;ll capture your preferences
              </p>
            </div>
            <TalkButton
              context="visualizer"
              variant="standalone"
              className="shrink-0"
            />
          </div>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            onClick={() => setInputMode('text')}
          >
            <PenLine className="h-3.5 w-3.5" />
            Or type your preferences instead
          </button>
        </div>
      )}

      {/* Active voice: compact indicator + real-time transcript */}
      {isVoiceActive && (
        <div className="space-y-2">
          <VoiceIndicator
            context="visualizer"
            className="rounded-lg"
          />
          {hasTranscript && (
            <div ref={transcriptContainerRef} className="max-h-[200px] overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              {voiceTranscript.map((entry) => (
                <VoiceChatBubble key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Post-call: summary card */}
      {isPostCall && (
        <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
          {/* Summarizing state */}
          {isSummarizing && (
            <div className="flex items-center gap-3 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Emma is summarizing your preferences...
              </p>
            </div>
          )}

          {/* Summary error */}
          {summaryError && (
            <div className="p-4">
              <p className="text-sm text-destructive">{summaryError}</p>
              <button
                type="button"
                className="text-sm text-primary underline mt-1"
                onClick={() => summarizeTranscript()}
              >
                Try again
              </button>
            </div>
          )}

          {/* Summary content */}
          {voiceSummary && !isSummarizing && (
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <PersonaAvatar
                  context="visualizer"
                  size="sm"
                  state="static"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Emma captured your preferences:
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {voiceSummary}
                  </p>
                </div>
              </div>

              {/* Collapsible full transcript */}
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setTranscriptExpanded((prev) => !prev)}
              >
                {transcriptExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {transcriptExpanded ? 'Hide' : 'Show'} full transcript ({voiceTranscript.length} messages)
              </button>

              {transcriptExpanded && (
                <div className="max-h-[250px] overflow-y-auto rounded border border-border bg-background p-3 space-y-2">
                  {voiceTranscript.map((entry) => (
                    <VoiceChatBubble key={entry.id} entry={entry} compact />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Post-call: also show text input for additional notes */}
      {isPostCall && voiceSummary && !isSummarizing && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Want to add anything else?
          </p>
          <div className="relative">
            <Textarea
              value={textValue}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  onTextChange(e.target.value);
                }
              }}
              placeholder="Add any additional notes..."
              className="min-h-[80px] resize-none"
              maxLength={maxChars}
            />
            <span
              className={cn(
                'absolute bottom-2 right-3 text-xs tabular-nums',
                charCount > maxChars * 0.9
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {charCount}/{maxChars}
            </span>
          </div>
        </div>
      )}

      {/* Session status */}
      {isPostCall && voiceSummary && !isSummarizing && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Your preferences have been saved</span>
        </div>
      )}
    </div>
  );
}
