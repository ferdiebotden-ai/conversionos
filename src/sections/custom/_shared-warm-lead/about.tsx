'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function resolveText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const joined = value
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .join('\n\n')
      .trim();
    return joined || null;
  }
  return null;
}

type ServiceItem = {
  image_urls?: string[];
  imageUrls?: string[];
};

function resolveServiceFallbackImage(c: Record<string, unknown>): string | undefined {
  const services = (c['services'] ?? []) as ServiceItem[];
  if (!Array.isArray(services) || services.length === 0) return undefined;
  const urls = services[0]?.image_urls ?? services[0]?.imageUrls;
  const first = urls?.[0];
  return typeof first === 'string' && first.trim() ? first.trim() : undefined;
}

export function WarmLeadAbout({ branding, config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;

  const { paragraphs, mission, imageSrc } = useMemo(() => {
    const aboutCopy = resolveText(
      c['about_copy'] ?? c['aboutCopy'] ?? c['about'],
    );

    const missionText =
      str(c['mission']) ?? str(c['mission_statement']) ?? str(c['missionStatement']);

    const aboutImage =
      str(c['aboutImageUrl']) ??
      str(c['about_image_url']) ??
      str(c['aboutImage']) ??
      str(c['about_image']) ??
      resolveServiceFallbackImage(c);

    const normalizedCopy = aboutCopy?.replace(/\r\n/g, '\n').trim() ?? '';
    const splitCopy = normalizedCopy.includes('\n\n')
      ? normalizedCopy.split(/\n\s*\n/)
      : normalizedCopy.split('\n');

    return {
      paragraphs: splitCopy.map((p) => p.trim()).filter(Boolean),
      mission: missionText,
      imageSrc: aboutImage,
    };
  }, [c]);

  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestAnimationFrame(() => setIsVisible(true));
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (paragraphs.length === 0 && !mission) return null;

  const companyName = branding?.name?.trim() || 'Our Company';

  return (
    <section
      ref={sectionRef}
      className={['py-20 md:py-28', className].filter(Boolean).join(' ')}
      aria-labelledby="wl-about-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={[
            'grid items-start gap-10 transition-all duration-700 ease-out lg:grid-cols-2 lg:gap-16',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          ].join(' ')}
        >
          {/* Text column */}
          <div className="order-2 lg:order-1">
            {/* Eyebrow */}
            <p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Who We Are
            </p>

            {/* Heading */}
            <h2
              id="wl-about-heading"
              className="mt-3 font-heading text-[32px] uppercase leading-[1.1] tracking-wide text-foreground md:text-[44px]"
            >
              About {companyName}
            </h2>

            {/* Body paragraphs */}
            {paragraphs.length > 0 && (
              <div className="mt-6 space-y-4">
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={`about-p-${index}`}
                    className="font-body text-base leading-[1.7] text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {/* Mission quote */}
            {mission && (
              <blockquote className="mt-8 border-l-[3px] border-primary pl-5 font-body text-[17px] italic leading-[1.65] text-foreground">
                {mission}
              </blockquote>
            )}
          </div>

          {/* Image column */}
          <div className="order-1 lg:order-2">
            {imageSrc ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted shadow-xl">
                <Image
                  src={imageSrc}
                  alt={`${companyName} project`}
                  fill
                  sizes="(min-width: 1280px) 42vw, (min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-lg bg-muted">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  className="h-20 w-20 text-muted-foreground/20"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
