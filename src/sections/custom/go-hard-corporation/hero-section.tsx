'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, FadeInUp, ParallaxSection } from '@/components/motion';

export function HeroSection({ branding, config, tokens, className }: SectionBaseProps) {
  const c = config as unknown as Record<string, unknown>;
  function str(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }
  const heading = str(c['heroHeadline']) || str(c['hero_headline']);
  const subheading = str(c['heroSubheadline']) || str(c['hero_subheadline']);
  const backgroundImage = str(c['heroImageUrl']) || str(c['hero_image_url']);

  const brandName = str(branding?.name);
  const title = heading || brandName || 'Built for Timeless Outdoor Living';
  const body =
    subheading ||
    'Refined design, enduring craftsmanship, and tailored spaces that elevate how you live at home.';

  return (
    <ParallaxSection
      className={`relative isolate overflow-hidden bg-black text-white ${className ?? ''}`}
      offset={20}
    >
      <section className="relative min-h-[620px] w-full md:min-h-[720px]">
        <div className="absolute inset-0">
          {backgroundImage ? (
            <Image
              src={backgroundImage}
              alt={brandName || 'Hero background'}
              fill
              priority={false}
              sizes="100vw"
              className="object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700" />
          )}
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/28 via-black/18 to-black/58" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[620px] max-w-7xl items-center justify-center px-6 py-24 text-center md:min-h-[720px] md:px-10">
          <StaggerContainer className="mx-auto flex w-full max-w-4xl flex-col items-center">
            <FadeInUp>
              <h1
                className="mx-auto max-w-3xl text-[2.0625rem] leading-[1.3] font-normal tracking-normal text-white md:text-[3.1rem] md:leading-[1.18] lg:text-[3.7rem]"
                style={{
                  fontFamily: '"Playfair Display","Cormorant Garamond",serif',
                }}
              >
                {title}
              </h1>
            </FadeInUp>

            <FadeInUp>
              <p
                className="mt-5 max-w-2xl text-sm leading-7 font-light text-white/88 md:mt-6 md:text-[1.02rem]"
                style={{
                  fontFamily: 'Inter,"Inter Tight","Raleway","proxima-nova",sans-serif',
                  letterSpacing: '0.01em',
                }}
              >
                {body}
              </p>
            </FadeInUp>

            <FadeInUp>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row">
                <Link
                  href="/visualizer"
                  className="inline-flex min-w-[240px] items-center justify-center border border-transparent bg-primary px-7 py-3 text-center text-[0.875rem] font-light uppercase tracking-[0.18em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/90"
                  style={{
                    fontFamily: '"proxima-nova",Inter,sans-serif',
                  }}
                >
                  Get Your Free Design Estimate
                </Link>
                <Link
                  href="/visualizer?mode=chat"
                  className="inline-flex min-w-[240px] items-center justify-center border border-white/65 bg-white/10 px-7 py-3 text-center text-[0.875rem] font-light uppercase tracking-[0.18em] text-white backdrop-blur-[2px] transition duration-300 hover:bg-white/18"
                  style={{
                    fontFamily: '"proxima-nova",Inter,sans-serif',
                  }}
                >
                  Get a Quick Estimate
                </Link>
              </div>
            </FadeInUp>
          </StaggerContainer>
        </div>
      </section>
    </ParallaxSection>
  );
}
