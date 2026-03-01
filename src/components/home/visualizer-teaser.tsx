'use client';

/**
 * Visualizer Teaser
 * Before/after showcase on the homepage with real kitchen photos.
 * Uses the same opacity-overlay + bottom-bar slider approach as the
 * actual BeforeAfterSlider in the visualizer results.
 * Auto-animates on scroll-into-view, settles on the "after" image.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { animate, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

interface Transformation {
  label: string;
  before: string;
  after: string;
}

const DEFAULT_TRANSFORMATIONS: Transformation[] = [
  {
    label: 'Modern',
    before: '/images/teaser/before-kitchen.jpg',
    after: '/images/teaser/after-modern.jpg',
  },
  {
    label: 'Farmhouse',
    before: '/images/teaser/before-kitchen.jpg',
    after: '/images/teaser/after-farmhouse.jpg',
  },
  {
    label: 'Industrial',
    before: '/images/teaser/before-kitchen.jpg',
    after: '/images/teaser/after-industrial.jpg',
  },
];

export interface PortfolioImage {
  title: string;
  imageUrl: string;
}

interface VisualizerTeaserProps {
  className?: string;
  portfolioImages?: PortfolioImage[];
}

/**
 * Build transformation list from portfolio images.
 * Uses pairs of portfolio images as before/after when >= 2 images exist.
 * Falls back to default static transformations otherwise.
 */
function buildTransformations(portfolioImages?: PortfolioImage[]): Transformation[] {
  if (!portfolioImages || portfolioImages.length < 2) return DEFAULT_TRANSFORMATIONS;

  const validImages = portfolioImages.filter(p => p.imageUrl && p.title);
  if (validImages.length < 2) return DEFAULT_TRANSFORMATIONS;

  const transformations: Transformation[] = [];
  for (let i = 0; i < Math.min(validImages.length - 1, 3); i++) {
    transformations.push({
      label: validImages[i + 1]!.title.split(/[\s-]/)[0] || `Style ${i + 1}`,
      before: validImages[0]!.imageUrl,
      after: validImages[i + 1]!.imageUrl,
    });
  }

  return transformations.length > 0 ? transformations : DEFAULT_TRANSFORMATIONS;
}

