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

const GRID_CLASSES = [
  'md:col-span-2',
  '',
  '',
  'lg:row-span-2',
  '',
  'md:col-span-2',
  '',
  '',
];

export function ProjectGallery({ branding, config, className }: SectionBaseProps) {
  const pathname = usePathname();
  const company = asRecord(config);
  const items = normalizePortfolio(company['portfolio']);
  const categories = ['All', ...new Set(items.map((item) => item.category))];
  const [activeCategory, setActiveCategory] = useState('All');
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
    location: item.location || 'Owen Sound, ON',
    image: item.imageUrl,
  }));

  return (
    <section className={['relative overflow-hidden bg-[#faf7f3] py-16 text-[#2f2f2f] md:py-24', className ?? ''].join(' ')}>
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(235,211,203,0.55),transparent_70%)]" />

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
        <FadeIn>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
            <div>
              <p className="font-[Quicksand] text-xs font-semibold uppercase tracking-[0.28em] text-[#9f7e74]">Gallery</p>
              <h2 className="mt-5 font-[Sacramento] text-[4.5rem] leading-none text-[#2f2f2f] sm:text-[5.5rem]">Our Work</h2>
              <p className="mt-5 max-w-xl font-[Poppins] text-[15px] leading-8 text-[#68635c] md:text-base">
                Real kitchen and bathroom work from BL Renovations, photographed with the same bright, clean look that carries through the finished rooms.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={[
                    'rounded-full border px-4 py-2 font-[Quicksand] text-sm font-medium transition',
                    activeCategory === category
                      ? 'border-[#2f2f2f] bg-[#2f2f2f] text-white'
                      : 'border-[#ddd4c8] bg-white text-[#5a554f] hover:border-[#9f7e74] hover:text-[#9f7e74]',
                  ].join(' ')}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:auto-rows-[220px]">
          {displayItems.map((item, index) => (
            <StaggerItem key={`${item.title}-${index}`} className={GRID_CLASSES[index % GRID_CLASSES.length] ?? ''}>
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
                className="group relative h-full min-h-[280px] cursor-pointer overflow-hidden rounded-[2rem] border border-[#ede5db] bg-white shadow-[0_24px_60px_rgba(47,47,47,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_70px_rgba(47,47,47,0.12)]"
              >
                <Image
                  src={item.imageUrl}
                  alt={`${item.title} by ${branding.name || 'BL Renovations'}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover object-center transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.72))]" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white md:p-6">
                  <p className="font-[Quicksand] text-[11px] font-semibold uppercase tracking-[0.28em] text-white/75">{item.category}</p>
                  <h3 className="mt-2 font-[Poppins] text-[1.3rem] font-semibold leading-tight md:text-[1.55rem]">
                    {item.title}
                  </h3>
                  <p className="mt-2 font-[Quicksand] text-sm uppercase tracking-[0.16em] text-white/62">{item.location || 'Owen Sound, ON'}</p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {!pathname.startsWith('/projects') && items.length > displayItems.length ? (
          <FadeInUp>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-[Poppins] text-sm text-[#69635c]">Explore the full gallery to see more bathrooms, kitchens, and finish details.</p>
              <Link
                href="/projects"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d7c9ba] px-7 py-3 font-[Quicksand] text-sm font-semibold uppercase tracking-[0.14em] text-[#4a4641] transition duration-300 hover:border-[#9f7e74] hover:text-[#9f7e74]"
              >
                View the Full Gallery
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
