'use client';

/**
 * Preferences Section
 * Text input for design preferences.
 */

import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

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

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h3 className="text-lg font-semibold">
          Tell Us What You&apos;re Thinking
        </h3>
        <p className="text-sm text-muted-foreground">
          Describe your vision — colours, materials, features you love or want changed
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
          <div className="absolute bottom-2 right-3">
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
