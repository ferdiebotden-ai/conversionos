'use client';

import { useState, useCallback, useRef } from 'react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import Image from 'next/image';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function GalleryBeforeAfterSlider({ branding, config, className }: Props) {
  const portfolio = config.portfolio ?? [];
  if (portfolio.length === 0) return null;

  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const before = portfolio[0]!;
  const after = portfolio.length > 1 ? portfolio[1]! : null;

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handleMouseDown = useCallback(() => { isDragging.current = true; }, []);
  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => { if (isDragging.current) updatePosition(e.clientX); },
    [updatePosition]
  );
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => { if (e.touches[0]) updatePosition(e.touches[0].clientX); },
    [updatePosition]
  );

  // Single image fallback
  if (!after) {
    return (
      <section className={`py-16 sm:py-20 ${className ?? ''}`}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <FadeInUp>
            <div className="overflow-hidden rounded-xl">
              <Image
                src={before.imageUrl}
                alt={before.title}
                width={1200}
                height={675}
                className="w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 900px"
              />
            </div>
          </FadeInUp>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-16 sm:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          See the Transformation
        </h2>

        <FadeInUp>
          <div
            ref={containerRef}
            className="relative aspect-[16/9] select-none overflow-hidden rounded-xl cursor-col-resize"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* After image (full) */}
            <Image
              src={after.imageUrl}
              alt={after.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 900px"
              draggable={false}
            />

            {/* Before image (clipped) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            >
              <Image
                src={before.imageUrl}
                alt={before.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 900px"
                draggable={false}
              />
            </div>

            {/* Slider handle */}
            <div
              className="absolute top-0 bottom-0 z-10 w-1 bg-white shadow-lg"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white shadow-md">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M7 4L3 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13 4L17 10L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Labels */}
            <span className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
              Before
            </span>
            <span className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
              After
            </span>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
