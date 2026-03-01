'use client';

/**
 * Before/After Slider — Opacity Overlay Approach
 *
 * The "before" image is the base layer at 100% opacity.
 * The "after" image overlays it, with opacity controlled by a horizontal
 * slider track at the bottom of the image.
 *
 * Intro animation sequence (Framer Motion `animate()`):
 *   0 → 100% over 1.5s, hold 0.8s, settle to 50% over 0.8s
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
}: BeforeAfterSliderProps) {
  const shouldReduce = useReducedMotion();
  const [sliderPosition, setSliderPosition] = useState(shouldReduce ? 50 : 0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(!!shouldReduce);
  const trackRef = useRef<HTMLDivElement>(null);

  // ─── Intro animation sequence ───────────────────────────────────────
  useEffect(() => {
    if (hasRevealed) return;

    let cancelled = false;

    async function runSequence() {
      // 1. Wait 0.5s
      await new Promise((r) => setTimeout(r, 500));
      if (cancelled) return;

      // 2. Animate 0% → 100% over 1.5s
      await new Promise<void>((resolve) => {
        const ctrl = animate(0, 100, {
          duration: 1.5,
          ease: [0.25, 0.46, 0.45, 0.94],
          onUpdate: (v) => {
            if (!cancelled) setSliderPosition(v);
          },
          onComplete: resolve,
        });
        if (cancelled) ctrl.stop();
      });
      if (cancelled) return;

      // 3. Hold for 0.8s
      await new Promise((r) => setTimeout(r, 800));
      if (cancelled) return;

      // 4. Animate 100% → 50% over 0.8s
      await new Promise<void>((resolve) => {
        const ctrl = animate(100, 50, {
          duration: 0.8,
          ease: [0.25, 0.46, 0.45, 0.94],
          onUpdate: (v) => {
            if (!cancelled) setSliderPosition(v);
          },
          onComplete: resolve,
        });
        if (cancelled) ctrl.stop();
      });
      if (cancelled) return;

      // 5. Enable user interaction
      setHasRevealed(true);
    }

    runSequence();

    return () => {
      cancelled = true;
    };
  }, [hasRevealed]);

  // ─── Position calculation (relative to the track) ───────────────────
  const updatePositionFromClient = useCallback((clientX: number) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPosition(percentage);
  }, []);

  // ─── Mouse events (track/thumb only) ───────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setHasRevealed(true);
      updatePositionFromClient(e.clientX);
    },
    [updatePositionFromClient],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      updatePositionFromClient(e.clientX);
    },
    [isDragging, updatePositionFromClient],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ─── Touch events (track/thumb only) ────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      setHasRevealed(true);
      const touch = e.touches[0];
      if (touch) updatePositionFromClient(touch.clientX);
    },
    [updatePositionFromClient],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      if (touch) updatePositionFromClient(touch.clientX);
    },
    [isDragging, updatePositionFromClient],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ─── Global listeners for drag continuation outside the track ───────
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div
      className={cn(
        'relative aspect-video overflow-hidden rounded-xl select-none',
        'border border-border',
        'max-h-[480px]',
        className,
      )}
    >
      {/* Before image — base layer, always 100% opacity */}
      <img
        src={beforeImage}
        alt={beforeLabel}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* After image — overlay, opacity driven by slider */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: sliderPosition / 100 }}
        draggable={false}
      />

      {/* ─── Bottom bar: gradient, labels, slider track ─────────────── */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          {/* Before label */}
          <span className="text-sm font-medium text-white/90 shrink-0">
            {beforeLabel}
          </span>

          {/* Slider track */}
          <div
            ref={trackRef}
            className={cn(
              'relative flex-1 h-2 bg-white/20 backdrop-blur-sm rounded-full',
              'cursor-pointer',
              isDragging && 'cursor-grabbing',
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Filled portion */}
            <div
              className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
              style={{ width: `${sliderPosition}%` }}
            />

            {/* Thumb */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                'w-6 h-6 rounded-full bg-white shadow-lg border-2 border-primary',
                'transition-transform duration-100',
                isDragging && 'scale-110',
              )}
              style={{ left: `${sliderPosition}%` }}
            />
          </div>

          {/* After label */}
          <span className="text-sm font-medium text-white/90 shrink-0">
            {afterLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
