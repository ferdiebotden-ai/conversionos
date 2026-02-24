'use client';

/**
 * Visualizer Teaser
 * Before/after showcase on the homepage with real kitchen photos.
 * Auto-animates the slider on scroll-into-view for cinematic reveal.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

interface Transformation {
  label: string;
  before: string;
  after: string;
}

const TRANSFORMATIONS: Transformation[] = [
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

interface VisualizerTeaserProps {
  className?: string;
}

export function VisualizerTeaser({ className }: VisualizerTeaserProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(95);
  const [isDragging, setIsDragging] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const active = TRANSFORMATIONS[activeIndex]!;

  // Auto-animate slider when section scrolls into view
  useEffect(() => {
    const container = containerRef.current;
    if (!container || hasAnimated) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          setSliderPosition(95);
          // After 500ms, animate to 15% to reveal the "after"
          timeout = setTimeout(() => {
            const startTime = performance.now();
            const duration = 2000;
            const from = 95;
            const to = 15;

            function animate(now: number) {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const eased = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
              setSliderPosition(from + (to - from) * eased);

              if (progress < 1 && !userInteracted) {
                animationRef.current = requestAnimationFrame(animate);
              } else {
                setShowLabels(true);
              }
            }

            animationRef.current = requestAnimationFrame(animate);
          }, 500);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(container);
    return () => {
      observer.disconnect();
      if (timeout) clearTimeout(timeout);
    };
  }, [hasAnimated, userInteracted]);

  // Cancel animation on user interaction
  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setUserInteracted(true);
    setShowLabels(true);
  }, []);

  const handleMove = (clientX: number, rect: DOMRect) => {
    cancelAnimation();
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(pct);
  };

  const handleTabSwitch = (index: number) => {
    setActiveIndex(index);
    setSliderPosition(95);
    setShowLabels(false);
    setUserInteracted(false);
    setHasAnimated(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
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
        {TRANSFORMATIONS.map((t, i) => (
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

      {/* Before/After slider */}
      <div
        ref={containerRef}
        className="relative mt-6 mx-auto max-w-2xl aspect-[16/10] rounded-2xl overflow-hidden border border-border shadow-xl cursor-col-resize select-none"
        onMouseDown={() => { setIsDragging(true); cancelAnimation(); }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={(e) => {
          if (isDragging) handleMove(e.clientX, e.currentTarget.getBoundingClientRect());
        }}
        onTouchStart={() => cancelAnimation()}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) handleMove(touch.clientX, e.currentTarget.getBoundingClientRect());
        }}
      >
        {/* After image (full) */}
        <Image
          src={active.after}
          alt={`${active.label} style — after`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
          priority
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%`, willChange: 'width' }}
        >
          <Image
            src={active.before}
            alt="Original kitchen — before"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            priority
          />
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-md"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-shadow hover:shadow-xl">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
              <path d="M5 3L2 8L5 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 3L14 8L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Labels — fade in after animation */}
        <div
          className={cn(
            'absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white transition-opacity duration-500',
            showLabels ? 'opacity-100' : 'opacity-0'
          )}
        >
          Before
        </div>
        <div
          className={cn(
            'absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white transition-opacity duration-500',
            showLabels ? 'opacity-100' : 'opacity-0'
          )}
        >
          After
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
