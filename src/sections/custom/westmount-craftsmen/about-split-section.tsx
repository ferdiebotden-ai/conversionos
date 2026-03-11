'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type LooseRecord = Record<string, unknown>;

function asLooseRecord(value: unknown): LooseRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as LooseRecord)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function AboutSplitSection({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void branding;
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;

    if (!node || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [isVisible]);

  const configRecord = asLooseRecord(config) ?? {};
  const companyProfile = asLooseRecord(configRecord['company_profile']) ?? {};

  const aboutCopy = getString(companyProfile['about_copy']) ?? getString(configRecord['about_copy']) ?? getString(configRecord['aboutCopy']);
  const aboutImageUrl =
    getString(companyProfile['about_image_url']) ??
    getString(configRecord['about_image_url']) ??
    getString(configRecord['aboutImageUrl']) ??
    getString(configRecord['image']);
  const heading = getString(configRecord['heading']) ?? 'Craftsmanship Built Around Your Home';

  if (!aboutCopy || !aboutImageUrl) return null;

  const paragraphs = aboutCopy
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section ref={sectionRef} className={`bg-white py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
          <article
            className={[
              'relative order-1 transition-all duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none',
              isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0',
            ].join(' ')}
          >
            <div className="relative aspect-[5/4] overflow-hidden rounded-[6px] shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
              <Image
                src={aboutImageUrl}
                alt="Westmount Craftsmen renovation project"
                fill
                sizes="(max-width: 767px) 100vw, 50vw"
                className="object-cover"
                priority={false}
              />
            </div>
          </article>

          <article
            className={[
              'order-2 transition-all duration-700 ease-out motion-reduce:transform-none motion-reduce:transition-none',
              isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0',
            ].join(' ')}
          >
            <p
              className="mb-3 font-[Mulish,sans-serif] text-[14px] font-semibold uppercase tracking-[2px]"
              style={{ color: 'oklch(var(--accent, 0.58 0.16 252))' }}
            >
              About Us
            </p>

            <h2
              className="mb-4 font-[Raleway,sans-serif] text-[24px] font-bold leading-tight"
              style={{ color: 'oklch(var(--contrast-2, 0.22 0 0))' }}
            >
              {heading}
            </h2>

            <div className="space-y-5">
              {paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="font-[Mulish,sans-serif] text-[18px] font-normal leading-[28.8px]"
                  style={{ color: 'oklch(var(--contrast-3, 0.38 0 0))' }}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <nav className="mt-8">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 font-[Mulish,sans-serif] text-[15px] font-medium text-primary transition-colors hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                style={{ color: 'oklch(var(--accent, 0.58 0.16 252))' }}
              >
                <span>Learn More</span>
                <span aria-hidden="true">→</span>
              </Link>
            </nav>
          </article>
        </div>
      </div>
    </section>
  );
}
