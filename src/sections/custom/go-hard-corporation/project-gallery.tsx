'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { FadeIn, FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion';
import { GalleryLightbox } from '@/components/gallery-lightbox';
import type { Project } from '@/components/project-card';
import type { SectionBaseProps } from '@/lib/section-types';
import { asRecord, normalizePortfolio } from '@/sections/custom/_shared/content';

const CARD_SPANS = [
  'md:col-span-2 md:row-span-2',
  '',
  'lg:row-span-2',
  '',
  'md:col-span-2',
  '',
  '',
  'lg:col-span-2',
];

export function ProjectGallery({ branding, config, className }: SectionBaseProps) {
  const pathname = usePathname();
  const company = asRecord(config);
  const items = normalizePortfolio(company['portfolio']);
  const allCategories = ['All', ...new Set(items.map((item) => item.category))];
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const filteredItems = useMemo(
    () => (activeCategory === 'All' ? items : items.filter((item) => item.category === activeCategory)),
    [activeCategory, items]
  );
  const displayItems = pathname.startsWith('/projects') ? filteredItems : filteredItems.slice(0, 8);

  const lightboxProjects: Project[] = displayItems.map((item, index) => ({
    id: `${item.title}-${index}`,
    title: item.title,
    type: item.category,
    description: item.description,
    location: item.location || 'Cambridge, ON',
    image: item.imageUrl,
  }));

  return (
    <section className={['bg-[#f6f1e8] py-16 text-[#23231f] md:py-24', className ?? ''].join(' ')}>
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
        <FadeIn>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Portfolio</p>
              <h2
                className="mt-5 text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-[0.94] text-[#23231f]"
                style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
              >
                Our Project Portfolio
              </h2>
            </div>

            <div className="space-y-4">
              <p className="max-w-2xl text-[15px] leading-8 text-[#615d52] md:text-base">
                At Go Hard Corporation, we provide expert renovation services as a full-service general contractor. Our team transforms kitchens, bathrooms, home additions, and outdoor spaces with quality materials and skilled workmanship.
              </p>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={[
                      'rounded-full border px-4 py-2 text-sm font-medium transition',
                      activeCategory === category
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-[#d8cfbf] bg-white text-[#575348] hover:border-primary hover:text-primary',
                    ].join(' ')}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[220px]">
          {displayItems.map((item, index) => (
            <StaggerItem key={`${item.title}-${index}`} className={CARD_SPANS[index % CARD_SPANS.length] ?? ''}>
              <article
                role="button"
                tabIndex={0}
                onClick={() => {
                  setLightboxIndex(index);
                  setIsLightboxOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setLightboxIndex(index);
                    setIsLightboxOpen(true);
                  }
                }}
                className="group relative h-full min-h-[280px] cursor-pointer overflow-hidden rounded-[1.75rem] border border-[#ddd5c8] bg-white shadow-[0_24px_60px_rgba(41,35,28,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_34px_80px_rgba(41,35,28,0.14)]"
              >
                <Image
                  src={item.imageUrl}
                  alt={`${item.title} by ${branding.name || 'Go Hard Corporation'}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover object-center transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.78))]" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white md:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/72">{item.category}</p>
                  <h3
                    className="mt-2 text-[1.65rem] leading-tight md:text-[1.9rem]"
                    style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm uppercase tracking-[0.18em] text-white/64">{item.location || 'Cambridge, ON'}</p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {!pathname.startsWith('/projects') && items.length > displayItems.length ? (
          <FadeInUp>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#666257]">View the full portfolio for more kitchens, bathrooms, additions, and detail work.</p>
              <Link
                href="/projects"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d2c9b8] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#3f3d34] transition duration-300 hover:border-primary hover:text-primary"
              >
                View Full Portfolio
              </Link>
            </div>
          </FadeInUp>
        ) : null}
      </div>

      <GalleryLightbox
        projects={lightboxProjects}
        initialIndex={lightboxIndex}
        open={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </section>
  );
}
