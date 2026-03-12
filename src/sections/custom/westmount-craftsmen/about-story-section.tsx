// @ts-nocheck
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SectionBaseProps } from '@/lib/section-types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function resolveText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const joined = value
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .join('\n\n');
    return joined.trim() ? joined.trim() : null;
  }

  return null;
}

function resolveImageSource(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();

  const record = asRecord(value);
  if (!record) return null;

  const directKeys = ['publicUrl', 'url', 'src', 'signedUrl', 'image', 'file', 'path'];
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

export function AboutStorySection({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { paragraphs, imageSrc } = useMemo(() => {
    const root = asRecord(config);
    const adminSettings = asRecord(root?.['admin_settings']);
    const data = asRecord(root?.['data']);
    const companyProfile =
      asRecord(root?.['company_profile']) ??
      asRecord(adminSettings?.['company_profile']) ??
      asRecord(data?.['company_profile']);

    const aboutCopy = resolveText(
      companyProfile?.['about_copy'] ??
        companyProfile?.['aboutCopy'] ??
        companyProfile?.['extended_about_copy'],
    );

    const imageCollection = asRecord(companyProfile?.['images']);

    const rawImages =
      companyProfile?.['about_images'] ??
      companyProfile?.['aboutImages'] ??
      imageCollection?.['about'] ??
      null;

    const candidates = Array.isArray(rawImages) ? rawImages : [rawImages];
    const resolvedImage = candidates.map((candidate) => resolveImageSource(candidate)).find(Boolean) ?? null;

    const normalizedCopy = aboutCopy?.replace(/\r\n/g, '\n').trim() ?? '';
    const splitCopy = normalizedCopy.includes('\n\n')
      ? normalizedCopy.split(/\n\s*\n/)
      : normalizedCopy.split('\n');

    return {
      paragraphs: splitCopy.map((paragraph) => paragraph.trim()).filter(Boolean),
      imageSrc: resolvedImage,
    };
  }, [config]);

  if (!paragraphs.length || !imageSrc) return null;

  const brandName = branding.name.trim() || 'Westmount Craftsmen';

  return (
    <section
      id="our-story"
      ref={sectionRef}
      className={`bg-[oklch(var(--background,1_0_0))] py-20 ${className ?? ''}`}
    >
      <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
        <article
          className={`grid items-start gap-10 transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 lg:grid-cols-[55fr_45fr] lg:gap-16 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          <div className="order-2 lg:order-1">
            <h2 className="[font-family:Raleway,sans-serif] text-[24px] font-bold leading-[1.2] text-[oklch(var(--contrast-2,0.24_0_0))]">
              Our Story
            </h2>

            <div className="mt-6 space-y-4">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={`${paragraph.slice(0, 32)}-${index}`}
                  className="[font-family:Mulish,sans-serif] text-[18px] font-normal leading-[28.8px] text-[oklch(var(--contrast-3,0.38_0_0))]"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <footer className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Thoughtful renovation planning, clear communication, lasting craftsmanship.</p>

              <nav aria-label="About story actions">
                <Link
                  href="/visualizer"
                  className="inline-flex min-h-11 items-center justify-center rounded-[6px] bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Get Your Free Design Estimate
                </Link>
              </nav>
            </footer>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] border-l-4 border-l-[#0e79eb] bg-[oklch(var(--surface-1,0.98_0_0))] shadow-[0_18px_40px_rgba(22,22,22,0.08)]">
              <Image
                src={imageSrc}
                alt={`${brandName} renovation project detail`}
                fill
                sizes="(min-width: 1280px) 42vw, (min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
