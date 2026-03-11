'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { SectionBaseProps } from '@/lib/section-types';

const FILTERS = ['All', 'Bathroom', 'Kitchen', 'Basement', 'Home'] as const;
type Filter = (typeof FILTERS)[number];
type PortfolioItem = { id: string; title: string; category: Exclude<Filter, 'All'>; image: string };

export function PortfolioGridFull({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  const items = useMemo<PortfolioItem[]>(() => {
    const source = config as {
      portfolioItems?: unknown[];
      portfolio?: { items?: unknown[] };
      gallery?: unknown[];
    };
    const raw = source.portfolioItems ?? source.portfolio?.items ?? source.gallery ?? [];

    return raw
      .flatMap((value, index) => {
        const item = value as {
          id?: string | number;
          title?: string;
          name?: string;
          category?: string;
          type?: string;
          image?: string;
          imageUrl?: string;
          src?: string;
          url?: string;
        };
        const image = item.image ?? item.imageUrl ?? item.src ?? item.url;
        if (!image) return [];
        const rawCategory = (item.category ?? item.type ?? 'Home') as Filter;
        return [
          {
            id: String(item.id ?? image ?? index),
            title: item.title ?? item.name ?? `${branding?.name ?? 'Project'} ${index + 1}`,
            category: FILTERS.includes(rawCategory) && rawCategory !== 'All' ? rawCategory : 'Home',
            image,
          },
        ];
      })
      .slice(0, 12);
  }, [branding?.name, config]);

  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(0);

  const filteredItems = useMemo(
    () => (activeFilter === 'All' ? items : items.filter((item) => item.category === activeFilter)),
    [activeFilter, items],
  );

  useEffect(() => {
    setRevealed(0);
    const timers = filteredItems.map((_, index) => window.setTimeout(() => setRevealed(index + 1), index * 70));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [filteredItems]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null);
      if (event.key === 'ArrowRight') setActiveIndex((value) => (value === null ? 0 : (value + 1) % filteredItems.length));
      if (event.key === 'ArrowLeft') setActiveIndex((value) => (value === null ? 0 : (value - 1 + filteredItems.length) % filteredItems.length));
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, filteredItems.length]);

  if (!items.length) return null;

  const activeItem = activeIndex === null ? null : filteredItems[activeIndex];

  return (
    <section className={`py-12 ${className ?? ''}`}>
      <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
        <nav aria-label="Portfolio filters" className="flex flex-wrap items-center justify-center gap-3">
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-[6px] px-4 py-2 font-[Mulish,sans-serif] text-[14px] font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isActive ? 'bg-[oklch(var(--accent)/1)] text-white' : 'bg-[oklch(var(--base)/1)] text-[oklch(var(--contrast-3)/1)] hover:opacity-85'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </nav>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => (
            <article
              key={item.id}
              className={`group overflow-hidden rounded-[6px] bg-white transition-all duration-500 ${index < revealed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            >
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Open ${item.title}`}
                className="relative block w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0)] p-6 text-center transition-colors duration-300 group-hover:bg-[rgba(0,0,0,0.4)]">
                    <span className="font-[Raleway,sans-serif] text-xl font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      {item.title}
                    </span>
                  </div>
                </div>
              </button>
            </article>
          ))}
        </div>

        <footer className="mt-10 flex justify-center">
          <Link
            href="/visualizer"
            className="inline-flex items-center rounded-[6px] bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Get Your Free Design Estimate
          </Link>
        </footer>
      </div>

      {activeItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
          onClick={() => setActiveIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[6px] bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="relative aspect-[4/3] w-full bg-black">
              <Image src={activeItem.image} alt={activeItem.title} fill priority sizes="100vw" className="object-contain" />
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{activeItem.category}</p>
                <h3 className="font-[Raleway,sans-serif] text-xl font-semibold text-foreground">{activeItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="rounded-[6px] bg-[oklch(var(--base)/1)] px-3 py-2 text-sm font-medium text-[oklch(var(--contrast-3)/1)] transition-opacity hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
