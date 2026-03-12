// @ts-nocheck
'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { SectionBaseProps } from '@/lib/section-types';

type PortfolioItem = {
  id: string;
  title: string;
  image: string;
  alt: string;
  span?: 'tall';
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

export function PortfolioGalleryMosaic({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void branding;
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  const configRecord = asRecord(config);
  const portfolioSource =
    configRecord?.['portfolio'] ?? configRecord?.['projects'] ?? configRecord?.['gallery'];

  const items: PortfolioItem[] = Array.isArray(portfolioSource)
    ? portfolioSource
        .flatMap((item, index) => {
          const entry = asRecord(item);
          if (!entry) return [];

          const image = pickString(
            entry['image'],
            entry['imageUrl'],
            entry['src'],
            entry['url'],
            entry['storageUrl'],
          );

          if (!image) return [];

          const title = pickString(entry['title'], entry['name'], entry['projectTitle']) ?? `Project ${index + 1}`;

          return [{
            id: String(entry['id'] ?? entry['slug'] ?? index),
            title,
            image,
            alt: pickString(entry['alt']) ?? title,
            ...(index === 1 || index === 4 ? { span: 'tall' as const } : {}),
          } satisfies PortfolioItem];
        })
        .slice(0, 6)
    : [];

  if (!items.length) return null;

  return (
    <section
      className={`bg-[oklch(var(--base))] py-20 ${className ?? ''}`}
      aria-labelledby="portfolio-gallery-mosaic-heading"
    >
      <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
        <header>
          <h2
            id="portfolio-gallery-mosaic-heading"
            className="mb-12 text-center font-[Raleway,sans-serif] text-2xl font-bold text-[oklch(var(--contrast-2))]"
          >
            Our Work
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:auto-rows-[220px] lg:grid-cols-3">
          {items.map((item, index) => (
            <article
              key={item.id}
              className={[
                'group relative overflow-hidden rounded-[6px] bg-primary/5 opacity-0 shadow-sm',
                'translate-y-6 animate-[fade-in-up_0.7s_ease-out_forwards]',
                item.span === 'tall' ? 'lg:row-span-2' : 'lg:row-span-1',
                index % 3 === 0 ? 'lg:min-h-[300px]' : 'lg:min-h-[220px]',
              ].join(' ')}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="relative h-[260px] w-full md:h-[320px] lg:h-full">
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/50" />
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="font-[Mulish,sans-serif] text-base font-semibold text-white">
                    {item.title}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <nav aria-label="Portfolio actions" className="mt-10 flex justify-center">
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-[6px] border-2 border-[#0e79eb] px-7 py-3 font-[Mulish,sans-serif] text-[15px] font-medium text-[#0e79eb] transition-colors duration-200 hover:bg-[#0e79eb] hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            View All Projects
          </Link>
        </nav>

        <footer className="sr-only">
          <Link href="/visualizer">Get Your Free Design Estimate</Link>
        </footer>
      </div>
    </section>
  );
}
