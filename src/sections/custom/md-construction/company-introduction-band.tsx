'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { SectionBaseProps } from '@/lib/section-types';

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as LooseRecord)
    : null;
}

function getText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (Array.isArray(value)) {
    const joined = value
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .join('\n\n')
      .trim();

    return joined || null;
  }

  return null;
}

function getImageSource(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();

  const record = asRecord(value);
  if (!record) return null;

  const directKeys = ['publicUrl', 'url', 'src', 'signedUrl', 'image', 'file', 'path'] as const;
  for (const key of directKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim();
  }

  for (const nestedValue of Object.values(record)) {
    const nestedSource = getImageSource(nestedValue);
    if (nestedSource) return nestedSource;
  }

  return null;
}

export function CompanyIntroductionBand({ branding, config, tokens, className }: SectionBaseProps) {
  const brandingData = asRecord(branding) ?? {};
  const configData = asRecord(config) ?? {};
  const companyProfile = asRecord(configData['company_profile']) ?? undefined;
  const tokenData = asRecord(tokens) ?? {};

  const aboutCopy =
    getText(
      companyProfile?.['about_copy'] ??
        companyProfile?.['aboutCopy'] ??
        configData['about_copy'] ??
        configData['aboutCopy'] ??
        brandingData['about_copy'] ??
        brandingData['aboutCopy'],
    ) ?? '';

  const aboutImageUrl =
    getImageSource(
      companyProfile?.['about_image_url'] ??
        companyProfile?.['aboutImageUrl'] ??
        configData['about_image_url'] ??
        configData['aboutImageUrl'] ??
        brandingData['about_image_url'] ??
        brandingData['aboutImageUrl'],
    ) ?? '';

  if (!aboutCopy || !aboutImageUrl) return null;

  const label =
    typeof configData['tagline'] === 'string' && configData['tagline'].trim().length > 0
      ? configData['tagline']
      : 'Since 1987';

  const brandName = branding.name.trim() || 'the region';
  const heading =
    getText(
      companyProfile?.['about_heading'] ??
        companyProfile?.['aboutHeading'] ??
        configData['about_heading'] ??
        configData['aboutHeading'],
    ) ?? `Built on craft. Trusted by homeowners across ${brandName}.`;

  const sectionId =
    typeof tokenData['sectionId'] === 'string' && tokenData['sectionId'].trim().length > 0
      ? tokenData['sectionId']
      : 'company-introduction-band';

  const paragraphs = aboutCopy
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section
      id={sectionId}
      className={[
        'company-introduction-band bg-[oklch(0.973_0.01_85)] py-[100px] opacity-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-[90px]">
        <div className="grid items-center gap-10 md:grid-cols-1 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:gap-14">
          <article className="order-2 lg:order-1">
            <div className="mb-6 h-[3px] w-[60px] rounded-full bg-[oklch(0.86_0.18_93)]" />
            <p className="font-[Poppins] text-sm font-semibold uppercase tracking-[0.18em] text-[oklch(0.44_0.02_20)]">
              {label}
            </p>

            <h2 className="mt-5 max-w-[14ch] font-[Poppins] text-[2rem] font-semibold leading-[1.1] text-[oklch(0.24_0.02_20)] sm:text-[2.5rem] md:text-[3rem]">
              {heading}
            </h2>

            <div className="mt-6 space-y-4 text-[15px] leading-[25px] text-muted-foreground [color:oklch(0.36_0.01_30)]">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <nav className="mt-8" aria-label="Company introduction actions">
              <Link
                href="/visualizer"
                className="inline-flex items-center rounded-[4px] bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[oklch(0.973_0.01_85)]"
              >
                Get Your Free Design Estimate
              </Link>
            </nav>
          </article>

          <article className="order-1 lg:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] shadow-[6px_6px_9px_rgba(0,0,0,0.2)]">
              <Image
                src={aboutImageUrl}
                alt={
                  typeof brandingData['name'] === 'string' && brandingData['name'].trim().length > 0
                    ? `${brandingData['name']} renovation project`
                    : 'Renovation contractor project showcase'
                }
                fill
                className="object-cover"
                sizes="(max-width: 1023px) 100vw, 45vw"
              />
            </div>
          </article>
        </div>
      </div>

      <footer className="sr-only">
        <p>
          {typeof brandingData['name'] === 'string' ? brandingData['name'] : 'Company'} introduction section
          with company background and featured project image.
        </p>
      </footer>

      <style jsx global>{`
        @keyframes company-introduction-band-fade-in-up {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .company-introduction-band {
          animation: company-introduction-band-fade-in-up 0.8s ease-out 0.12s forwards;
          animation-timeline: view();
          animation-range: entry 15% cover 30%;
        }

        @media (prefers-reduced-motion: reduce) {
          .company-introduction-band {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}
