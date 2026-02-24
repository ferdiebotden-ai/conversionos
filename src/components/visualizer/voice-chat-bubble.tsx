'use client';

/**
 * Voice Chat Bubble
 * Animated chat bubble for voice transcript entries
 * User messages on right (primary), Emma on left (primary avatar)
 */

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { User, MessageCircle } from 'lucide-react';
import type { VoiceTranscriptEntry } from '@/lib/voice/config';

interface VoiceChatBubbleProps {
  entry: VoiceTranscriptEntry;
  compact?: boolean;
}

export function VoiceChatBubble({ entry, compact = false }: VoiceChatBubbleProps) {
  const prefersReducedMotion = useReducedMotion();
  const isUser = entry.role === 'user';

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'flex gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'shrink-0 rounded-full flex items-center justify-center',
          compact ? 'h-6 w-6' : 'h-7 w-7',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'
        )}
      >
        {isUser ? (
          <User className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        ) : (
          <MessageCircle className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2',
          compact ? 'text-xs' : 'text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}
      >
        {entry.content}
      </div>
    </motion.div>
  );
}
