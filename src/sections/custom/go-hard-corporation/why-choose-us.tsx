'use client';

import Link from 'next/link';

import { FadeIn, FadeInUp, ScaleIn, StaggerContainer, StaggerItem } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';
import { asRecord, asRecordArray, str } from '@/sections/custom/_shared/content';

const FALLBACK_ITEMS = [
  {
    title: 'Design-Build Under One Roof',
    description: 'Design, selections, scheduling, and construction move through one coordinated team instead of separate handoffs.',
  },
  {
    title: 'Family-Run, Detail-Focused',
    description: 'The work is personal, the communication is direct, and the site is managed with respect for the home.',
  },
  {
    title: 'Craftsmanship That Feels Finished',
    description: 'The final result is not just functional. It feels composed, warm, and tailored to daily life.',
  },
];

export function WhyChooseUs({ config, className }: SectionBaseProps) {
  const company = asRecord(config);
  const configuredItems = asRecordArray(company['whyChooseUs'])
    .map((item) => ({
      title: str(item['title']) || str(item['name']),
      description: str(item['description']) || str(item['text']),
    }))
    .filter((item) => item.title);
  const items = (configuredItems.length ? configuredItems : FALLBACK_ITEMS).slice(0, 3);

  return (
    <section className={['bg-[#f6f1e8] py-16 text-[#23231f] md:py-24', className ?? ''].join(' ')}>
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Why Homeowners Choose Go Hard</p>
            <h2
              className="mt-5 text-[clamp(2.4rem,4.8vw,4.8rem)] font-semibold leading-[0.95] text-[#23231f]"
              style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
            >
              The work feels calm because the process is controlled.
            </h2>
            <p className="mt-5 text-[15px] leading-8 text-[#666257] md:text-base">
              Go Hard Corporation’s brand is warm and polished, but the reason it feels trustworthy is simpler: the details are coordinated early and carried through properly once construction starts.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-10 grid gap-5 lg:grid-cols-3">
          {items.map((item, index) => (
            <StaggerItem key={item.title}>
              <ScaleIn>
                <article className="flex h-full flex-col rounded-[1.75rem] border border-[#ddd5c8] bg-white p-7 shadow-[0_24px_60px_rgba(41,35,28,0.08)]">
                  <div className="flex items-center justify-between">
                    <span className="flex size-12 items-center justify-center rounded-full bg-[#23231f] text-sm font-semibold tracking-[0.18em] text-white">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(90,87,68,0.7),transparent)]" />
                  </div>
                  <h3
                    className="mt-6 text-[1.8rem] leading-tight text-[#23231f]"
                    style={{ fontFamily: '"Playfair Display","Cormorant Garamond",serif' }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-4 flex-1 text-[15px] leading-8 text-[#666257]">{item.description}</p>
                </article>
              </ScaleIn>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-10 flex justify-center">
            <Link
              href="/visualizer"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/90"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
