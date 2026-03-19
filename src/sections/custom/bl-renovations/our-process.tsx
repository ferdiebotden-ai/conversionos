'use client';

import Image from 'next/image';
import Link from 'next/link';

import { FadeIn, FadeInUp, StaggerContainer, StaggerItem } from '@/components/motion';
import type { SectionBaseProps } from '@/lib/section-types';
import { asRecord, asRecordArray, str } from '@/sections/custom/_shared/content';

const FALLBACK_STEPS = [
  {
    title: 'Contact',
    description: 'Book a free in-home consultation so the project can be reviewed in person.',
    imageUrl: '',
  },
  {
    title: 'Estimate',
    description: 'Receive a personalized quote based on measurements, finishes, and the scope discussed.',
    imageUrl: '',
  },
  {
    title: 'Book',
    description: 'Secure the schedule with a deposit and line up the materials needed for the job.',
    imageUrl: '',
  },
  {
    title: 'Install',
    description: 'Work moves through with in-house coordination and timeline updates from start to finish.',
    imageUrl: '',
  },
];

export function OurProcess({ config, className }: SectionBaseProps) {
  const company = asRecord(config);
  const configuredSteps = asRecordArray(company['processSteps'])
    .map((item) => ({
      title: str(item['title']) || str(item['name']),
      description: str(item['description']) || str(item['text']),
      imageUrl: str(item['imageUrl']) || str(item['image_url']) || str(item['photo']),
    }))
    .filter((item) => item.title);
  const steps = configuredSteps.length ? configuredSteps : FALLBACK_STEPS;

  return (
    <section className={['relative overflow-hidden bg-white py-16 text-[#2f2f2f] md:py-24', className ?? ''].join(' ')}>
      <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(47,47,47,0.08),transparent_70%)]" />
      <div className="absolute left-0 top-24 h-40 w-full bg-[linear-gradient(135deg,transparent_18%,rgba(235,211,203,0.18)_18%,rgba(235,211,203,0.18)_22%,transparent_22%)] bg-[length:26px_26px] opacity-70" />

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-10">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-[Quicksand] text-xs font-semibold uppercase tracking-[0.28em] text-[#9f7e74]">The Process</p>
            <h2 className="mt-5 font-[Sacramento] text-[4.5rem] leading-none text-[#2f2f2f] sm:text-[5.5rem]">The Process...</h2>
            <p className="mt-5 font-[Poppins] text-[15px] leading-8 text-[#68635c] md:text-base">
              A simple path from the first walkthrough to the finished installation, with clear updates and in-house coordination at every stage.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <StaggerItem key={`${step.title}-${index}`}>
              <article className="group overflow-hidden rounded-[2rem] border border-[#ede5db] bg-[#fbf8f4] shadow-[0_24px_60px_rgba(47,47,47,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_70px_rgba(47,47,47,0.12)]">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#efe5d9]">
                  {step.imageUrl ? (
                    <Image
                      src={step.imageUrl}
                      alt={step.title}
                      fill
                      sizes="(max-width: 1280px) 50vw, 25vw"
                      className="object-cover object-center transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#f2e7d8,#d8c8ba_55%,#4b4a46)]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.58))]" />
                  <div className="absolute left-5 top-5 rounded-full border border-white/30 bg-white/14 px-3 py-1 font-[Quicksand] text-[10px] font-semibold uppercase tracking-[0.28em] text-white backdrop-blur-sm">
                    Step {index + 1}
                  </div>
                </div>

                <div className="space-y-4 p-6 md:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-[Poppins] text-[1.45rem] font-semibold leading-tight text-[#2f2f2f]">{step.title}</h3>
                    <span className="font-[Sacramento] text-[2rem] leading-none text-[#9f7e74]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="font-[Poppins] text-[15px] leading-7 text-[#69635c]">{step.description}</p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-10 flex justify-center">
            <Link
              href="/visualizer"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 py-3 font-[Quicksand] text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground transition duration-300 hover:scale-[1.02] hover:bg-primary/90"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
