'use client';

/**
 * Talk Button
 * Prominent "Talk to [Name]" CTA for starting/ending voice mode
 * Two variants: inline (next to text input) and standalone (large CTA)
 */

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, PhoneOff } from 'lucide-react';
import { useVoice } from './voice-provider';
import type { PageContext } from '@/lib/ai/personas/types';

interface TalkButtonProps {
  context: PageContext;
  variant?: 'inline' | 'standalone';
  className?: string;
  disabled?: boolean | undefined;
}

export function TalkButton({
  context,
  variant = 'inline',
  className,
  disabled,
}: TalkButtonProps) {
  const { status, startVoice, endVoice, error } = useVoice();
  const name = 'Emma';
  const isActive = status === 'connected' || status === 'connecting';

  const handleClick = useCallback(async () => {
    if (isActive) {
      await endVoice();
    } else {
      await startVoice(context);
    }
  }, [isActive, endVoice, startVoice, context]);

  if (variant === 'standalone') {
    return (
      <div className="flex flex-col items-center">
        <Button
          onClick={handleClick}
          disabled={disabled}
          size="lg"
          className={cn(
            'h-14 px-8 rounded-full text-base font-semibold transition-all',
            isActive
              ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              : 'bg-[#1565C0] hover:bg-[#B71C1C] text-white',
            className
          )}
        >
          {isActive ? (
            <>
              <PhoneOff className="h-5 w-5 mr-2" />
              End Call
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              Talk to {name}
            </>
          )}
        </Button>
        {error && (
          <p className="text-xs text-destructive mt-1 text-center">{error}</p>
        )}
      </div>
    );
  }

  // Inline variant — pill button next to text input
  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      variant={isActive ? 'destructive' : 'outline'}
      className={cn(
        'h-10 shrink-0 rounded-full px-3 transition-all',
        !isActive && 'text-[#1565C0] border-[#1565C0]/30 hover:text-[#B71C1C] hover:bg-[#1565C0]/10',
        className
      )}
      aria-label={isActive ? 'End voice call' : `Talk to ${name}`}
      title={error || undefined}
    >
      {isActive ? (
        <>
          <PhoneOff className="h-4 w-4 mr-1.5" />
          End
        </>
      ) : (
        <>
          <Mic className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Talk to {name}</span>
          <span className="sm:hidden">Talk</span>
        </>
      )}
    </Button>
  );
}
