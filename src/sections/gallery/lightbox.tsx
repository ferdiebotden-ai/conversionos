'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function GalleryLightbox({ branding, config, className }: Props) {
  const portfolio = config.portfolio ?? [];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (portfolio.length === 0) return null;

  const current = selectedIndex !== null ? portfolio[selectedIndex] : null;

  const close = useCallback(() => setSelectedIndex(null), []);
  const prev = useCallback(() => {
    setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
  }, []);
  const next = useCallback(() => {
    setSelectedIndex((i) => (i !== null && i < portfolio.length - 1 ? i + 1 : i));
  }, [portfolio.length]);

  // Keyboard navigation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIndex, close, prev, next]);

  return (
    <section className={`py-16 sm:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Our Portfolio
        </h2>

        <FadeInUp>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {portfolio.map((item, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`View ${item.title}`}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    {item.title}
                  </span>
                )}
              </button>
            ))}
          </div>
        </FadeInUp>
      </div>

      {/* Lightbox overlay */}
      {current && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute -top-12 right-0 rounded-full p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Close lightbox"
            >
              <X className="size-6" />
            </button>

            {/* Image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
              <Image
                src={current.imageUrl}
                alt={current.title}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            </div>

            {/* Caption */}
            <div className="mt-4 text-center">
              <p className="text-lg font-medium text-white">{current.title}</p>
              {current.description && (
                <p className="mt-1 text-sm text-white/70">{current.description}</p>
              )}
            </div>

            {/* Navigation arrows */}
            {selectedIndex > 0 && (
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/70 hover:text-white transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}
            {selectedIndex < portfolio.length - 1 && (
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/70 hover:text-white transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
