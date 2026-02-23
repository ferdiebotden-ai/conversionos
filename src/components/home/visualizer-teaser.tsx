'use client';

/**
 * Visualizer Teaser
 * Before/after showcase on the homepage to drive visualizer engagement.
 * Shows sample transformations with a CTA to try the visualizer.
 */

import { useState } from 'react';
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
    label: 'Modern Kitchen',
    before: '/images/demo/kitchen-detail.png',
    after: '/images/demo/kitchen-modern.png',
  },
  {
    label: 'Spa Bathroom',
    before: '/images/demo/bathroom-tub.png',
    after: '/images/demo/bathroom-spa.png',
  },
  {
    label: 'Entertainment Basement',
    before: '/images/demo/basement-walkout.png',
    after: '/images/demo/basement-entertainment.png',
  },
];

interface VisualizerTeaserProps {
  className?: string;
}

export function VisualizerTeaser({ className }: VisualizerTeaserProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const active = TRANSFORMATIONS[activeIndex]!;

  const handleMove = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPosition(pct);
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

      {/* Transformation selector tabs */}
      <div className="flex justify-center gap-2 mt-8">
        {TRANSFORMATIONS.map((t, i) => (
          <button
            key={i}
            onClick={() => { setActiveIndex(i); setSliderPosition(50); }}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              i === activeIndex
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Before/After slider */}
      <div
        className="relative mt-6 mx-auto max-w-2xl aspect-[16/10] rounded-xl overflow-hidden border-2 border-border shadow-lg cursor-col-resize select-none"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={(e) => {
          if (isDragging) handleMove(e.clientX, e.currentTarget.getBoundingClientRect());
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) handleMove(touch.clientX, e.currentTarget.getBoundingClientRect());
        }}
      >
        {/* After image (full) */}
        <Image
          src={active.after}
          alt={`${active.label} — after`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <Image
            src={active.before}
            alt={`${active.label} — before`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-md"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground">
              <path d="M5 3L2 8L5 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 3L14 8L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          Before
        </div>
        <div className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          After
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8">
        <Button asChild size="lg" className="h-12 px-8 text-base">
          <Link href="/visualizer">
            Try It with Your Space
            <ArrowRight className="ml-2 size-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
