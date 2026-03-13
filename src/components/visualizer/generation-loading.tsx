'use client';

/**
 * Generation Loading
 * Engaging loading experience during AI visualization generation.
 * Features: staged status messages, concept counter, blur-to-sharp reveals,
 * shimmer progress bar, and tips carousel.
 */

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Lightbulb } from 'lucide-react';
import type { GeneratedConcept } from '@/lib/schemas/visualization';

interface GenerationLoadingProps {
  style: string;
  roomType: string;
  progress: number;
  onCancel?: (() => void) | undefined;
  className?: string | undefined;
  /** Real stage text from SSE streaming (replaces default heading when provided) */
  stage?: string | undefined;
  /** Progressively populated concept previews from SSE streaming */
  concepts?: GeneratedConcept[] | undefined;
  /** Original image for context */
  originalImage?: string | undefined;
}

// Staged status messages by progress range
const STATUS_MESSAGES: { threshold: number; message: string }[] = [
  { threshold: 10, message: 'Analysing your room...' },
  { threshold: 25, message: 'Understanding the layout and lighting...' },
  { threshold: 40, message: 'Applying design principles...' },
  { threshold: 60, message: 'Generating concept variations...' },
  { threshold: 75, message: 'Refining textures and materials...' },
  { threshold: 90, message: 'Adding finishing touches...' },
  { threshold: 100, message: 'Almost there...' },
];

function getStatusMessage(progress: number): string {
  for (const { threshold, message } of STATUS_MESSAGES) {
    if (progress < threshold) return message;
  }
  return 'Finishing up...';
}

// Tips to display while generating
const TIPS = [
  'AI is analysing the structure and lighting of your room',
  'Applying design principles for the selected style',
  'Generating multiple concept variations',
  'Ensuring realistic textures and materials',
  'Pro tip: Take wide-angle shots from corners for best results',
  'The AI preserves your room\'s layout and dimensions',
  'Generated visualisations help communicate your vision',
  'Share your favourite concept with family for feedback',
];

export function GenerationLoading({
  style,
  roomType,
  progress,
  onCancel,
  className,
  stage,
  concepts,
}: GenerationLoadingProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);

  // Rotate tips every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
        setTipFading(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Format room type for display
  const formatRoomType = (type: string): string => {
    return type.replace(/_/g, ' ');
  };

  // Count ready concepts
  const readyCount = concepts?.length ?? 0;
  const statusMessage = stage || getStatusMessage(progress);

  // Concept counter text
  const counterText = useMemo(() => {
    if (readyCount === 0) return null;
    if (readyCount === 4) return 'All 4 concepts ready!';
    return `${readyCount} of 4 concepts ready!`;
  }, [readyCount]);

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      {/* Animated icon */}
      <div className="relative mb-8">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 w-28 h-28 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />

        {/* Inner pulsing circle */}
        <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Progress percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-primary mt-16">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Main heading with animated status message */}
      <AnimatePresence mode="wait">
        <motion.h2
          key={statusMessage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-bold text-center"
        >
          {statusMessage}
        </motion.h2>
      </AnimatePresence>
      <p className="text-muted-foreground mt-2 text-center max-w-md">
        Reimagining your {formatRoomType(roomType)} in the{' '}
        <span className="font-medium capitalize">{style}</span> style
      </p>

      {/* Concept counter */}
      <AnimatePresence>
        {counterText && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 text-sm font-medium text-primary"
          >
            {counterText}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Progress bar with shimmer */}
      <div className="w-full max-w-md mt-8">
        <div className="h-3 bg-muted rounded-full overflow-hidden relative">
          <div
            className="h-full bg-primary rounded-full relative overflow-hidden"
            style={{
              width: `${progress}%`,
              transition: 'width 0.3s ease-out',
            }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                animation: 'shimmer 2s infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* Progressive concept preview grid (SSE streaming) with blur-to-sharp */}
      <div className="w-full max-w-lg mt-8 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => {
          const concept = concepts?.[i];
          return (
            <div
              key={i}
              className="relative aspect-square rounded-lg overflow-hidden border border-border"
            >
              <AnimatePresence mode="wait">
                {concept ? (
                  <motion.img
                    key={`concept-${i}`}
                    src={concept.imageUrl}
                    alt={concept.description || `Concept ${i + 1}`}
                    className="w-full h-full object-cover"
                    initial={{ filter: 'blur(20px)', opacity: 0 }}
                    animate={{ filter: 'blur(0px)', opacity: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                ) : (
                  <motion.div
                    key={`skeleton-${i}`}
                    className="w-full h-full bg-muted"
                    animate={{
                      opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.2,
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Tips carousel */}
      <div className="mt-8 w-full max-w-md">
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-amber-600" />
            </div>
            <p
              className={cn(
                'text-sm text-muted-foreground transition-opacity duration-300',
                tipFading ? 'opacity-0' : 'opacity-100'
              )}
            >
              {TIPS[currentTipIndex]}
            </p>
          </div>
        </div>

        {/* Tip indicators */}
        <div className="flex justify-center gap-1.5 mt-3">
          {TIPS.slice(0, 5).map((_, index) => (
            <div
              key={index}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                index === currentTipIndex % 5
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
      </div>

      {/* Cancel option */}
      {onCancel && (
        <div className="mt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-center text-muted-foreground mt-8 max-w-sm">
        AI visualisation uses advanced image generation to show design possibilities.
        Results are for inspiration purposes.
      </p>

      {/* Inline keyframes for shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
