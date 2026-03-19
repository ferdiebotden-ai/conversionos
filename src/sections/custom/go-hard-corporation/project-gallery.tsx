'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { SectionBaseProps } from '@/lib/section-types';
import { ScaleIn, StaggerContainer, StaggerItem } from '@/components/motion';

type GalleryItem = {
  title: string;
  location: string;
  imageUrl: string;
};

function str(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function toGalleryItem(value: unknown, index: number): GalleryItem {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    title: str(item['title']) || str(item['name']) || `Featured Project ${index + 1}`,
    location: str(item['location']) || str(item['serviceArea']) || 'Cambridge, Ontario',
    imageUrl: str(item['imageUrl']) || str(item['image_url']) || str(item['photo']) || str(item['src']),
  };
}

export function ProjectGallery({ branding, config, className }: SectionBaseProps) {
  const c = config as unknown as Record<string, unknown>;
  const portfolioRaw = Array.isArray(c['portfolio']) ? c['portfolio'] : [];
  const portfolio = (portfolioRaw.length ? portfolioRaw : [{}, {}, {}, {}]).slice(0, 4).map(toGalleryItem);

  const companyName = str(branding.name) || 'Go Hard Corporation';
  const heading = str(c['galleryHeadline']) || str(c['gallery_headline']) || 'Projects built with trust, care, and exacting craft.';
  const copyOne =
    str(c['aboutCopy']) ||
    str(c['about_copy']) ||
    'Built on family values, we focus on honesty, communication, and care in everything we do. Our goal is to earn your trust through reliable service and lasting results.';
  const copyTwo =
    str(c['galleryCopy']) ||
    str(c['gallery_copy']) ||
    'Our in-house renovation team works alongside trusted local specialists to deliver kitchens, interiors, and whole-home transformations with calm coordination and precise execution.';

  return (
    <section
      className={[
        'relative overflow-hidden bg-[#f5f1e8] text-stone-900',
        className ?? '',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(180,186,166,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.76),rgba(232,225,210,0.92))]" />
      <div className="absolute inset-y-0 right-0 hidden w-[38%] bg-[#23231f] lg:block" />

      <StaggerContainer className="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 md:py-20 lg:px-10">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-12">
          <div className="relative z-10">
            <StaggerItem>
              <span className="mb-5 inline-flex text-xs font-semibold uppercase tracking-[0.28em] text-[#5c5b4d] [font-family:'Raleway',sans-serif]">
                Our Work
              </span>
            </StaggerItem>

            <StaggerItem>
              <h2 className="max-w-xl text-[clamp(2.7rem,5vw,5.4rem)] font-semibold uppercase leading-[0.88] tracking-[0.02em] text-stone-900 [font-family:'Cormorant_Garamond',serif]">
                {heading}
              </h2>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-7 h-px w-24 bg-[#5c5b4d]/35" />
            </StaggerItem>

            <StaggerItem>
              <div className="mt-8 space-y-6 text-[clamp(1rem,1.15vw,1.08rem)] font-light leading-[2.05] text-stone-700 [font-family:'proxima-nova','Raleway',sans-serif]">
                <p>{copyOne}</p>
                <p>{copyTwo}</p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/visualizer"
                  className="inline-flex min-h-14 items-center justify-center rounded-[28px] bg-[#5c5b4d] px-7 text-center text-sm font-light uppercase tracking-[0.18em] text-white shadow-[0_18px_44px_rgba(52,49,39,0.18)] transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:bg-[#6a6958] hover:shadow-[0_24px_54px_rgba(52,49,39,0.24)] [font-family:'proxima-nova','Raleway',sans-serif]"
                >
                  Get Your Free Design Estimate
                </Link>
                <p className="max-w-xs text-sm leading-7 text-stone-600 [font-family:'proxima-nova','Raleway',sans-serif]">
                  Preview renovation directions with AI-led concepting before your build begins.
                </p>
              </div>
            </StaggerItem>
          </div>

          <div className="relative lg:pt-6">
            <div className="absolute -left-4 top-8 hidden h-24 w-24 rounded-[28px] border border-white/50 bg-white/35 backdrop-blur-md lg:block" />
            <div className="grid grid-cols-2 gap-[12px]">
              {portfolio.map((item, index) => (
                <StaggerItem key={`${item.title}-${index}`}>
                  <ScaleIn>
                    <article
                      className={[
                        'group relative overflow-hidden rounded-[28px] border border-white/40 bg-white/55 shadow-[0_18px_44px_rgba(52,49,39,0.12)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(52,49,39,0.2)]',
                        index === 0 ? 'col-span-2 min-h-[320px] sm:min-h-[420px]' : 'min-h-[220px] sm:min-h-[260px]',
                      ].join(' ')}
                    >
                      <div className="absolute inset-0">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={`${item.title} by ${companyName}`}
                            fill
                            priority={false}
                            className="object-cover transition duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[linear-gradient(145deg,#c2c7b5,#7f816e_52%,#3c3b33)]" />
                        )}
                        <div className="absolute inset-0 bg-black/40" />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_18%,rgba(18,18,16,0.12)_48%,rgba(18,18,16,0.82)_100%)]" />
                      </div>

                      <div className="relative flex h-full flex-col justify-end p-5 sm:p-6">
                        <div className="mb-3 inline-flex w-fit rounded-[28px] border border-white/18 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/86 backdrop-blur-md [font-family:'Raleway',sans-serif]">
                          {index === 0 ? 'Featured Build' : 'Recent Project'}
                        </div>
                        <h3 className="max-w-[14ch] text-[clamp(1.5rem,2.1vw,2.3rem)] font-semibold leading-[0.96] text-white [font-family:'Playfair_Display','Cormorant_Garamond',serif]">
                          {item.title}
                        </h3>
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <p className="text-sm font-light uppercase tracking-[0.16em] text-white/78 [font-family:'proxima-nova','Raleway',sans-serif]">
                            {item.location}
                          </p>
                          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d9dccd] [font-family:'Raleway',sans-serif]">
                            View Story
                          </span>
                        </div>
                      </div>
                    </article>
                  </ScaleIn>
                </StaggerItem>
              ))}
            </div>
          </div>
        </div>
      </StaggerContainer>
    </section>
  );
}
