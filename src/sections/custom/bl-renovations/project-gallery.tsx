'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { ScaleIn, StaggerContainer, StaggerItem } from '@/components/motion';

type PortfolioItem = Record<string, unknown>;

export function ProjectGallery({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  const portfolio = Array.isArray(config['portfolio']) ? config['portfolio'] : [];
  const intro = str(config['portfolioIntro']) || str(config['portfolio_intro']);
  const title = str(config['portfolioTitle']) || str(config['portfolio_title']) || 'Our Work';
  const subtitle =
    str(config['portfolioSubtitle']) ||
    str(config['portfolio_subtitle']) ||
    'Project showcase';
  const companyName = str((branding as Record<string, unknown>)['name']) || 'BL Renovations';

  const items = portfolio
    .map((item): PortfolioItem => (item && typeof item === 'object' ? (item as PortfolioItem) : {}))
    .slice(0, 6);

  const fallbackItems: PortfolioItem[] = [
    { title: 'Kitchen Renovation', imageUrl: '' },
    { title: 'Bathroom Upgrade', imageUrl: '' },
    { title: 'Interior Remodel', imageUrl: '' },
    { title: 'Basement Finish', imageUrl: '' },
    { title: 'Custom Millwork', imageUrl: '' },
    { title: 'Whole Home Refresh', imageUrl: '' },
  ];

  const galleryItems = items.length > 0 ? items : fallbackItems;

  return (
    <section className={`bg-white px-4 py-14 sm:px-6 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center md:mb-10">
          <p
            className="text-[12px] uppercase tracking-[0.28em] text-muted-foreground"
            style={{ fontFamily: '"Quicksand", sans-serif' }}
          >
            {subtitle}
          </p>
          <h2
            className="mt-3 text-3xl font-medium tracking-[0.02em] text-[#444444] md:text-4xl"
            style={{ fontFamily: '"Poppins", sans-serif' }}
          >
            {title}
          </h2>
          <div className="mx-auto mt-4 h-px w-16 bg-[#d8c3a8]" />
          <p
            className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base"
            style={{ fontFamily: '"Quicksand", sans-serif' }}
          >
            {intro || `Explore a selection of renovation work completed by ${companyName}.`}
          </p>
        </div>

        <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryItems.map((item, index) => {
            const imageUrl =
              str(item['imageUrl']) ||
              str(item['image_url']) ||
              str(item['src']) ||
              str(item['url']);
            const itemTitle = str(item['title']) || str(item['name']) || 'Project';
            const itemType = str(item['category']) || str(item['type']) || 'Renovation';
            const sizeClass =
              index === 0
                ? 'sm:col-span-2 lg:col-span-2'
                : index === 3
                  ? 'lg:col-span-2'
                  : '';
            const heightClass =
              index === 0 ? 'aspect-[16/10]' : index === 3 ? 'aspect-[16/9]' : 'aspect-[4/5]';

            return (
              <StaggerItem key={`${itemTitle}-${index}`} className={sizeClass}>
                <ScaleIn>
                  <article className="group overflow-hidden rounded-[4px] bg-[#f6f2ed] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                    <div className={`relative ${heightClass} overflow-hidden`}>
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={`${itemTitle} by ${companyName}`}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#d8c3a8] via-[#efe6dc] to-[#c7b299]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                        <p
                          className="text-[11px] uppercase tracking-[0.24em] text-white/75"
                          style={{ fontFamily: '"Quicksand", sans-serif' }}
                        >
                          {itemType}
                        </p>
                        <h3
                          className="mt-2 text-xl text-white md:text-2xl"
                          style={{ fontFamily: '"Poppins", sans-serif' }}
                        >
                          {itemTitle}
                        </h3>
                      </div>
                    </div>
                  </article>
                </ScaleIn>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <div className="mt-10 text-center">
          <Link
            href="/visualizer"
            className="inline-flex min-h-11 items-center justify-center rounded-[4px] border border-[#444444] px-8 py-3 text-[16px] font-normal uppercase tracking-[0.08em] text-[#444444] transition-colors duration-200 hover:bg-[#444444] hover:text-white"
            style={{ fontFamily: '"Quicksand", sans-serif', lineHeight: '19.2px' }}
          >
            Get Your Free Design Estimate
          </Link>
        </div>
      </div>
    </section>
  );
}
