'use client';

import Link from 'next/link';

import { FadeIn, FadeInUp, ScaleIn, StaggerContainer, StaggerItem } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';
import { asRecord, asRecordArray, str } from '@/sections/custom/_shared/content';

const FALLBACK_ITEMS = [
  {
    title: 'High End Custom Solutions',
    description: 'Selections, layouts, and finish details are tailored to the home instead of forced into a standard package.',
  },
  {
    title: 'Fast and Efficient',
    description: 'Projects are managed with clear scheduling updates so homeowners know what is happening and when.',
  },
  {
    title: 'Budget-Friendly',
    description: 'The team helps homeowners balance scope, materials, and quality without losing the desired result.',
  },
];

function initials(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BL';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function WhyChooseUs({ config, className }: SectionBaseProps) {
  const company = asRecord(config);
  const configuredItems = asRecordArray(company['whyChooseUs'])
    .map((item) => ({
      title: str(item['title']) || str(item['name']),
      description: str(item['description']) || str(item['text']),
    }))
    .filter((item) => item.title);
  const items = (configuredItems.length ? configuredItems : FALLBACK_ITEMS).slice(0, 4);

  return (
    <section className={['bg-[#faf7f3] py-16 text-[#2f2f2f] md:py-24', className ?? ''].join(' ')}>
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-[Quicksand] text-xs font-semibold uppercase tracking-[0.28em] text-[#9f7e74]">Why Choose Us</p>
            <h2 className="mt-5 font-[Poppins] text-[clamp(2.2rem,4.2vw,3.9rem)] font-semibold leading-[1.04] text-[#2f2f2f]">
              Built on trust, quality, and care.
            </h2>
            <p className="mt-5 font-[Poppins] text-[15px] leading-8 text-[#68635c] md:text-base">
              BL Renovations pairs a light, approachable design sensibility with practical renovation management that keeps projects feeling personal rather than transactional.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <StaggerItem key={item.title}>
              <ScaleIn>
                <article className="flex h-full flex-col rounded-[2rem] border border-[#ede5db] bg-white p-7 text-center shadow-[0_24px_60px_rgba(47,47,47,0.08)]">
                  <div className="mx-auto flex size-[84px] items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(235,211,203,0.7),rgba(255,255,255,0.9))] font-[Poppins] text-xl font-semibold tracking-[0.08em] text-[#4a4641] ring-1 ring-[#ede5db]">
                    {initials(item.title)}
                  </div>
                  <h3 className="mt-6 font-[Poppins] text-[1.35rem] font-semibold leading-tight text-[#2f2f2f]">{item.title}</h3>
                  <p className="mt-4 flex-1 font-[Poppins] text-[15px] leading-7 text-[#69635c]">{item.description}</p>
                </article>
              </ScaleIn>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-10 flex justify-center">
            <Link
              href="/visualizer"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d7c9ba] bg-white px-7 py-3 font-[Quicksand] text-sm font-semibold uppercase tracking-[0.14em] text-[#4a4641] transition duration-300 hover:bg-primary hover:text-primary-foreground"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