export function VisualizerTeaser({ className, portfolioImages }: VisualizerTeaserProps) {
  const shouldReduce = useReducedMotion();
  const transformations = buildTransformations(portfolioImages);
  const [activeIndex, setActiveIndex] = useState(0);
  // 0 = fully "before", 100 = fully "after"
  const [sliderPosition, setSliderPosition] = useState(shouldReduce ? 90 : 0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(!!shouldReduce);
  const [showLabels, setShowLabels] = useState(!!shouldReduce);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const active = transformations[activeIndex]!;

  // ─── Intro animation sequence ────────────────────────────────────────
  const runIntroAnimation = useCallback(async () => {
    // 1. Wait 400ms
    await new Promise((r) => setTimeout(r, 400));
    if (cancelledRef.current) return;

    // 2. Animate 0% → 100% over 1.8s — reveal the "after"
    await new Promise<void>((resolve) => {
      const ctrl = animate(0, 100, {
        duration: 1.8,
        ease: [0.25, 0.46, 0.45, 0.94],
        onUpdate: (v) => {
          if (!cancelledRef.current) setSliderPosition(v);
        },
        onComplete: resolve,
      });
      if (cancelledRef.current) ctrl.stop();
    });
    if (cancelledRef.current) return;

    // 3. Hold at 100% for 0.6s
    await new Promise((r) => setTimeout(r, 600));
    if (cancelledRef.current) return;

    // 4. Settle to 90% — mostly "after", hints it's interactive
    await new Promise<void>((resolve) => {
      const ctrl = animate(100, 90, {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
        onUpdate: (v) => {
          if (!cancelledRef.current) setSliderPosition(v);
        },
        onComplete: resolve,
      });
      if (cancelledRef.current) ctrl.stop();
    });
    if (cancelledRef.current) return;

    setShowLabels(true);
  }, []);

  // ─── Auto-animate when section scrolls into view ─────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasAnimated) {
          observer.disconnect();
          setHasAnimated(true);
          cancelledRef.current = false;
          runIntroAnimation();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [hasAnimated, runIntroAnimation]);

  // ─── Position calculation from track interaction ─────────────────────
  const updatePositionFromClient = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPosition(pct);
  }, []);

  // ─── Mouse events ───────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      cancelledRef.current = true;
      setIsDragging(true);
      setShowLabels(true);
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

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // ─── Touch events ──────────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      cancelledRef.current = true;
      setIsDragging(true);
      setShowLabels(true);
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

  const handleTouchEnd = useCallback(() => setIsDragging(false), []);

  // ─── Global listeners for drag continuation ─────────────────────────
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

  // ─── Keyboard handler for slider (A1) ──────────────────────────────
  const handleSliderKeyDown = useCallback((e: React.KeyboardEvent) => {
    let newPos = sliderPosition;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        newPos = Math.min(sliderPosition + 5, 100);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        newPos = Math.max(sliderPosition - 5, 0);
        break;
      case 'Home':
        newPos = 0;
        break;
      case 'End':
        newPos = 100;
        break;
      default:
        return;
    }
    e.preventDefault();
    cancelledRef.current = true;
    setShowLabels(true);
    setSliderPosition(newPos);
  }, [sliderPosition]);

  // ─── Tab switch: reset & replay animation ────────────────────────────
  const handleTabSwitch = (index: number) => {
    cancelledRef.current = true;
    setActiveIndex(index);
    setSliderPosition(0);
    setShowLabels(false);
    setHasAnimated(false);
  };

  return (
    <div className={cn('text-center', className)}>
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
        <Sparkles className="size-4" />
        AI Visualization
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        See It Before You Build It
      </h2>
      <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
        Upload a photo of your room. Our AI transforms it into your dream space in seconds.
      </p>

      {/* Style tabs */}
      <div className="flex justify-center gap-2 mt-8">
        {transformations.map((t, i) => (
          <button
            key={i}
            onClick={() => handleTabSwitch(i)}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-medium transition-all duration-300',
              i === activeIndex
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Before/After — opacity overlay approach */}
      <div
        ref={containerRef}
        data-testid="visualizer-teaser"
        className="relative mt-6 mx-auto max-w-2xl aspect-[16/10] rounded-2xl overflow-hidden border border-border shadow-xl select-none"
      >
        {/* Before image — base layer, always 100% opacity */}
        <Image
          src={active.before}
          alt="Original kitchen — before"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
          priority
        />

        {/* After image — overlay, opacity driven by slider */}
        <Image
          src={active.after}
          alt={`${active.label} style — after`}
          fill
          className="object-cover"
          style={{ opacity: sliderPosition / 100 }}
          sizes="(max-width: 768px) 100vw, 672px"
          priority
        />

        {/* Labels — fade in after animation */}
        <div
          className={cn(
            'absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white transition-opacity duration-500',
            showLabels ? 'opacity-100' : 'opacity-0'
          )}
        >
          Before
        </div>
        <div
          className={cn(
            'absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white transition-opacity duration-500',
            showLabels ? 'opacity-100' : 'opacity-0'
          )}
        >
          After
        </div>

        {/* ─── Bottom bar: gradient, labels, slider track ─────────────── */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center gap-3">
            {/* Before label */}
            <span className="text-xs sm:text-sm font-medium text-white/90 shrink-0">
              Before
            </span>

            {/* Slider track */}
            <div
              ref={trackRef}
              data-testid="slider-track"
              role="slider"
              tabIndex={0}
              aria-label="Before and after comparison"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sliderPosition)}
              aria-valuetext={`Showing ${Math.round(sliderPosition)}% of the renovation`}
              className={cn(
                'relative flex-1 h-2 bg-white/20 backdrop-blur-sm rounded-full',
                'cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 rounded-full',
                isDragging && 'cursor-grabbing',
              )}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onKeyDown={handleSliderKeyDown}
            >
              {/* Filled portion */}
              <div
                className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
                style={{ width: `${sliderPosition}%` }}
              />

              {/* Thumb — 44px touch target on touch devices (WCAG), smaller on desktop */}
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                  'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-lg border-2 border-primary',
                  '[@media(hover:none)]:w-11 [@media(hover:none)]:h-11',
                  'transition-transform duration-100',
                  isDragging && 'scale-110',
                )}
                style={{ left: `${sliderPosition}%` }}
              />
            </div>

            {/* After label */}
            <span className="text-xs sm:text-sm font-medium text-white/90 shrink-0">
              After
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8">
        <Button asChild size="lg" className="h-12 px-8 text-base rounded-full">
          <Link href="/visualizer">
            Try It with Your Space
            <ArrowRight className="ml-2 size-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
