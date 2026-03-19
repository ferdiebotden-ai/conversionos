'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

type WhyChooseUsItem = {
  title: string;
  description: string;
};

const fallbackItems: WhyChooseUsItem[] = [
  {
    title: 'Expert Craftsmanship',
    description: 'Our team brings precision, discipline, and detail-focused execution to every stage of the job.',
  },
  {
    title: 'Reliable Scheduling',
    description: 'We stay organized, communicate clearly, and keep your project moving with dependable timelines.',
  },
  {
    title: 'Quality That Lasts',
    description: 'We use proven methods and high standards so your finished result looks better and performs longer.',
  },
];

export function WhyChooseUs({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string {
    return typeof v === "string" && v.trim() ? v.trim() : '';
  }

  const heading = str(config['whyChooseUsHeadline']) || str(config['why_choose_us_headline']) || 'Why Choose Us';
  const subheading =
    str(config['whyChooseUsSubheadline']) ||
    str(config['why_choose_us_subheadline']) ||
    'Built on trust, quality workmanship, and a commitment to doing the job right.';

  const rawItems = Array.isArray(config['whyChooseUs'])
    ? config['whyChooseUs']
    : Array.isArray(config['why_choose_us'])
      ? config['why_choose_us']
      : [];

  const items = (rawItems.length > 0 ? rawItems : fallbackItems)
    .map((item: unknown): WhyChooseUsItem => {
      if (typeof item === 'string') {
        return { title: item, description: '' };
      }

      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return {
          title: str(record['title']) || str(record['name']) || str(record['headline']) || 'Why Homeowners Trust Us',
          description: str(record['description']) || str(record['copy']) || str(record['text']),
        };
      }

      return { title: 'Why Homeowners Trust Us', description: '' };
    })
    .slice(0, 4);

  const brandName = str((branding as Record<string, unknown>)['name']) || 'Our Team';
  const accents = ['01', '02', '03', '04'];

  return (
    <section
      className={`bg-[#1f1f1c] px-5 py-16 text-white md:px-8 md:py-24 ${className ?? ''}`}
      style={{ fontFamily: '"Raleway", "proxima-nova", sans-serif' }}
    >
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-['proxima-nova'] text-[11px] font-light uppercase tracking-[0.26em] text-[#b4baa6]">
              Why Choose Us
            </p>
            <h2
              className="mt-4 text-[33px] font-normal leading-[1.3] text-white md:text-[42px]"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              {heading}
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-white/72">
              {subheading}
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-12 grid gap-5 md:mt-16 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => (
            <StaggerItem key={`${item.title}-${index}`}>
              <ScaleIn>
                <div className="group flex h-full flex-col border border-white/12 bg-white/[0.03] p-7 transition-colors duration-300 hover:bg-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#b4baa6]/60 bg-[#b4baa6]/10 text-[12px] font-light tracking-[0.18em] text-[#d8ddce]">
                      {accents[index] ?? '01'}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#b4baa6]/40 to-transparent" />
                  </div>

                  <h3
                    className="mt-6 text-[23px] font-normal leading-[1.25] text-white"
                    style={{ fontFamily: '"Playfair Display", serif' }}
                  >
                    {item.title}
                  </h3>

                  <p className="mt-4 flex-1 text-[14px] leading-7 text-white/68">
                    {item.description || `${brandName} delivers thoughtful service, consistent communication, and dependable results from start to finish.`}
                  </p>
                </div>
              </ScaleIn>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-12 flex justify-center md:mt-16">
            <Link
              href="/visualizer"
              className="inline-flex items-center justify-center bg-primary px-8 py-3 text-center font-['proxima-nova'] text-[14px] font-light uppercase tracking-[1px] text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
