'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, FadeInUp, ParallaxSection } from '@/components/motion';

export function HeroSection({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }
  const heading = str(config['heroHeadline']) || str(config['hero_headline']);
  const subheading = str(config['heroSubheadline']) || str(config['hero_subheadline']);
  const backgroundImage = str(config['heroImageUrl']) || str(config['hero_image_url']);

  const brand = (branding ?? {}) as Record<string, unknown>;
  const brandName = str(brand['name']) || 'BL Renovations';
  const phone = str(brand['phone']);

  return (
    <ParallaxSection
      offset={16}
      className={`relative min-h-[720px] overflow-hidden bg-[#3e3a34] text-white ${className ?? ''}`}
    >
      <div className="absolute inset-0">
        {backgroundImage ? (
          <Image
            src={backgroundImage}
            alt={brandName}
            fill
            priority={false}
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-[#655a4e] to-[#2d2925]" />
        )}
      </div>

      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

      <div className="relative mx-auto flex min-h-[720px] w-full max-w-7xl items-center px-5 py-24 sm:px-8 md:px-12 lg:px-16">
        <StaggerContainer className="max-w-3xl">
          <FadeInUp>
            <p className="font-[Sacramento] text-[34px] leading-none text-[#f1dfc2] sm:text-[42px]">
              {brandName}
            </p>
          </FadeInUp>

          <FadeInUp>
            <h1 className="mt-4 font-[Poppins] text-[42px] font-semibold uppercase leading-[1.05] tracking-[0.04em] text-white sm:text-[56px] md:text-[68px] lg:text-[78px]">
              {heading || 'Renovations Designed Around Your Home'}
            </h1>
          </FadeInUp>

          <FadeInUp>
            <div className="mt-7 h-px w-24 bg-[#f1dfc2]/80" />
          </FadeInUp>

          {(subheading || phone) && (
            <FadeInUp>
              <p className="mt-7 max-w-2xl font-[Quicksand] text-[17px] font-normal leading-[1.75] tracking-[0.01em] text-white/92 sm:text-[18px]">
                {subheading || `Thoughtful interior and exterior renovation work with clear communication from first walkthrough to final reveal.${phone ? ` Call ${phone}.` : ''}`}
              </p>
            </FadeInUp>
          )}

          <FadeInUp>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/visualizer"
                className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-[#f1dfc2] px-7 py-3 font-[Quicksand] text-[16px] font-normal tracking-[1px] text-[#444444] transition duration-200 hover:bg-[#f6e8d1]"
              >
                Get Your Free Design Estimate
              </Link>
              <Link
                href="/visualizer?mode=chat"
                className="inline-flex min-h-12 items-center justify-center rounded-[4px] border border-white/75 bg-transparent px-7 py-3 font-[Quicksand] text-[16px] font-normal tracking-[1px] text-white transition duration-200 hover:bg-white/10"
              >
                See Your Space Before You Build
              </Link>
            </div>
          </FadeInUp>
        </StaggerContainer>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
    </ParallaxSection>
  );
}
