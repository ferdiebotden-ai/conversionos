// @ts-nocheck
/**
 * Custom Section Template — Reference for Codex-generated sections.
 *
 * Every custom section MUST follow this pattern:
 * - 'use client' directive
 * - Import SectionBaseProps from @/lib/section-types
 * - Export a named function component
 * - Accept { branding, config, tokens, className } props
 * - Use Tailwind CSS for styling
 * - Use oklch() for colours (reference CSS custom properties)
 * - Return null if required data is missing
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';

type ValueItem = {
  title: string;
  description: string;
  icon: 'shield' | 'users' | 'badge';
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function iconForText(text: string): ValueItem['icon'] {
  if (/customer|client|family|service|care|relationship/i.test(text)) return 'users';
  if (/price|budget|estimate|quote|transparent|honest/i.test(text)) return 'badge';
  return 'shield';
}

function ValueIcon({ icon }: { icon: ValueItem['icon'] }) {
  const svgClassName = 'h-12 w-12 text-[oklch(var(--accent,0.58_0.16_250))]';

  if (icon === 'users') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={svgClassName} aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 4.13a3 3 0 0 1 0 5.74" />
      </svg>
    );
  }

  if (icon === 'badge') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={svgClassName} aria-hidden="true">
        <path d="M12 3l2.3 4.66L19.5 8l-3.75 3.66.88 5.17L12 14.4l-4.63 2.43.88-5.17L4.5 8l5.2-.34L12 3Z" />
        <path d="M9 19.5h6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={svgClassName} aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-2.9 8.6-7 10-4.1-1.4-7-5.5-7-10V6l7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-4" />
    </svg>
  );
}

function deriveValues(config: SectionBaseProps['config']): ValueItem[] {
  const configRecord = asRecord(config);
  const profile = asRecord(configRecord?.['company_profile']) ?? undefined;
  const aboutCopy = typeof configRecord?.['about_copy'] === 'string' ? configRecord['about_copy'] : undefined;

  const rawValues = profile && typeof profile === 'object'
    ? ('values' in profile
        ? profile['values']
        : 'core_values' in profile
          ? profile['core_values']
          : 'company_values' in profile
            ? profile['company_values']
            : undefined)
    : undefined;
  const customEntries = Array.isArray(rawValues)
    ? rawValues
    : rawValues && typeof rawValues === 'object'
      ? Object.values(rawValues)
      : [];

  const customValues = customEntries
    .map((entry) => {
      if (typeof entry === 'string' && entry.trim()) {
        return {
          title: entry.trim(),
          description: 'A principle that guides how every project is planned, priced, and delivered.',
          icon: iconForText(entry),
        } satisfies ValueItem;
      }
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const title = [record['title'], record['name'], record['heading'], record['label']].find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );
      const description = [record['description'], record['body'], record['copy'], record['text']].find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );
      if (!title || !description) return null;
      return { title, description, icon: iconForText(`${title} ${description}`) } satisfies ValueItem;
    })
    .filter((value): value is ValueItem => Boolean(value))
    .slice(0, 3);

  if (customValues.length === 3) return customValues;

  const profileText = Object.values(profile ?? {})
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');
  const sourceText = `${aboutCopy ?? ''} ${profileText}`.trim();

  return [
    {
      title: 'Quality Craftsmanship',
      description: /craft|detail|finish|quality|precision|build/i.test(sourceText)
        ? 'Detail-driven renovations delivered with durable materials, disciplined workmanship, and a finish built to last.'
        : 'Thoughtful renovation work backed by dependable materials, careful execution, and pride in every final detail.',
      icon: 'shield',
    },
    {
      title: 'Customer First',
      description: /family|homeowner|client|service|care|relationship/i.test(sourceText)
        ? 'Every project is shaped around homeowner goals, clear communication, and a steady experience from planning to walkthrough.'
        : 'We keep homeowners at the center of the process with responsive communication, practical guidance, and reliable follow-through.',
      icon: 'users',
    },
    {
      title: 'Transparent Pricing',
      description: /budget|quote|estimate|transparent|honest|pricing/i.test(sourceText)
        ? 'Clear scopes, realistic estimates, and open budget conversations help you move ahead with confidence.'
        : 'Straightforward proposals and honest expectations make scope, timing, and investment easier to understand from the start.',
      icon: 'badge',
    },
  ];
}

export function CompanyValuesSection({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  const config = rawConfig as unknown as Record<string, unknown>;
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  const configRecord = asRecord(config);
  const hasProfile = Boolean(configRecord?.['company_profile']);
  const hasAboutCopy = Boolean(configRecord?.['about_copy']);
  if (!hasProfile && !hasAboutCopy) return null;

  const values = useMemo(() => deriveValues(rawConfig), [rawConfig]);
  const companyName = branding?.name ?? 'Westmount Craftsmen';
  const sectionClassName = ['py-20', tokens ? '' : '', className ?? ''].filter(Boolean).join(' ');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') {
      setVisibleCards(values.map((_, index) => index));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset['index']);
          setVisibleCards((current) => (current.includes(index) ? current : [...current, index]));
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );

    cardRefs.current.forEach((card) => card && observer.observe(card));
    return () => observer.disconnect();
  }, [values]);

  return (
    <section
      className={sectionClassName}
      style={{ backgroundColor: 'oklch(var(--base,0.97_0_0))' }}
      aria-labelledby="company-values-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Why homeowners choose {companyName}</p>
          <h2 id="company-values-heading" className="mt-4 font-[Raleway,sans-serif] text-3xl font-bold tracking-tight text-[oklch(var(--contrast-2,0.21_0_0))] md:text-4xl">
            Built on values that make every renovation feel straightforward.
          </h2>
          <p className="mt-4 font-[Mulish,sans-serif] text-base leading-7 text-muted-foreground md:text-lg">
            These principles shape how we communicate, estimate, and deliver polished spaces that feel right for everyday living.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {values.map((value, index) => {
            const isVisible = visibleCards.includes(index);
            return (
              <article
                key={value.title}
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
                data-index={index}
                className={`rounded-[6px] bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-700 ease-out will-change-transform ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 140}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center">
                  <ValueIcon icon={value.icon} />
                </div>
                <h3 className="mt-6 font-[Raleway,sans-serif] text-[18px] font-bold leading-7 text-[oklch(var(--contrast-2,0.21_0_0))]">
                  {value.title}
                </h3>
                <p className="mt-4 font-[Mulish,sans-serif] text-[16px] font-normal leading-7 text-[oklch(var(--contrast-3,0.4_0_0))]">
                  {value.description}
                </p>
              </article>
            );
          })}
        </div>

        <nav className="mt-10 flex justify-center" aria-label="Company values call to action">
          <Link
            href="/visualizer"
            className="inline-flex items-center justify-center rounded-[6px] bg-primary px-6 py-3 font-[Mulish,sans-serif] text-[15px] font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Get Your Free Design Estimate
          </Link>
        </nav>
      </div>
    </section>
  );
}
