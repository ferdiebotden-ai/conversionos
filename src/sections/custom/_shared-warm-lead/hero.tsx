'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export function WarmLeadHero({ branding, config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;

  const heroImage =
    str(c['heroImageUrl']) ??
    str(c['hero_image_url']) ??
    str(c['heroImage']) ??
    str(c['hero_image']);
  const headline =
    str(c['heroHeadline']) ??
    str(c['hero_headline']) ??
    str(branding?.name);
  const tagline =
    str(c['tagline']) ??
    str(c['heroSubheadline']) ??
    str(c['hero_subheadline']) ??
    str(c['hero_tagline']);

  const sectionRef = useRef<HTMLElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      ref={sectionRef}
      className={[
        'relative isolate flex min-h-screen items-center justify-center overflow-hidden',
        'bg-foreground text-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${branding?.name ?? 'Company'} hero`}
    >
      {/* Background image with Ken Burns */}
      {heroImage && (
        <div
          className="absolute inset-0 -z-20"
          style={{
            animation: isReady ? 'wlHeroKenBurns 15s ease-out forwards' : 'none',
          }}
        >
          <Image
            src={heroImage}
            alt={headline ?? branding?.name ?? 'Hero background'}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/70"
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={[
          'relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8',
          'transition-all duration-1000 ease-out',
          isReady ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        ].join(' ')}
      >
        {/* Headline */}
        <h1
          className="font-heading uppercase leading-[1.05] tracking-[0.02em] text-white"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
        >
          {headline ?? 'Building Your Vision'}
        </h1>

        {/* Tagline */}
        {tagline && (
          <p
            className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-white/85 md:text-xl"
          >
            {tagline}
          </p>
        )}

        {/* CTAs */}
        <nav
          className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-5"
          aria-label="Hero calls to action"
        >
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 font-body text-[15px] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition-all duration-300 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black"
          >
            Design Your Space
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-md border-2 border-white bg-transparent px-8 py-4 font-body text-[15px] font-semibold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            Get a Free Quote
          </Link>
        </nav>
      </div>

      {/* Ken Burns keyframes */}
      <style jsx>{`
        @keyframes wlHeroKenBurns {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.08);
          }
        }
      `}</style>
    </section>
  );
}
