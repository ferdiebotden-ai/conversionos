'use client';

import { useState } from 'react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import Image from 'next/image';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function GalleryEditorialFeatured({ config, className }: Props) {
  const portfolio = config.portfolio ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (portfolio.length === 0) return null;

  const featured = portfolio[selectedIndex]!;

  return (
    <section className={`py-16 sm:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Featured Projects
        </h2>

        <FadeInUp>
          {/* Large featured image */}
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
            {featured.imageUrl ? (
              <Image
                src={featured.imageUrl}
                alt={featured.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 900px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                {featured.title}
              </div>
            )}
          </div>

          {/* Title and description */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-foreground">
              {featured.title}
            </h3>
            {featured.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {featured.description}
              </p>
            )}
          </div>

          {/* Thumbnail strip */}
          {portfolio.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {portfolio.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`relative size-16 flex-shrink-0 overflow-hidden rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    i === selectedIndex
                      ? 'ring-2 ring-primary opacity-100'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`View ${item.title}`}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center bg-muted text-[10px] text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </FadeInUp>
      </div>
    </section>
  );
}
