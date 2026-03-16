'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { SectionBaseProps } from '@/lib/section-types';

function s(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }

export function ContactCtaBand({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const phone = s(c['phone']) || s(c['phoneNumber']) || s(c['phone_number']) || '(289) 675-7366';
  const heroImage = s(c['contactCtaImage']) || s(c['hero_image_url']) || s(c['heroImageUrl']) || '/images/hero.jpg';
  const headline = s(c['contactCtaHeadline']) || 'Ready to Start Your Renovation?';
  const subtext = s(c['contactCtaSubtext']) || 'Contact CCR Renovations for a free consultation';

  return (
    <section
      className={`relative w-full overflow-hidden py-20 md:py-28 ${className ?? ''}`}
      style={{
        ['--ccr-green' as string]: 'oklch(0.35 0.08 160)',
        ['--ccr-green-dark' as string]: 'oklch(0.20 0.06 160)',
      }}
    >
      {/* Background image */}
      <Image
        src={heroImage}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        priority={false}
      />

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, var(--ccr-green-dark) 0%, oklch(0.12 0.02 160 / 0.92) 50%, oklch(0.08 0.01 160 / 0.95) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <h2
          className="mb-4 text-4xl font-bold uppercase leading-tight tracking-wide text-white md:text-5xl lg:text-6xl"
          style={{ fontFamily: "'Anton', sans-serif" }}
        >
          {headline}
        </h2>

        <p
          className="mx-auto mb-10 max-w-2xl text-lg text-white/80 md:text-xl"
          style={{ fontFamily: "'Open Sans', sans-serif" }}
        >
          {subtext}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center rounded-md bg-white px-8 py-4 text-sm font-semibold uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:shadow-xl"
            style={{
              fontFamily: "'Open Sans', sans-serif",
              color: '#164A41',
            }}
          >
            Design Your Space
          </Link>

          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-md border-2 border-white bg-transparent px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-all duration-300 hover:bg-white/10 hover:scale-105"
            style={{ fontFamily: "'Open Sans', sans-serif" }}
          >
            Get a Free Quote
          </Link>
        </div>

        {/* Phone line */}
        <p
          className="mt-8 text-sm text-white/60"
          style={{ fontFamily: "'Open Sans', sans-serif" }}
        >
          Or call us:{' '}
          <a
            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
            className="text-white/80 underline underline-offset-2 transition-colors hover:text-white"
          >
            {phone}
          </a>
        </p>
      </div>
    </section>
  );
}
