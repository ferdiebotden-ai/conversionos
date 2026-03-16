'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SectionBaseProps } from '@/lib/section-types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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

function resolveImageSource(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();

  const record = asRecord(value);
  if (!record) return null;

  const directKeys = ['publicUrl', 'url', 'src', 'signedUrl', 'image', 'file', 'path'] as const;
  for (const key of directKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  for (const nestedValue of Object.values(record)) {
    const nestedSource = resolveImageSource(nestedValue);
    if (nestedSource) return nestedSource;
  }

  return null;
}

function resolveServiceFallbackImage(config: SectionBaseProps['config']): string | null {
  const root = asRecord(config);
  if (!root) return null;

  const services =
    root['services'] ??
    asRecord(root['admin_settings'])?.['services'] ??
    asRecord(root['data'])?.['services'] ??
    null;

  if (!Array.isArray(services) || services.length === 0) return null;

  const firstService = asRecord(services[0]);
  if (!firstService) return null;

  const imageUrls =
    firstService['image_urls'] ??
    firstService['imageUrls'] ??
    firstService['images'] ??
    null;

  if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    return resolveImageSource(imageUrls[0]);
  }

  return (
    resolveImageSource(firstService['image_url'] ?? firstService['imageUrl'] ?? firstService['image']) ??
    null
  );
}

type ValueCard = {
  label: string;
  icon: 'shield' | 'star' | 'check';
};

const CORE_VALUES: ValueCard[] = [
  { label: 'Excellence', icon: 'star' },
  { label: 'Integrity', icon: 'shield' },
  { label: 'Dependability', icon: 'check' },
];

function ValueIcon({ icon }: { icon: ValueCard['icon'] }) {
  const svgClassName = 'h-10 w-10 text-[oklch(0.42_0.10_160)]';

  if (icon === 'star') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={svgClassName}
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }

  if (icon === 'shield') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={svgClassName}
        aria-hidden="true"
      >
        <path d="M12 3l7 3v5c0 4.5-2.9 8.6-7 10-4.1-1.4-7-5.5-7-10V6l7-3Z" />
        <path d="m9.5 12 1.8 1.8 3.7-4" />
      </svg>
    );
  }

  // check
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={svgClassName}
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function AboutStory({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const { paragraphs, mission, imageSrc } = useMemo(() => {
    const root = asRecord(config);
    const adminSettings = asRecord(root?.['admin_settings']);
    const data = asRecord(root?.['data']);
    const companyProfile =
      asRecord(root?.['company_profile']) ??
      asRecord(adminSettings?.['company_profile']) ??
      asRecord(data?.['company_profile']);

    // Resolve about_copy (array of paragraphs or single string)
    const aboutCopy = resolveText(
      root?.['about_copy'] ??
        root?.['aboutCopy'] ??
        companyProfile?.['about_copy'] ??
        companyProfile?.['aboutCopy'] ??
        companyProfile?.['extended_about_copy'],
    );

    // Resolve mission statement
    const missionText = resolveText(
      root?.['mission'] ??
        root?.['missionStatement'] ??
        root?.['mission_statement'] ??
        companyProfile?.['mission'] ??
        companyProfile?.['missionStatement'] ??
        companyProfile?.['mission_statement'],
    );

    // Resolve about image with service fallback
    const aboutImage =
      resolveImageSource(
        root?.['aboutImageUrl'] ??
          root?.['about_image_url'] ??
          root?.['aboutImage'] ??
          companyProfile?.['aboutImageUrl'] ??
          companyProfile?.['about_image_url'] ??
          companyProfile?.['aboutImage'],
      ) ?? resolveServiceFallbackImage(config);

    const normalizedCopy = aboutCopy?.replace(/\r\n/g, '\n').trim() ?? '';
    const splitCopy = normalizedCopy.includes('\n\n')
      ? normalizedCopy.split(/\n\s*\n/)
      : normalizedCopy.split('\n');

    return {
      paragraphs: splitCopy.map((p) => p.trim()).filter(Boolean),
      mission: missionText,
      imageSrc: aboutImage,
    };
  }, [config]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestAnimationFrame(() => setIsVisible(true));
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (paragraphs.length === 0) return null;

  const companyName = branding.name.trim() || 'CCR Renovations';

  return (
    <section
      id="about-story"
      ref={sectionRef}
      className={`py-20 ${className ?? ''}`}
      style={{ backgroundColor: 'oklch(0.97 0.005 85)' }}
      aria-labelledby="about-story-heading"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div
          className={`grid items-start gap-10 transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 lg:grid-cols-2 lg:gap-16 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          {/* Text column — left */}
          <div className="order-2 lg:order-1">
            {/* Eyebrow */}
            <p className="font-[Open_Sans,sans-serif] text-[12px] font-bold uppercase tracking-[0.24em] text-[oklch(0.42_0.10_160)]">
              Who We Are
            </p>

            {/* Heading */}
            <h2
              id="about-story-heading"
              className="mt-3 font-[Anton,sans-serif] text-[32px] uppercase leading-[1.1] tracking-wide text-[oklch(0.35_0.06_160)] md:text-[44px]"
            >
              About {companyName}
            </h2>

            {/* Body paragraphs */}
            <div className="mt-6 space-y-4">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={`about-p-${index}`}
                  className="font-[Open_Sans,sans-serif] text-[16px] leading-[26px] text-[oklch(0.45_0.02_85)]"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Mission statement */}
            {mission && (
              <blockquote className="mt-8 border-l-[3px] border-[oklch(0.42_0.10_160)] pl-5 font-[Open_Sans,sans-serif] text-[17px] italic leading-[28px] text-[oklch(0.35_0.06_160)]">
                {mission}
              </blockquote>
            )}

            {/* Values cards */}
            <div className="mt-10 grid grid-cols-3 gap-4">
              {CORE_VALUES.map((value) => (
                <div
                  key={value.label}
                  className="flex flex-col items-center rounded-[6px] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
                >
                  <ValueIcon icon={value.icon} />
                  <span className="mt-3 font-[Open_Sans,sans-serif] text-[13px] font-semibold uppercase tracking-[0.1em] text-[oklch(0.35_0.06_160)]">
                    {value.label}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <nav className="mt-10" aria-label="About section call to action">
              <Link
                href="/visualizer"
                className="inline-flex items-center justify-center rounded-[6px] bg-[oklch(0.35_0.06_160)] px-6 py-3 font-[Open_Sans,sans-serif] text-[15px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[oklch(0.35_0.06_160)] focus:ring-offset-2"
              >
                Get Your Free Design Estimate
              </Link>
            </nav>
          </div>

          {/* Image column — right */}
          <div className="order-1 lg:order-2">
            {imageSrc ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-[8px] bg-[oklch(0.93_0.005_85)] shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
                <Image
                  src={imageSrc}
                  alt={`${companyName} renovation project`}
                  fill
                  sizes="(min-width: 1280px) 42vw, (min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-[8px] bg-[oklch(0.93_0.005_85)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  className="h-20 w-20 text-[oklch(0.35_0.06_160/0.2)]"
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
