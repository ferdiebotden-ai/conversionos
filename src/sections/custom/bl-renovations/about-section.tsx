'use client';

import Image from 'next/image';
import Link from 'next/link';

import { FadeIn, FadeInUp, SlideInFromSide } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';
import { asRecord, firstText, textList } from '@/sections/custom/_shared/content';

export function AboutSection({ branding, config, className }: SectionBaseProps) {
  const company = asRecord(config);
  const companyName = branding.name || 'BL Renovations';
  const paragraphs = textList(company['aboutCopy']);
  const aboutImage = firstText(company['aboutImageUrl'], company['about_image_url']);

  return (
    <section className={['bg-white py-16 text-[#2f2f2f] md:py-24', className ?? ''].join(' ')}>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:px-10">
        <SlideInFromSide from="left">
          <div className="group relative overflow-hidden rounded-[2.2rem] border border-[#ede5db] bg-[#f5eee5] shadow-[0_24px_60px_rgba(47,47,47,0.08)]">
            <div className="relative aspect-[4/5]">
              {aboutImage ? (
                <Image
                  src={aboutImage}
                  alt={`${companyName} about image`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover object-center transition duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#f2e7d8,#d4c3b5_55%,#484742)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.46))]" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="rounded-[1.5rem] border border-white/20 bg-white/12 p-5 text-white backdrop-blur-md">
                  <p className="font-[Quicksand] text-[11px] font-semibold uppercase tracking-[0.28em] text-white/72">Family-Owned and Locally Operated</p>
                  <p className="mt-3 font-[Poppins] text-[1.55rem] font-semibold leading-tight md:text-[1.85rem]">
                    Renovation work with a personal touch, a lighter palette, and in-house coordination from demo to decor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SlideInFromSide>

        <FadeIn>
          <div className="rounded-[2.2rem] border border-[#ede5db] bg-[#fbf8f4] p-8 shadow-[0_24px_60px_rgba(47,47,47,0.06)] md:p-10">
            <p className="font-[Quicksand] text-xs font-semibold uppercase tracking-[0.28em] text-[#9f7e74]">About Us</p>
            <h2 className="mt-5 font-[Poppins] text-[clamp(2.2rem,4.4vw,4rem)] font-semibold leading-[1.02] text-[#2f2f2f]">
              Built on craftsmanship, trust, and thoughtful renovation.
            </h2>
            <div className="mt-6 h-[2px] w-20 bg-primary" />

            <div className="mt-7 grid gap-4">
              {(paragraphs.length ? paragraphs : [
                `${companyName} provides the friendly, personalized service you expect from a family-owned, locally operated renovation company.`,
                'Projects are managed in-house from demolition through finishing details so communication stays direct and the work keeps moving cleanly.',
                'The focus is helping homeowners find products and solutions that match their style, budget, and project needs without losing the personal side of the experience.',
              ]).map((paragraph, index) => (
                <div
                  key={`${paragraph}-${index}`}
                  className="rounded-[1.5rem] border border-[#ece3d7] bg-white p-5 font-[Poppins] text-[15px] leading-8 text-[#666159] shadow-[0_14px_32px_rgba(47,47,47,0.04)]"
                >
                  {paragraph}
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                'Free in-home consultations',
                'Precise measurements',
                'In-house project management',
                'Solutions matched to style and budget',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-[#eadfce] bg-white px-4 py-3 font-[Quicksand] text-sm text-[#4a4641]"
                >
                  {item}
                </div>
              ))}
            </div>

            <FadeInUp>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/visualizer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 py-3 font-[Quicksand] text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/90"
                >
                  Get Your Free Design Estimate
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d7c9ba] px-7 py-3 font-[Quicksand] text-sm font-semibold uppercase tracking-[0.14em] text-[#4a4641] transition duration-300 hover:border-[#9f7e74] hover:text-[#9f7e74]"
                >
                  View the Gallery
                </Link>
              </div>
            </FadeInUp>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
