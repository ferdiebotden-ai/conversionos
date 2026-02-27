'use client';

/**
 * Receptionist Input
 * Text input with inline TalkButton for the receptionist widget
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import { TalkButton } from '@/components/voice/talk-button';
import { MAX_CHAT_LENGTH } from '@/lib/utils/validation';
import type { PageContext } from '@/lib/ai/personas/types';

interface ReceptionistInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  context: PageContext;
  className?: string;
}

export function ReceptionistInput({
  onSend,
  disabled,
  context,
  className,
}: ReceptionistInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    }
  }, [value]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const isAtLimit = value.length >= MAX_CHAT_LENGTH;
  const showCount = value.length > 1800;

  return (
    <div className={cn('flex flex-col border-t border-border', className)}>
      <div className="flex items-end gap-2 p-3 pb-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHAT_LENGTH) {
              setValue(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask Emma anything..."
          disabled={disabled}
          maxLength={MAX_CHAT_LENGTH}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-h-[36px] max-h-[96px] py-2"
        />
        <div className="flex items-center gap-1 shrink-0">
          <TalkButton
            context={context}
            variant="inline"
            disabled={disabled}
          />
          <Button
            size="icon"
            className="h-9 w-9 bg-primary hover:bg-primary/90"
            onClick={handleSend}
            disabled={!value.trim() || disabled || isAtLimit}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {showCount && (
        <div className="px-3 pb-2 text-xs text-muted-foreground text-right" data-testid="char-count">
          {value.length}/{MAX_CHAT_LENGTH}
        </div>
      )}
    </div>
  );
}
