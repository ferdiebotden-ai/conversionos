'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

type WhyChooseUsItem = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function pickImage(item: WhyChooseUsItem): string {
  const direct = str(item['imageUrl']) || str(item['image_url']) || str(item['iconImage']) || str(item['icon_image']);
  if (direct) return direct;
  const images = Array.isArray(item['imageUrls']) ? item['imageUrls'] : Array.isArray(item['image_urls']) ? item['image_urls'] : [];
  return images.length > 0 ? str(images[0]) : '';
}

function initials(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BL';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function WhyChooseUs({ branding, config, tokens, className }: SectionBaseProps) {
  const c = config as unknown as Record<string, unknown>;
  void branding;
  void tokens;

  const whyChooseUs = Array.isArray(c['whyChooseUs'])
    ? c['whyChooseUs']
    : Array.isArray(c['why_choose_us'])
      ? c['why_choose_us']
      : [];

  const items = whyChooseUs
    .filter((item): item is WhyChooseUsItem => typeof item === 'object' && item !== null)
    .map((item) => ({
      title: str(item['title']) || str(item['heading']) || str(item['name']),
      description: str(item['description']) || str(item['copy']) || str(item['text']),
      image: pickImage(item),
    }))
    .filter((item) => item.title || item.description);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className={`bg-[#f8f8f8] px-4 py-14 md:px-6 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p
              className="font-['Quicksand',sans-serif] text-[13px] font-normal uppercase tracking-[0.22em] text-muted-foreground"
            >
              Why Choose Us
            </p>
            <h2 className="mt-3 font-['Poppins',sans-serif] text-3xl font-semibold tracking-[0.01em] text-[#222] md:text-[42px]">
              Built on Trust, Quality, and Care
            </h2>
            <p className="mx-auto mt-4 max-w-2xl font-['Quicksand',sans-serif] text-[16px] leading-7 text-[#666]">
              We focus on the details that make renovation projects feel straightforward, dependable, and worth the
              investment from day one.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-10 grid gap-5 md:mt-14 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => (
            <StaggerItem key={`${item.title}-${index}`}>
              <ScaleIn>
                <div className="flex h-full flex-col items-center rounded-[20px] border border-black/6 bg-white px-6 py-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.06)] transition-transform duration-300 hover:-translate-y-1">
                  <div className="relative mb-5 flex h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-full bg-[#f2f2f2] ring-1 ring-black/5">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="78px"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-white to-primary/10" />
                        <span className="relative z-10 font-['Poppins',sans-serif] text-lg font-semibold tracking-[0.08em] text-[#444]">
                          {initials(item.title)}
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="font-['Poppins',sans-serif] text-[21px] font-semibold leading-tight text-[#222]">
                    {item.title}
                  </h3>

                  <p className="mt-3 font-['Quicksand',sans-serif] text-[15px] leading-7 text-[#666]">
                    {item.description}
                  </p>
                </div>
              </ScaleIn>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-10 flex justify-center md:mt-14">
            <Link
              href="/visualizer"
              className="inline-flex min-h-12 items-center justify-center rounded-[4px] border border-[#d8d8d8] bg-transparent px-8 py-3 font-['Quicksand',sans-serif] text-[16px] font-normal tracking-[1px] text-[#444] transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
