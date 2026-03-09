'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function GalleryMasonryGrid({ branding, config, className }: Props) {
  const portfolio = config.portfolio ?? [];
  if (portfolio.length === 0) return null;

  return (
    <section className={`py-16 sm:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Our Work
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Featured projects by {branding.name}
            </p>
          </div>
          <Link
            href="/projects"
            className="group hidden items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4 sm:flex"
          >
            View All Projects
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <FadeInUp>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {portfolio.map((item, i) => (
              <div
                key={i}
                className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl bg-muted"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    width={600}
                    height={400}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex aspect-[3/2] items-center justify-center text-sm text-muted-foreground">
                    {item.title}
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  {item.description && (
                    <p className="mt-1 text-xs text-white/80 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </FadeInUp>

        {/* Mobile link */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4"
          >
            View All Projects
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
