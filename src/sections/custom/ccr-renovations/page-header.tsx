'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SectionBaseProps } from '@/lib/section-types';

/**
 * Compact inner-page header for CCR Renovations.
 *
 * Auto-detects the current page from the URL pathname and renders a
 * page-specific title + breadcrumb. Replaces `misc:breadcrumb-hero` which
 * displayed the full homepage hero headline on every inner page.
 */

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/about': {
    title: 'About Us',
    subtitle: 'Over 30 years of quality renovation craftsmanship in Durham Region.',
  },
  '/services': {
    title: 'Our Services',
    subtitle: 'Basements, kitchens, bathrooms, decks, and home additions.',
  },
  '/projects': {
    title: 'Our Projects',
    subtitle: 'Browse our portfolio of completed renovations across Durham Region.',
  },
  '/contact': {
    title: 'Contact Us',
    subtitle: 'Ready to start your renovation? Get in touch for a free consultation.',
  },
};

export function PageHeader({ branding, className }: SectionBaseProps) {
  const pathname = usePathname();

  // Match the first path segment (e.g. /about, /services, /projects, /contact)
  const slug = '/' + (pathname?.split('/')[1] ?? '');
  const page = PAGE_TITLES[slug];

  const title = page?.title ?? branding.name;
  const subtitle = page?.subtitle;
  const breadcrumbLabel = page?.title ?? slug.replace('/', '').replace(/-/g, ' ');

  return (
    <div className={className ?? ''}>
      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 py-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 font-[Open_Sans,sans-serif] text-sm text-[oklch(0.55_0.02_85)]">
          <li>
            <Link
              href="/"
              className="transition-colours duration-150 hover:text-[oklch(0.42_0.10_160)]"
            >
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-[oklch(0.7_0.01_85)]">
            /
          </li>
          <li className="font-medium capitalize text-[oklch(0.35_0.06_160)]">
            {breadcrumbLabel}
          </li>
        </ol>
      </nav>

      {/* Compact title banner */}
      <section
        className="border-b border-[oklch(0.90_0.005_85)] py-10 md:py-14"
        style={{ backgroundColor: 'oklch(0.97 0.005 85)' }}
        aria-labelledby="ccr-page-heading"
      >
        <div className="container mx-auto px-4 text-center">
          <h1
            id="ccr-page-heading"
            className="font-[Anton,sans-serif] text-3xl uppercase leading-tight tracking-wide text-[oklch(0.35_0.06_160)] sm:text-4xl"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-3 max-w-xl font-[Open_Sans,sans-serif] text-base leading-relaxed text-[oklch(0.55_0.02_85)]">
              {subtitle}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
