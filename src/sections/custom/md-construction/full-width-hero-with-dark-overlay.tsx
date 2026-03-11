'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type HeroConfig = {
  hero_headline?: string;
  hero_image_url?: string;
  hero_overline?: string;
  tagline?: string;
};

const passthroughLoader = ({ src }: { src: string }) => src;

export function FullWidthHeroWithDarkOverlay({ branding, config, tokens, className }: SectionBaseProps) {
  const heroConfig = (config ?? {}) as HeroConfig;
  const tokenMap = (tokens ?? {}) as Record<string, string | number | undefined>;
  const sectionRef = useRef<HTMLElement | null>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  const heroHeadline = heroConfig.hero_headline?.trim() ?? '';
  const heroImageUrl = heroConfig.hero_image_url?.trim() ?? '';
  const tagline = heroConfig.tagline?.trim() ?? '';
  const overline =
    heroConfig.hero_overline?.trim() ||
    branding.name.trim() ||
    'Renovation Contractor';

  const navHeightValue = tokenMap['navHeight'] ?? tokenMap['headerHeight'] ?? tokenMap['navigationHeight'];
  const navHeight =
    typeof navHeightValue === 'number'
      ? `${navHeightValue}px`
      : typeof navHeightValue === 'string' && navHeightValue.trim()
        ? navHeightValue
        : '88px';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setParallaxOffset(0);
      return;
    }

    let frameId = 0;

    const updateParallax = () => {
      frameId = 0;

      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom < 0 || rect.top > viewportHeight) return;

      const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
      const clampedProgress = Math.min(Math.max(progress, 0), 1);
      setParallaxOffset((clampedProgress - 0.5) * 48);
    };

    const requestUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateParallax);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, []);

  if (!heroHeadline || !tagline || !heroImageUrl) return null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="full-width-hero-heading"
      className={`relative isolate overflow-hidden ${className ?? ''}`}
    >
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: `translate3d(0, ${parallaxOffset}px, 0) scale(1.08)` }}
        >
          <Image
            fill
            priority
            alt={heroHeadline}
            loader={passthroughLoader}
            sizes="100vw"
            src={heroImageUrl}
            unoptimized
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-[oklch(0_0_0/0.55)]" />
      </div>

      <div
        className="relative mx-auto flex max-w-[1400px] items-center justify-center px-6 py-16 text-center md:px-10 lg:px-12"
        style={{ minHeight: `calc(100svh - ${navHeight})` }}
      >
        <article className="w-full max-w-[780px]">
          <div className="mx-auto mb-6 h-[3px] w-[60px] rounded-full bg-[oklch(var(--accent-dark,0.84_0.18_91.8))]" />

          <p className="[font-family:Inter,sans-serif] text-[14px] font-semibold uppercase leading-[18px] tracking-[1.5px] text-[oklch(1_0_0)]">
            {overline}
          </p>

          <h1
            id="full-width-hero-heading"
            className="mt-5 [font-family:Poppins,sans-serif] text-[clamp(2.5rem,5vw,3rem)] font-semibold leading-[1.15] text-[oklch(1_0_0)]"
          >
            {heroHeadline}
          </h1>

          <p className="mx-auto mt-5 max-w-[640px] [font-family:Inter,sans-serif] text-[15px] leading-[25px] text-[oklch(1_0_0/0.8)]">
            {tagline}
          </p>

          <footer className="mt-10">
            <nav aria-label="Hero actions" className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/visualizer"
                className="inline-flex min-h-12 min-w-[240px] items-center justify-center rounded-[4px] bg-primary px-6 py-3 [font-family:Inter,sans-serif] text-[18px] font-semibold leading-[26px] text-primary-foreground transition-colors duration-300 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent"
              >
                See Your Renovation
              </Link>

              <Link
                href="/contact"
                className="inline-flex min-h-12 min-w-[240px] items-center justify-center rounded-[4px] border-2 border-primary bg-transparent px-6 py-3 [font-family:Inter,sans-serif] text-[18px] font-semibold leading-[26px] text-primary transition-colors duration-300 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent"
              >
                Get a Free Estimate
              </Link>
            </nav>
          </footer>
        </article>
      </div>
    </section>
  );
}
