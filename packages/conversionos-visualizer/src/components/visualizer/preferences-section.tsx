'use client';

/**
 * Preferences Section
 * Text input with dictation support for design preferences.
 * Uses Web Speech API for free, real-time voice-to-text (en-CA).
 */

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff } from 'lucide-react';
import { useDictation } from '@/hooks/use-dictation';

interface PreferencesSectionProps {
  textValue: string;
  onTextChange: (value: string) => void;
  className?: string | undefined;
}

export function PreferencesSection({
  textValue,
  onTextChange,
  className,
}: PreferencesSectionProps) {
  const charCount = textValue.length;
  const maxChars = 500;
  const dictation = useDictation();

  // Append dictated text to existing textarea content
  useEffect(() => {
    if (dictation.transcript && dictation.status === 'recording') {
      const combined = textValue
        ? `${textValue.trimEnd()} ${dictation.transcript}`
        : dictation.transcript;
      if (combined.length <= maxChars) {
        onTextChange(combined);
      }
    }
    // Only react to transcript changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictation.transcript]);

  const handleMicToggle = () => {
    if (dictation.status === 'recording') {
      dictation.stopDictation();
      dictation.clearTranscript();
    } else {
      dictation.clearTranscript();
      dictation.startDictation();
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h3 className="text-lg font-semibold">
          Tell Us What You&apos;re Thinking
        </h3>
        <p className="text-sm text-muted-foreground">
          Describe your vision — type or tap the mic to dictate
        </p>
      </div>

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
            className="min-h-[100px] resize-none pr-20"
            maxLength={maxChars}
            autoFocus
          />
          <div className="absolute bottom-2 right-3 flex items-center gap-2">
            {/* Dictation button — hidden if unsupported */}
            {dictation.status !== 'unsupported' && (
              <button
                type="button"
                onClick={handleMicToggle}
                className={cn(
                  'rounded-full p-1.5 transition-colors',
                  dictation.status === 'recording'
                    ? 'bg-red-100 text-red-600 animate-pulse dark:bg-red-900/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                aria-label={dictation.status === 'recording' ? 'Stop dictation' : 'Start dictation'}
              >
                {dictation.status === 'recording' ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}

            <span
              className={cn(
                'text-xs tabular-nums',
                charCount > maxChars * 0.9
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {charCount}/{maxChars}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
