'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as LooseRecord)
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

function resolveString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
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

function getFirstSentence(text: string) {
  const match = text.trim().match(/[^.!?]+[.!?]/);
  return (match?.[0] ?? text).trim().replace(/^['"“”]+|['"“”]+$/g, '');
}

export function AboutPageCompanyStory({ branding, config, tokens, className }: SectionBaseProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const configRecord = asRecord(config) ?? {};
  const companyProfile = asRecord(configRecord['company_profile']) ?? undefined;
  const tokenData = asRecord(tokens);

  const companyName = branding.name.trim() || 'MD Construction';
  const aboutCopy =
    resolveText(
      companyProfile?.['about_copy'] ??
        companyProfile?.['aboutCopy'] ??
        configRecord['about_copy'] ??
        configRecord['aboutCopy'],
    ) ?? '';
  const aboutImageUrl =
    resolveImageSource(
      companyProfile?.['about_image_url'] ??
        companyProfile?.['aboutImageUrl'] ??
        configRecord['about_image_url'] ??
        configRecord['aboutImageUrl'] ??
        configRecord['aboutImage'],
    ) ?? '';
  const establishedYear =
    resolveString(
      companyProfile?.['established_year'] ??
        companyProfile?.['establishedYear'] ??
        configRecord['established_year'] ??
        configRecord['establishedYear'] ??
        configRecord['founded'],
    ) ?? '1987';
  const city =
    resolveText(companyProfile?.['city'] ?? configRecord['city'] ?? branding.city) ?? 'Port Stanley';
  const displayCity = city.includes(',') ? city : `${city}, ON`;
  const sectionId =
    typeof tokenData?.['sectionId'] === 'string' && tokenData['sectionId'].trim().length > 0
      ? tokenData['sectionId'].trim()
      : 'about-company-story';

  if (!aboutCopy.trim() || !aboutImageUrl.trim()) return null;

  const paragraphs = aboutCopy
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const bodyParagraphs = paragraphs.length > 0 ? paragraphs : [aboutCopy.trim()];
  const pullQuote = getFirstSentence(bodyParagraphs[0] ?? aboutCopy.trim());

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

  return (
    <section
      id={sectionId}
      ref={sectionRef}
      className={[
        'bg-[oklch(1_0_0)] py-[100px] transition-all duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        className ?? '',
      ].join(' ')}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-[90px]">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-16">
          <div className="relative min-h-[320px] overflow-hidden rounded-[4px] shadow-[6px_6px_9px_rgba(0,0,0,0.2)] md:min-h-[420px] lg:min-h-[560px]">
            <Image
              src={aboutImageUrl}
              alt={`${companyName} team or featured renovation project`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <article className="flex flex-col justify-center">
            <div className="mb-6 h-[3px] w-16 bg-[oklch(from_var(--accentDark)_l_c_h)]" aria-hidden="true" />

            <h2 className="font-[Poppins] text-[38px] font-semibold leading-[1.05] text-[oklch(from_var(--dark)_l_c_h)] md:text-[48px]">
              The Story Behind {companyName}
            </h2>

            <div className="mt-6 space-y-5 font-[Inter] text-[15px] leading-[25px] text-muted-foreground">
              {bodyParagraphs.map((paragraph, index) => (
                <p key={`${sectionId}-paragraph-${index}`}>{paragraph}</p>
              ))}
            </div>

            <blockquote className="mt-8 border-l-2 border-[oklch(from_var(--accentDark)_l_c_h)] pl-5 font-[Playfair_Display] text-[24px] italic leading-[1.5] text-[oklch(from_var(--dark)_l_c_h)]">
              “{pullQuote}”
            </blockquote>

            <nav className="mt-8" aria-label="Company story call to action">
              <Link
                href="/visualizer"
                className="inline-flex items-center rounded-[4px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[oklch(1_0_0)]"
              >
                Get Your Free Design Estimate
              </Link>
            </nav>

            <footer className="mt-8 flex flex-wrap gap-4">
              <div className="inline-flex min-w-[170px] flex-col rounded-[4px] border border-black/5 border-l-[3px] border-l-[oklch(from_var(--nectar-accent-color)_l_c_h)] bg-[oklch(1_0_0)] px-4 py-3 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Established
                </span>
                <span className="mt-1 font-[Poppins] text-base font-semibold text-[oklch(from_var(--dark)_l_c_h)]">
                  Since {establishedYear}
                </span>
              </div>

              <div className="inline-flex min-w-[170px] flex-col rounded-[4px] border border-black/5 border-l-[3px] border-l-[oklch(from_var(--nectar-accent-color)_l_c_h)] bg-[oklch(1_0_0)] px-4 py-3 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Home Base
                </span>
                <span className="mt-1 font-[Poppins] text-base font-semibold text-[oklch(from_var(--dark)_l_c_h)]">
                  {displayCity}
                </span>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}
