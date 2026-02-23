'use client';

/**
 * Generation Loading
 * Engaging loading experience during AI visualization generation
 * Supports progressive concept previews via SSE streaming
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

// Tips to display while generating
const TIPS = [
  'AI is analyzing the structure and lighting of your room',
  'Applying design principles for the selected style',
  'Generating multiple concept variations',
  'Ensuring realistic textures and materials',
  'Pro tip: Take wide-angle shots from corners for best results',
  'The AI preserves your room\'s layout and dimensions',
  'Generated visualizations help communicate your vision',
  'Share your favorite concept with family for feedback',
];

export function GenerationLoading({
  style,
  roomType,
  progress,
  onCancel,
  className,
  stage,
  concepts,
  originalImage,
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

  // Calculate estimated time remaining based on progress
  const getTimeEstimate = (): string => {
    if (progress >= 92) return 'Finishing up...';
    if (progress >= 75) return 'Generating final concepts...';
    if (progress >= 50) return 'About 30 seconds...';
    if (progress >= 20) return 'About 45 seconds...';
    return 'About 60 seconds...';
  };

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

      {/* Main heading */}
      <h2 className="text-2xl font-bold text-center">
        {stage || 'Creating Your Vision'}
      </h2>
      <p className="text-muted-foreground mt-2 text-center max-w-md">
        Reimagining your {formatRoomType(roomType)} in the{' '}
        <span className="font-medium capitalize">{style}</span> style
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-md mt-8">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-muted-foreground">{getTimeEstimate()}</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Progressive concept preview grid (SSE streaming) */}
      {stage && (
        <div className="w-full max-w-lg mt-8 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => {
            const concept = concepts?.[i];
            return (
              <div
                key={i}
                className="relative aspect-square rounded-lg overflow-hidden border border-border"
              >
                {concept ? (
                  <img
                    src={concept.imageUrl}
                    alt={concept.description || `Concept ${i + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-500 opacity-0 animate-fade-in"
                    style={{ animationFillMode: 'forwards' }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '1';
                    }}
                  />
                ) : (
                  <div className="w-full h-full animate-pulse bg-muted" />
                )}
              </div>
            );
          })}
        </div>
      )}

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
        AI visualization uses advanced image generation to show design possibilities.
        Results are for inspiration purposes.
      </p>
    </div>
  );
}
