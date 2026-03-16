'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type RawPortfolioItem = {
  id?: string | number;
  title?: string;
  name?: string;
  project_name?: string;
  description?: string;
  summary?: string;
  location?: string;
  city?: string;
  image?: string;
  image_url?: string;
  imageUrl?: string;
  src?: string;
  url?: string;
  slug?: string;
};

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  image: string;
  slug?: string | undefined;
};

function parsePortfolio(c: Record<string, unknown>, companyName: string): PortfolioItem[] {
  const rawSource = c['portfolio'] ?? c['projects'] ?? c['gallery'] ?? c['featured_projects'];

  const rawItems: unknown[] = Array.isArray(rawSource)
    ? rawSource
    : typeof rawSource === 'object' && rawSource !== null && 'items' in (rawSource as Record<string, unknown>)
      ? ((rawSource as Record<string, unknown>)['items'] as unknown[]) ?? []
      : [];

  return rawItems
    .flatMap((entry, index) => {
      const item = entry as RawPortfolioItem;
      const image = item.image ?? item.image_url ?? item.imageUrl ?? item.src ?? item.url;
      if (typeof image !== 'string' || !image.trim()) return [];

      return [
        {
          id: String(item.id ?? image ?? index),
          title: item.title ?? item.name ?? item.project_name ?? `${companyName} Project ${index + 1}`,
          description: item.description ?? item.summary ?? '',
          location: item.location ?? item.city ?? '',
          image: image.trim(),
          slug: item.slug,
        },
      ];
    })
    .slice(0, 6);
}

export function WarmLeadPortfolio({ branding, config, className }: SectionBaseProps) {
  const c = (config ?? {}) as Record<string, unknown>;
  const companyName = branding?.name?.trim() || 'Our';
  const items = parsePortfolio(c, companyName);

  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        items.forEach((_, index) => {
          setTimeout(
            () => requestAnimationFrame(() => setRevealed((prev) => Math.max(prev, index + 1))),
            index * 120,
          );
        });

        observer.disconnect();
      },
      { threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={['bg-[rgb(248,247,245)] py-20 md:py-28', className].filter(Boolean).join(' ')}
      aria-labelledby="wl-portfolio-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Our Work
          </p>
          <h2
            id="wl-portfolio-heading"
            className="font-heading text-4xl uppercase leading-tight tracking-wide text-foreground md:text-5xl"
          >
            Featured Projects
          </h2>
        </header>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const href = item.slug ? `/projects/${item.slug}` : '/projects';

            return (
              <article
                key={item.id}
                className={[
                  'group overflow-hidden rounded-lg transition-all duration-600 ease-out',
                  index < revealed
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-8 opacity-0',
                ].join(' ')}
              >
                <Link
                  href={href}
                  className="relative block overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label={`View project: ${item.title}`}
                >
                  <div className="relative aspect-[3/2] w-full overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 p-6 text-center transition-colors duration-400 group-hover:bg-black/55">
                      <h3 className="translate-y-3 font-heading text-xl uppercase tracking-wide text-white opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                        {item.title}
                      </h3>

                      {item.location && (
                        <p className="mt-1 translate-y-3 font-body text-sm text-white/80 opacity-0 transition-all duration-400 delay-75 group-hover:translate-y-0 group-hover:opacity-100">
                          {item.location}
                        </p>
                      )}

                      <span className="mt-4 inline-block translate-y-3 rounded-full border border-white/60 px-5 py-1.5 font-body text-sm font-medium text-white opacity-0 transition-all duration-400 delay-150 group-hover:translate-y-0 group-hover:opacity-100">
                        View Project
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>

        {/* CTA */}
        <footer className="mt-14 flex justify-center">
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3.5 font-heading text-base uppercase tracking-wider text-primary-foreground transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            View All Projects
          </Link>
        </footer>
      </div>
    </section>
  );
}
