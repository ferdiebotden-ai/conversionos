'use client';

/**
 * Progress Loader Components
 * Reusable multi-step progress indicator and PDF skeleton
 * for engaging loading experiences
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Lightbulb } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// --- StepProgress ---

interface ProgressStep {
  label: string;
}

interface StepProgressProps {
  steps: ProgressStep[];
  stepDuration?: number;
  tips?: string[];
  tipDuration?: number;
  className?: string;
}

export function StepProgress({
  steps,
  stepDuration = 2500,
  tips,
  tipDuration = 3500,
  className,
}: StepProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepFading, setStepFading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Tip rotation state
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);

  // Cycle through steps on a timer
  useEffect(() => {
    if (steps.length <= 1) return;

    const interval = setInterval(() => {
      setStepFading(true);
      setTimeout(() => {
        setCurrentStepIndex((prev) => {
          const next = prev + 1;
          return next < steps.length ? next : prev;
        });
        setStepFading(false);
      }, 200);
    }, stepDuration);

    return () => clearInterval(interval);
  }, [steps.length, stepDuration]);

  // Track elapsed time for progress bar
  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed((prev) => prev + 100);
    }, 100);

    return () => clearInterval(tick);
  }, []);

  // Rotate tips
  useEffect(() => {
    if (!tips || tips.length <= 1) return;

    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
        setTipFading(false);
      }, 300);
    }, tipDuration);

    return () => clearInterval(interval);
  }, [tips, tipDuration]);

  // Non-linear progress: cubic ease-out, capped at 95%
  const totalDuration = steps.length * stepDuration;
  const t = Math.min(elapsed / totalDuration, 1);
  const progress = Math.min((1 - Math.pow(1 - t, 3)) * 100, 95);

  const currentStep = steps[currentStepIndex];

  return (
    <div className={cn('flex flex-col items-center py-8 px-4', className)}>
      {/* Step label with spinner */}
      <div
        className="flex items-center gap-3 mb-6"
        aria-live="polite"
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" />
        <p
          className={cn(
            'text-sm font-medium transition-opacity duration-200 motion-reduce:transition-none',
            stepFading ? 'opacity-0' : 'opacity-100'
          )}
        >
          {currentStep?.label}
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="w-full max-w-sm"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tips carousel */}
      {tips && tips.length > 0 && (
        <div className="mt-8 w-full max-w-sm">
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </div>
              <p
                className={cn(
                  'text-sm text-muted-foreground transition-opacity duration-300 motion-reduce:transition-none',
                  tipFading ? 'opacity-0' : 'opacity-100'
                )}
              >
                {tips[currentTipIndex]}
              </p>
            </div>
          </div>

          {/* Tip dot indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {tips.slice(0, 5).map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors motion-reduce:transition-none',
                  index === currentTipIndex % 5
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- PdfSkeleton ---

export function PdfSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Toolbar skeleton */}
      <div className="bg-muted p-2 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Document body */}
      <div className="bg-white p-8 h-[400px] space-y-6">
        {/* Company header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>

        <Skeleton className="h-px w-full" />

        {/* Customer info section */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        <Skeleton className="h-px w-full" />

        {/* Total section */}
        <div className="flex justify-end">
          <div className="space-y-2 w-48">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
