'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function OurProcess({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function records(v: unknown): Record<string, unknown>[] {
    return Array.isArray(v)
      ? v.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      : [];
  }

  const heroImageUrl = str(config['heroImageUrl']) || str(config['hero_image_url']);
  const aboutText = str(config['aboutText']) || str(config['about_text']);
  const aboutCopy = str(config['aboutCopy']) || str(config['about_copy']) || aboutText;
  const serviceArea = str(config['serviceArea']) || str(config['service_area']) || branding.address || 'your build area';
  const explicitSteps =
    [config['processSteps'], config['process_steps'], config['ourProcess'], config['our_process'], config['steps']]
      .map((value) => records(value))
      .find((value) => value.length) ?? [];

  const steps = explicitSteps.length
    ? explicitSteps.slice(0, 4).map((step, index) => ({
        title: str(step['title']) || str(step['name']) || `Step ${index + 1}`,
        description:
          str(step['description']) || 'Defined deliverables, practical next steps, and clear communication at every stage.',
      }))
    : [
        {
          title: 'Discovery & Site Review',
          description: `We start by understanding the scope, priorities, and constraints for your project in ${serviceArea}.`,
        },
        {
          title: 'Planning & Pricing',
          description: 'Selections, sequencing, and scope are aligned before work begins so expectations stay clear.',
        },
        {
          title: 'Build Execution',
          description: 'Trades are coordinated carefully to keep quality high, timelines realistic, and the site running smoothly.',
        },
        {
          title: 'Final Walkthrough',
          description: 'The project closes with finishing details reviewed, punch items addressed, and the handoff completed cleanly.',
        },
      ];

  return (
    <section className={`bg-slate-950 py-14 text-white md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="max-w-3xl">
            <p className="font-body text-sm uppercase tracking-[0.28em] text-primary/80">Our Process</p>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight md:text-5xl">
              A straightforward path from concept to completed build
            </h2>
            <FadeIn>
              <p className="mt-4 font-body text-base leading-7 text-white/72">
                {aboutCopy ||
                  `${branding.name} keeps the process organized, visible, and practical so every decision supports a stronger final result.`}
              </p>
            </FadeIn>
          </div>
        </FadeInUp>

        <StaggerContainer className="relative mt-12 grid gap-6 lg:grid-cols-4">
          <div className="absolute left-[12.5%] right-[12.5%] top-9 hidden h-px bg-white/15 lg:block" />
          {steps.map((step, index) => (
            <StaggerItem key={`${step.title}-${index}`}>
              <article className="relative h-full rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary font-heading text-xl font-semibold text-primary-foreground">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-6 font-heading text-2xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 font-body text-base leading-7 text-white/72">{step.description}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <ScaleIn>
          <div className="mt-10 overflow-hidden rounded-[30px] border border-white/10 bg-white/5">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-7 md:p-8">
                <p className="font-body text-sm uppercase tracking-[0.24em] text-white/60">What you can expect</p>
                <h3 className="mt-3 font-heading text-2xl font-semibold text-white md:text-3xl">
                  Clear updates, disciplined coordination, and a finished result that feels complete.
                </h3>
                <p className="mt-4 max-w-2xl font-body text-base leading-7 text-white/72">
                  Every phase is structured to reduce surprises and keep momentum steady, from early estimates through the last walkthrough.
                </p>
                <Link
                  href="/visualizer"
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
                >
                  Get Your Free Design Estimate
                </Link>
              </div>
              <div className="relative min-h-[240px]">
                {heroImageUrl ? (
                  <Image
                    src={heroImageUrl}
                    alt={branding.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/65 to-slate-900/95" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
              </div>
            </div>
          </div>
        </ScaleIn>
      </div>
    </section>
  );
}
