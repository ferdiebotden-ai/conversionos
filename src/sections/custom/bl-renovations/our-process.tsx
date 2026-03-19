'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

type StepItem = {
  title: string;
  description: string;
  imageUrl: string;
  accent: string;
};

function str(v: unknown): string {
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function normalizeSteps(value: unknown): StepItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const entry = asRecord(item);
      return {
        title: str(entry['title']) || str(entry['name']) || `Step ${index + 1}`,
        description: str(entry['description']) || str(entry['copy']) || str(entry['text']),
        imageUrl: str(entry['imageUrl']) || str(entry['image_url']) || str(entry['photo']) || '',
        accent: ['terracotta', 'sage', 'sand', 'charcoal'][index % 4] ?? 'terracotta',
      };
    })
    .filter((item) => item.title || item.description);
}

export function OurProcess({ branding, config, className }: SectionBaseProps) {
  const brand = asRecord(branding);
  const headline = str(config['processHeadline']) || str(config['process_headline']) || 'The Process...';
  const subheadline =
    str(config['processSubheadline']) ||
    str(config['process_subheadline']) ||
    `A clear renovation path for ${str(brand['name']) || 'your project'}, from first conversation to final walkthrough.`;
  const area = str(config['serviceArea']) || str(config['service_area']) || str(brand['address']);

  const configuredSteps =
    normalizeSteps(config['processSteps']) ||
    normalizeSteps(config['process_steps']) ||
    normalizeSteps(config['steps']);

  const steps = configuredSteps.length
    ? configuredSteps.slice(0, 4)
    : [
        {
          title: 'Contact',
          description: 'Tell us what needs to change, what the space should feel like, and what matters most for timing.',
          imageUrl: '',
          accent: 'terracotta',
        },
        {
          title: 'Design',
          description: 'We shape the concept, material direction, and a practical scope before the work starts moving.',
          imageUrl: '',
          accent: 'sage',
        },
        {
          title: 'Build',
          description: 'The site is managed with clean sequencing, steady communication, and detail-focused craftsmanship.',
          imageUrl: '',
          accent: 'sand',
        },
        {
          title: 'Reveal',
          description: 'We finish with a full walkthrough so the final result feels polished, complete, and ready to enjoy.',
          imageUrl: '',
          accent: 'charcoal',
        },
      ];

  const accentMap: Record<string, string> = {
    terracotta: 'from-[#D86F4A] to-[#B44B2E]',
    sage: 'from-[#7F8E78] to-[#5A6754]',
    sand: 'from-[#D2B48C] to-[#B89262]',
    charcoal: 'from-[#45413C] to-[#22201D]',
  };

  return (
    <section
      className={[
        'relative overflow-hidden bg-[#f7f2ea] py-20 text-stone-900 md:py-28',
        className ?? '',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,111,74,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,242,234,0.96))]" />
      <div className="absolute left-0 top-0 h-24 w-full bg-[linear-gradient(135deg,transparent_20%,rgba(69,65,60,0.08)_20%,rgba(69,65,60,0.08)_24%,transparent_24%)] bg-[length:26px_26px] opacity-60" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 font-['Poppins'] text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              Our Process
            </p>
            <h2 className="font-['Quicksand'] text-4xl font-bold tracking-[-0.03em] text-stone-900 sm:text-5xl md:text-6xl">
              {headline}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl font-['Poppins'] text-base leading-7 text-stone-600 md:text-lg">
              {subheadline}
            </p>
            {area ? (
              <p className="mt-4 font-['Sacramento'] text-3xl text-[#D86F4A] sm:text-4xl">{area}</p>
            ) : null}
          </div>
        </FadeIn>

        <StaggerContainer className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <StaggerItem key={`${step.title}-${index}`}>
              <FadeInUp delay={index * 0.1}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/75 backdrop-blur-sm shadow-[0_18px_44px_rgba(44,37,28,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(44,37,28,0.18)]">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {step.imageUrl ? (
                      <Image
                        src={step.imageUrl}
                        alt={step.title}
                        fill
                        priority={false}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-br ${accentMap[step.accent] ?? accentMap['terracotta']}`} />
                    )}
                    <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                      <span className="rounded-full border border-white/35 bg-stone-950/60 px-3 py-1 font-['Poppins'] text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-md">
                        Step {index + 1}
                      </span>
                      <span className="rounded-full bg-white/88 px-3 py-1 font-['Sacramento'] text-2xl text-stone-900">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950/70 via-stone-950/10 to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col px-6 pb-7 pt-6">
                    <h3 className="font-['Quicksand'] text-[30px] font-bold leading-none text-stone-900">
                      {step.title}
                    </h3>
                    <p className="mt-4 flex-1 font-['Poppins'] text-sm leading-7 text-stone-600">
                      {step.description}
                    </p>
                    <div className="mt-6 h-px w-full bg-[linear-gradient(90deg,rgba(216,111,74,0.9),rgba(216,111,74,0.08))]" />
                  </div>
                </article>
              </FadeInUp>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <ScaleIn>
            <div className="rounded-[28px] bg-[#2f2b27] px-7 py-8 text-white shadow-[0_18px_44px_rgba(44,37,28,0.12)] md:px-10 md:py-10">
              <p className="font-['Poppins'] text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                2026 Upgrade
              </p>
              <h3 className="mt-3 font-['Quicksand'] text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                See the transformation before construction starts.
              </h3>
              <p className="mt-4 max-w-2xl font-['Poppins'] text-sm leading-7 text-white/78 sm:text-base">
                Bring photos, inspiration, and rough ideas into one guided design estimate. It is a faster way to align
                the vision, budget, and next steps before the first tool comes out.
              </p>
            </div>
          </ScaleIn>

          <FadeInUp delay={0.2}>
            <div className="flex h-full flex-col justify-center rounded-[28px] border border-stone-200/70 bg-white/85 p-7 backdrop-blur-sm shadow-[0_18px_44px_rgba(44,37,28,0.12)] md:p-8">
              <Link
                href="/visualizer"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 font-['Poppins'] text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
              >
                Get Your Free Design Estimate
              </Link>
              <Link
                href="/visualizer?mode=chat"
                className="mt-4 inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-4 font-['Poppins'] text-sm font-semibold uppercase tracking-[0.18em] text-stone-800 transition-all duration-300 hover:scale-[1.02] hover:border-primary hover:text-primary"
              >
                Start with a Quick Project Chat
              </Link>
            </div>
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}

