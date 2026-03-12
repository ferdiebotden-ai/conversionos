// @ts-nocheck
'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { SectionBaseProps } from '@/lib/section-types';

type HeroConfig = Record<string, unknown>;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export function HeroSection({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;
  const c = (config ?? {}) as unknown as HeroConfig;
  const headline = str(c['hero_headline']) ?? str(c['heroHeadline']);
  const tagline = str(c['tagline']) ?? str(c['heroSubheadline']) ?? str(c['hero_subheadline']);
  const heroImageUrl = str(c['hero_image_url']) ?? str(c['heroImageUrl']);

  if (!headline || !tagline || !heroImageUrl) return null;

  return (
    <section
      className={[
        'relative isolate flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden',
        'bg-[oklch(var(--background))] text-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${branding?.name ?? 'Westmount Craftsmen'} hero`}
    >
      <div
        className="absolute inset-0 -z-20 hidden bg-cover bg-center bg-fixed md:block"
        style={{ backgroundImage: `url(${heroImageUrl})` }}
        aria-hidden="true"
      />

      <div className="absolute inset-0 -z-20 md:hidden">
        <Image
          src={heroImageUrl}
          alt={headline}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.35)_100%)]" />

      <div className="mx-auto flex w-full max-w-6xl justify-center px-4 sm:px-6 lg:px-8">
        <article className="flex max-w-4xl flex-col items-center text-center">
          <p className="sr-only">{branding?.name ?? 'Westmount Craftsmen'}</p>

          <h1
            className="[font-family:Raleway,sans-serif] text-4xl font-bold uppercase leading-none tracking-[0.1em] text-white opacity-100 transition-all duration-700 ease-out starting:translate-y-6 starting:opacity-0 md:text-[72px] md:tracking-[3.6px]"
          >
            {headline}
          </h1>

          <p
            className="mt-5 [font-family:Mulish,sans-serif] text-lg font-normal leading-[1.6] text-white/95 opacity-100 transition-all delay-300 duration-700 ease-out starting:translate-y-6 starting:opacity-0 md:text-[18px] md:leading-[28.8px]"
          >
            {tagline}
          </p>

          <nav
            className="mt-8 flex w-full flex-col gap-4 opacity-100 transition-all duration-700 ease-out starting:translate-y-6 starting:opacity-0 md:w-auto md:flex-row md:justify-center"
            style={{ transitionDelay: '600ms' }}
            aria-label="Hero calls to action"
          >
            <Link
              href="/visualizer"
              className="inline-flex w-full items-center justify-center rounded-[6px] bg-primary px-8 py-[14px] [font-family:Mulish,sans-serif] text-[15px] font-medium leading-5 text-primary-foreground transition duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black md:w-auto"
            >
              Start Your Project
            </Link>
            <Link
              href="/projects"
              className="inline-flex w-full items-center justify-center rounded-[6px] border-2 border-white bg-transparent px-8 py-[14px] [font-family:Mulish,sans-serif] text-[15px] font-medium leading-5 text-white transition duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black md:w-auto"
            >
              View Our Work
            </Link>
          </nav>
        </article>
      </div>
    </section>
  );
}
