'use client';

/**
 * Hero Visualizer Showcase Section
 *
 * Before/after opacity slider for the hero section.
 * Uses Gemini-generated or scraped kitchen images to demonstrate
 * the AI Design Visualiser. Auto-animates on mount (above the fold).
 *
 * Adapted from the LRC warm-lead bespoke build but conforming to
 * the standard SectionBaseProps interface for the section registry.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { animate, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

/** Image configuration for the hero visualiser before/after slider. */
interface HeroVisualizerImages {
  before: string;
  styles: Array<{ label: string; after: string }>;
}

interface StyleOption {
  label: string;
  after: string;
}

/** Default fallback images when config is not set. */
const DEFAULT_BEFORE = '/images/hero/before-kitchen.png';
const DEFAULT_STYLES: StyleOption[] = [
  { label: 'Transitional', after: '/images/hero/after-transitional.png' },
  { label: 'Modern', after: '/images/hero/after-modern.png' },
  { label: 'Farmhouse', after: '/images/hero/after-farmhouse.png' },
  { label: 'Industrial', after: '/images/hero/after-industrial.png' },
  { label: 'Scandinavian', after: '/images/hero/after-scandinavian.png' },
];

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function VisualizerShowcaseHero({ branding, config, className }: Props) {
  const shouldReduce = useReducedMotion();

  // Read image config from company_profile, fall back to defaults
  const configRecord = config as unknown as Record<string, unknown>;
  const vizConfig = configRecord['heroVisualizerImages'] as
    | HeroVisualizerImages
    | undefined;
  const beforeImage = vizConfig?.before ?? DEFAULT_BEFORE;
  const styles: StyleOption[] =
    vizConfig?.styles && vizConfig.styles.length > 0
      ? vizConfig.styles
      : DEFAULT_STYLES;

  const [activeIndex, setActiveIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(shouldReduce ? 90 : 0);
  const [isDragging, setIsDragging] = useState(false);
  const [, setHasAnimated] = useState(!!shouldReduce);
  const [showLabels, setShowLabels] = useState(!!shouldReduce);
  const trackRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const active = styles[activeIndex]!;

  const headline = config.heroHeadline || branding.tagline;

  // ── Intro animation: sweep from 0 -> 100 -> settle at 90 ──────────
  const runIntroAnimation = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 600));
    if (cancelledRef.current) return;

    await new Promise<void>((resolve) => {
      const ctrl = animate(0, 100, {
        duration: 2.2,
        ease: [0.25, 0.46, 0.45, 0.94],
        onUpdate: (v) => {
          if (!cancelledRef.current) setSliderPosition(v);
        },
        onComplete: resolve,
      });
      if (cancelledRef.current) ctrl.stop();
    });
    if (cancelledRef.current) return;

    await new Promise((r) => setTimeout(r, 500));
    if (cancelledRef.current) return;

    await new Promise<void>((resolve) => {
      const ctrl = animate(100, 88, {
        duration: 0.5,
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

  // ── Auto-animate on mount (hero is above the fold) ─────────────────
  const hasAnimatedRef = useRef(false);
  useEffect(() => {
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;
    cancelledRef.current = false;
    requestAnimationFrame(() => runIntroAnimation());
  }, [runIntroAnimation]);

  // ── Position calculation from pointer ──────────────────────────────
  const updatePositionFromClient = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPosition(pct);
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────
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

  // ── Touch events ──────────────────────────────────────────────────
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

  // ── Global listeners ──────────────────────────────────────────────
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

  // ── Keyboard ──────────────────────────────────────────────────────
  const handleSliderKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
    },
    [sliderPosition],
  );

  // ── Tab switch ────────────────────────────────────────────────────
  const handleTabSwitch = (index: number) => {
    cancelledRef.current = true;
    setActiveIndex(index);
    setSliderPosition(0);
    setShowLabels(false);
    setHasAnimated(false);
  };

  return (
    <section
      className={cn(
        'relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/30',
        className,
      )}
    >
      <div className="container mx-auto px-4 py-16 md:py-20 lg:py-24">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          {/* Left: Tagline + CTA */}
          <div className="order-2 space-y-6 md:order-1">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {headline}
            </h1>
            <p className="text-lg leading-8 text-muted-foreground md:text-xl">
              See your renovation vision come to life. Our AI Design Visualiser
              lets you explore styles before construction begins.
            </p>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full px-8 text-lg"
              >
                <Link href="/visualizer">
                  Visualise Your Dream Space
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
              {branding.phone && (
                <a
                  href={`tel:${branding.phone.replace(/\D/g, '')}`}
                  className="text-base text-muted-foreground transition-colors hover:text-foreground"
                >
                  {branding.phone}
                </a>
              )}
            </div>
          </div>

          {/* Right: Before/After slider card */}
          <div className="order-1 space-y-4 md:order-2">
            {/* AI-Powered badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tracking-wide text-card-foreground">
                <Sparkles className="size-3 text-primary" />
                AI-Powered
              </span>
            </div>

            {/* Glassmorphic card container */}
            <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-2xl shadow-black/10">
              {/* Style tabs */}
              <div className="flex gap-1 border-b border-border px-4 pt-3 pb-2">
                {styles.map((style, i) => (
                  <button
                    key={style.label}
                    onClick={() => handleTabSwitch(i)}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300',
                      i === activeIndex
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>

              {/* Before/After image area */}
              <div className="relative aspect-[16/10] select-none overflow-hidden">
                {/* Before image — base layer */}
                <Image
                  src={beforeImage}
                  alt="Kitchen before renovation"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 100vw, 600px"
                  priority
                />

                {/* After image — opacity overlay */}
                <Image
                  src={active.after}
                  alt={`${active.label} style renovation`}
                  fill
                  className="object-cover object-center"
                  style={{ opacity: sliderPosition / 100 }}
                  sizes="(max-width: 768px) 100vw, 600px"
                  priority
                />

                {/* Corner labels */}
                <div
                  className={cn(
                    'absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm transition-opacity duration-500',
                    showLabels ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  Before
                </div>
                <div
                  className={cn(
                    'absolute right-3 top-3 rounded-full bg-primary/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur-sm transition-opacity duration-500',
                    showLabels ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  After
                </div>

                {/* Bottom slider bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                      Before
                    </span>
                    <div
                      ref={trackRef}
                      role="slider"
                      tabIndex={0}
                      aria-label="Before and after comparison"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(sliderPosition)}
                      className={cn(
                        'relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/15',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black/50',
                        isDragging && 'cursor-grabbing',
                      )}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      onKeyDown={handleSliderKeyDown}
                    >
                      {/* Filled portion */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-primary/60"
                        style={{ width: `${sliderPosition}%` }}
                      />
                      {/* Thumb */}
                      <div
                        className={cn(
                          'absolute top-1/2 -translate-x-1/2 -translate-y-1/2',
                          'h-4 w-4 rounded-full border-2 border-primary bg-white shadow-lg',
                          '[@media(hover:none)]:h-10 [@media(hover:none)]:w-10',
                          'transition-transform duration-100',
                          isDragging && 'scale-110',
                        )}
                        style={{ left: `${sliderPosition}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                      After
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA bar */}
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">Drag to compare</p>
                <Button
                  asChild
                  size="sm"
                  className="h-8 rounded-full px-4 text-xs font-semibold"
                >
                  <Link href="/visualizer">
                    Try with Your Space
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
