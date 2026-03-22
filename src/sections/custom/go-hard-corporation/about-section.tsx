'use client';

import Image from 'next/image';
import Link from 'next/link';

import { FadeIn, FadeInUp, SlideInFromSide } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';
import { asRecord, firstText, textList } from '@/sections/custom/_shared/content';

export function AboutSection({ branding, config, className }: SectionBaseProps) {
  const company = asRecord(config);
  const companyName = branding.name || 'Go Hard Corporation';
  const paragraphs = textList(company['aboutCopy']);
  const headline =
    firstText(company['aboutHeadline']) ||
    'Your home is a true collection of what you love and a story of who you are.';
  const aboutImage = firstText(company['aboutImageUrl'], company['about_image_url']);

  return (
    <section className={['bg-white py-16 text-[#2b2c2c] md:py-24', className ?? ''].join(' ')}>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:px-10">
        <FadeIn className="order-2 lg:order-1">
          <div className="rounded-[2rem] border border-[#ddd6c8] bg-[#faf7f1] p-8 shadow-[0_24px_60px_rgba(41,35,28,0.06)] md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">About Us</p>
            <h2
              className="mt-5 max-w-3xl text-[clamp(2.5rem,4.7vw,4.75rem)] font-semibold leading-[0.95] text-[#23231f]"
              style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
            >
              {headline}
            </h2>

            <div className="mt-8 grid gap-4">
              {(paragraphs.length ? paragraphs : [
                `${companyName} is a Cambridge-based design-build renovation company serving homeowners across Kitchener, Waterloo, Cambridge, and Guelph.`,
                'The team brings together designers, project managers, and skilled trades to keep selections, scheduling, and craftsmanship aligned from start to finish.',
                'The goal is simple: create spaces that feel personal, functional, and carefully finished instead of rushed or improvised.',
              ]).map((paragraph, index) => (
                <div
                  key={`${paragraph}-${index}`}
                  className="rounded-[1.5rem] border border-[#e4ddcf] bg-white/90 p-5 text-[15px] leading-8 text-[#636055] shadow-[0_16px_40px_rgba(41,35,28,0.05)]"
                >
                  {paragraph}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {[
                'Full-service design-build',
                'Kitchens, bathrooms, and additions',
                'Licensed contractors and designers',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-[#d9d1c2] bg-white px-4 py-2 text-sm font-medium text-[#4f4c42]"
                >
                  {item}
                </div>
              ))}
            </div>

            <FadeInUp>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/visualizer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/90"
                >
                  Get Your Free Design Estimate
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d2c9b8] px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#3f3d34] transition duration-300 hover:border-primary hover:text-primary"
                >
                  View Our Portfolio
                </Link>
              </div>
            </FadeInUp>
          </div>
        </FadeIn>

        <SlideInFromSide from="right" className="order-1 lg:order-2">
          <div className="group relative overflow-hidden rounded-[2rem] border border-[#ddd6c8] bg-[#d8d0c3] shadow-[0_28px_70px_rgba(41,35,28,0.1)]">
            <div className="relative aspect-[4/5]">
              {aboutImage ? (
                <Image
                  src={aboutImage}
                  alt={`${companyName} craftsmanship`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover object-center transition duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#dfd8ca,#b9b4a5_55%,#3d3a32)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.5))]" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="rounded-[1.5rem] border border-white/20 bg-white/10 p-5 text-white backdrop-blur-md">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">Full-Service General Contractor</p>
                  <p
                    className="mt-3 text-[1.7rem] leading-tight md:text-[2.2rem]"
                    style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
                  >
                    Making your dream a reality with intentional design and superb craftsmanship.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SlideInFromSide>
      </div>
    </section>
  );
}
