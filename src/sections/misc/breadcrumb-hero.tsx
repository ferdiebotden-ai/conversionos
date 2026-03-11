'use client';

import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';

export function MiscBreadcrumbHero({ branding, config, className }: SectionBaseProps) {
  return (
    <>
      <nav className={`container mx-auto px-4 py-4 ${className ?? ''}`}>
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground">Home</Link>
          </li>
        </ol>
      </nav>
      <section className="border-b border-border bg-muted/30 px-4 py-12 md:py-16">
        <div className="container mx-auto">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {config.heroHeadline || branding.name}
            </h1>
            {(config.heroSubheadline || branding.tagline) && (
              <p className="mt-4 text-lg text-muted-foreground">
                {config.heroSubheadline || branding.tagline}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
