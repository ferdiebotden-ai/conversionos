'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

type _PortfolioItem = {
  id: string;
  title: string;
  location?: string;
  image: string;
  slug?: string;
};

export function FeaturedProjects({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  // Read portfolio from config — support both camelCase and snake_case keys
  const source = config as {
    portfolio?: unknown[] | { items?: unknown[] };
    portfolioItems?: unknown[];
    portfolio_items?: unknown[];
    featured_projects?: unknown[];
    featuredProjects?: unknown[];
    gallery?: unknown[];
  };

  const rawItems =
    (Array.isArray(source.portfolio) ? source.portfolio : source.portfolio?.items) ??
    source.portfolioItems ??
    source.portfolio_items ??
    source.featured_projects ??
    source.featuredProjects ??
    source.gallery ??
    [];

  const items = useMemo(() => {
    return (rawItems as unknown[])
      .flatMap((value: unknown, index: number) => {
        const item = value as {
          id?: string | number;
          title?: string;
          name?: string;
          project_name?: string;
          location?: string;
          city?: string;
          image?: string;
          imageUrl?: string;
          image_url?: string;
          src?: string;
          url?: string;
          slug?: string;
        };
        const image = item.image ?? item.imageUrl ?? item.image_url ?? item.src ?? item.url;
        if (!image) return [];
        return [
          {
            id: String(item.id ?? image ?? index),
            title: item.title ?? item.name ?? item.project_name ?? `${branding?.name ?? 'CCR'} Project ${index + 1}`,
            location: item.location ?? item.city,
            image,
            slug: item.slug,
          },
        ];
      })
      .slice(0, 6);
  }, [branding?.name, rawItems]);

  const sectionRef = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(0);

  // IntersectionObserver — stagger reveal
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        items.forEach((_, index) => {
          setTimeout(() => setRevealed((prev) => Math.max(prev, index + 1)), index * 120);
        });

        observer.disconnect();
      },
      { threshold: 0.15 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="ccr-featured-projects-heading"
      className={[
        'bg-[oklch(0.97_0.005_90)] py-20 md:py-28',
        className ?? '',
      ].join(' ')}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mx-auto mb-14 max-w-3xl text-center">
          <h2
            id="ccr-featured-projects-heading"
            className="font-[Anton,sans-serif] text-4xl uppercase leading-tight tracking-wide text-foreground md:text-5xl"
          >
            Our Featured Projects
          </h2>
          <p className="mt-4 font-['Open_Sans',sans-serif] text-lg leading-relaxed text-muted-foreground">
            Browse our latest featured projects
          </p>
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[oklch(0_0_0_/_0)] p-6 text-center transition-colors duration-400 group-hover:bg-[oklch(0_0_0_/_0.55)]">
                      <h3 className="font-[Anton,sans-serif] text-xl uppercase tracking-wide text-white opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100 translate-y-3">
                        {item.title}
                      </h3>

                      {item.location ? (
                        <p className="mt-1 font-['Open_Sans',sans-serif] text-sm text-[oklch(1_0_0_/_0.8)] opacity-0 transition-all duration-400 delay-75 group-hover:translate-y-0 group-hover:opacity-100 translate-y-3">
                          {item.location}
                        </p>
                      ) : null}

                      <span className="mt-4 inline-block rounded-full border border-white/60 px-5 py-1.5 font-['Open_Sans',sans-serif] text-sm font-medium text-white opacity-0 transition-all duration-400 delay-150 group-hover:translate-y-0 group-hover:opacity-100 translate-y-3">
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
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3.5 font-[Anton,sans-serif] text-base uppercase tracking-wider text-primary-foreground transition-opacity duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            View All Projects
          </Link>
        </footer>
      </div>
    </section>
  );
}
