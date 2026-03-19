'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { FadeIn, SlideInFromSide } from '@/components/motion';

export function AboutSection({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  const c = config as unknown as Record<string, unknown>;
  const aboutText =
    str(c['aboutText']) ||
    str(c['about_text']) ||
    str(c['aboutCopy']) ||
    str(c['about_copy']);
  const aboutImage = str(c['aboutImageUrl']) || str(c['about_image_url']);
  const companyName = str(branding.name) || 'Our Company';
  const paragraphs = aboutText
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <section className={`bg-white px-5 py-14 md:px-8 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 md:grid-cols-[1.02fr_0.98fr] md:gap-14 lg:gap-20">
          <SlideInFromSide direction="left">
            <div className="relative overflow-hidden rounded-[28px] bg-[#f5f1eb] shadow-[0_18px_45px_rgba(0,0,0,0.12)]">
              <div className="relative aspect-[4/5] w-full">
                {aboutImage ? (
                  <Image
                    src={aboutImage}
                    alt={`${companyName} about image`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 767px) 100vw, 50vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/70 to-[#d8c4a7]" />
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/18 to-transparent" />
            </div>
          </SlideInFromSide>

          <FadeIn>
            <div className="mx-auto max-w-xl md:mx-0">
              <p
                className="font-[Quicksand] text-[13px] font-normal uppercase tracking-[0.28em] text-muted-foreground"
                style={{ fontFamily: 'Quicksand, sans-serif' }}
              >
                About Us
              </p>

              <h2
                className="mt-4 text-3xl font-semibold leading-tight text-[#2f2f2f] md:text-4xl lg:text-[2.8rem]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Built on craftsmanship, trust, and thoughtful renovation.
              </h2>

              <div className="mt-6 h-[2px] w-16 bg-primary" />

              <div
                className="mt-7 space-y-5 text-[15px] leading-8 text-[#5b5b5b] md:text-base"
                style={{ fontFamily: 'Quicksand, sans-serif' }}
              >
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))
                ) : (
                  <p>
                    {companyName} delivers dependable renovation work with a focus on clean execution,
                    clear communication, and results that feel built to last.
                  </p>
                )}
              </div>

              <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/visualizer"
                  className="inline-flex min-h-11 items-center justify-center rounded-[4px] border border-[#b9b1a7] px-6 py-3 text-center text-[16px] font-normal uppercase tracking-[0.08em] text-[#444444] transition-colors duration-200 hover:bg-primary hover:text-primary-foreground"
                  style={{ fontFamily: 'Quicksand, sans-serif' }}
                >
                  Get Your Free Design Estimate
                </Link>

                <p
                  className="text-sm italic text-muted-foreground md:text-base"
                  style={{ fontFamily: 'Sacramento, cursive' }}
                >
                  Quality work with a personal touch.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
