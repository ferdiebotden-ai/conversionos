'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type HeroSliderConfig = Record<string, unknown>;

type PortfolioItem = {
  image_url?: string;
  imageUrl?: string;
};

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

type Slide = {
  imageUrl: string;
  headline: string;
};

export function HeroSlider({ branding, config, tokens, className }: SectionBaseProps) {
  const c = (config ?? {}) as unknown as HeroSliderConfig;
  const heroImageUrl = str(c['hero_image_url']) ?? str(c['heroImageUrl']);
  const heroHeadline = str(c['hero_headline']) ?? str(c['heroHeadline']);
  const tagline = str(c['tagline']) ?? str(c['heroSubheadline']) ?? str(c['hero_subheadline']);
  void tokens;

  const portfolio = (c['portfolio'] ?? c['projects'] ?? []) as PortfolioItem[];
  const portfolioImg0 = str(portfolio[0]?.image_url) ?? str(portfolio[0]?.imageUrl);
  const portfolioImg1 = str(portfolio[1]?.image_url) ?? str(portfolio[1]?.imageUrl);

  const slides: Slide[] = [
    heroImageUrl
      ? { imageUrl: heroImageUrl, headline: tagline ?? 'Excellence. Integrity. Dependability.' }
      : null,
    portfolioImg0
      ? {
          imageUrl: portfolioImg0,
          headline: heroHeadline ?? 'Specialists in Durham Home Renovations',
        }
      : null,
    portfolioImg1
      ? { imageUrl: portfolioImg1, headline: 'Over 30 Years of Experience' }
      : null,
  ].filter((s): s is Slide => s !== null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    if (slides.length <= 1) return;
    setPrevIndex((prev) => (prev !== null ? prev : activeIndex));
    setActiveIndex((current) => {
      setPrevIndex(current);
      return (current + 1) % slides.length;
    });
  }, [activeIndex, slides.length]);

  const goToSlide = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      setPrevIndex(activeIndex);
      setActiveIndex(index);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(advance, 6000);
    },
    [activeIndex, advance],
  );

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(advance, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [advance, slides.length]);

  /* Clear prevIndex after crossfade completes */
  useEffect(() => {
    if (prevIndex === null) return;
    const timeout = setTimeout(() => setPrevIndex(null), 1200);
    return () => clearTimeout(timeout);
  }, [prevIndex]);

  if (!slides.length) return null;

  return (
    <section
      className={[
        'relative isolate flex min-h-screen items-center justify-center overflow-hidden',
        'bg-[rgb(248,247,245)] text-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${branding?.name ?? 'CCR Renovations'} hero`}
    >
      {/* Slide layers */}
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        const isPrev = index === prevIndex;
        const isVisible = isActive || isPrev;

        return (
          <div
            key={index}
            className="absolute inset-0 -z-20"
            style={{
              opacity: isActive ? 1 : isPrev ? 0 : 0,
              transition: 'opacity 1.2s ease-in-out',
              zIndex: isActive ? 2 : isPrev ? 1 : 0,
            }}
            aria-hidden={!isActive}
          >
            {isVisible && (
              <div
                className="absolute inset-0"
                style={{
                  animation: isActive ? 'ccrKenBurns 8s ease-out forwards' : 'none',
                }}
              >
                <Image
                  src={slide.imageUrl}
                  alt={slide.headline}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        style={{ zIndex: 3 }}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8"
        style={{ zIndex: 4 }}
      >
        <h1
          key={activeIndex}
          className="animate-[ccrFadeUp_0.8s_ease-out_both] [font-family:Anton,sans-serif] uppercase leading-[1.05] tracking-[0.02em] text-white"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 5.75rem)' }}
        >
          {slides[activeIndex]?.headline}
        </h1>

        <nav
          className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-5"
          aria-label="Hero calls to action"
        >
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center rounded-none bg-[oklch(0.37_0.06_179)] px-8 py-4 [font-family:'Open_Sans',sans-serif] text-[15px] font-semibold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-[oklch(0.32_0.06_179)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            Design Your Space
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-none border-2 border-white bg-transparent px-8 py-4 [font-family:'Open_Sans',sans-serif] text-[15px] font-semibold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            Get a Free Quote
          </Link>
        </nav>
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3"
          style={{ zIndex: 5 }}
          role="tablist"
          aria-label="Hero slide navigation"
        >
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => goToSlide(index)}
              className={`h-3 w-3 rounded-full border-2 border-white transition-all duration-300 ${
                index === activeIndex ? 'bg-white' : 'bg-transparent hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes ccrKenBurns {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.1);
          }
        }
        @keyframes ccrFadeUp {
          from {
            opacity: 0;
            transform: translateY(1.5rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
