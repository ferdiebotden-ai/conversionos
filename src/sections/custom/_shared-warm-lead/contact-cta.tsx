'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { SectionBaseProps } from '@/lib/section-types';

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export function WarmLeadContactCta({ config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;

  const phone =
    str(c['phone']) ??
    str(c['phoneNumber']) ??
    str(c['phone_number']) ??
    str(c['contact_phone']);
  const heroImage =
    str(c['heroImageUrl']) ??
    str(c['hero_image_url']) ??
    str(c['contactCtaImage']) ??
    str(c['contact_cta_image']);
  const headline =
    str(c['contactCtaHeadline']) ??
    str(c['contact_cta_headline']) ??
    'Ready to Start Your Project?';
  const subtext =
    str(c['contactCtaSubtext']) ??
    str(c['contact_cta_subtext']) ??
    'Get in touch for a free consultation and estimate.';

  return (
    <section
      className={[
        'relative w-full overflow-hidden py-20 md:py-28',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="wl-contact-cta-heading"
    >
      {/* Background image */}
      {heroImage && (
        <Image
          src={heroImage}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          loading="lazy"
        />
      )}

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-foreground/90 via-foreground/85 to-foreground/95"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <h2
          id="wl-contact-cta-heading"
          className="mb-4 font-heading text-4xl uppercase leading-tight tracking-wide text-white md:text-5xl lg:text-6xl"
        >
          {headline}
        </h2>

        <p className="mx-auto mb-10 max-w-2xl font-body text-lg text-white/80 md:text-xl">
          {subtext}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 font-body text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all duration-300 hover:brightness-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Design Your Space
          </Link>

          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-md border-2 border-white bg-transparent px-8 py-4 font-body text-sm font-semibold uppercase tracking-wider text-white transition-all duration-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            Get a Free Quote
          </Link>
        </div>

        {/* Phone line */}
        {phone && (
          <p className="mt-8 font-body text-sm text-white/60">
            Or call us:{' '}
            <a
              href={`tel:${phone.replace(/[^\d+]/g, '')}`}
              className="text-white/80 underline underline-offset-2 transition-colors hover:text-white"
            >
              {phone}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
