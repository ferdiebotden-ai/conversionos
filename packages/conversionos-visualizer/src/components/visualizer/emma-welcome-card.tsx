'use client';

/**
 * Emma Welcome Card
 * Personalised greeting after photo analysis, using company branding
 * and detected room features. Template-based (no LLM call — instant, $0).
 */

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import type { RoomAnalysis } from '@/lib/ai/photo-analyzer';

interface EmmaWelcomeCardProps {
  companyName: string;
  photoAnalysis: RoomAnalysis;
  className?: string;
}

function buildWelcomeGreeting(analysis: RoomAnalysis, companyName: string): string {
  const room = analysis.roomType.replace(/_/g, ' ');
  let greeting = `Welcome to ${companyName}! I can see you've uploaded a ${room}`;
  if (analysis.layoutType) greeting += ` with a ${analysis.layoutType} layout`;
  if (analysis.estimatedDimensions) greeting += `, roughly ${analysis.estimatedDimensions}`;
  if (analysis.currentCondition) {
    const condition = analysis.currentCondition;
    if (condition === 'excellent' || condition === 'good') {
      greeting += `. It's in ${condition} condition — great canvas to work with`;
    } else if (condition === 'dated') {
      greeting += `. It looks a bit dated — perfect candidate for a refresh`;
    } else {
      greeting += `. It's ready for a transformation`;
    }
  }
  greeting += `. Let's find the perfect style for your space.`;
  return greeting;
}

export function EmmaWelcomeCard({
  companyName,
  photoAnalysis,
  className,
}: EmmaWelcomeCardProps) {
  const greeting = buildWelcomeGreeting(photoAnalysis, companyName);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={className}
    >
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {/* Emma avatar */}
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <MessageCircle className="w-4.5 h-4.5 text-primary-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-semibold text-sm text-foreground">Emma</span>
              <span className="text-xs text-muted-foreground">{companyName}</span>
            </div>

            {/* Greeting text */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {greeting}
            </p>

            {/* Confirmation hint */}
            <p className="text-xs text-muted-foreground/70 mt-2">
              I&apos;ve highlighted the room type below — tap to confirm or choose a different one.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
