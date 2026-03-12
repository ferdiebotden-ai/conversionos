// @ts-nocheck
'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function OurProcess({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  function str(v: unknown): string {
    if (Array.isArray(v)) return v.filter(s => typeof s === 'string').join(' ').trim();
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  const aboutImageUrl = str(config['aboutImageUrl']) || str(config['about_image_url']);
  const heroSubheadline = str(config['heroSubheadline']) || str(config['hero_subheadline']);
  const rawSteps = Array.isArray(config['processSteps']) ? config['processSteps']
    : Array.isArray(config['process_steps']) ? config['process_steps'] : [];
  const processSteps =
    rawSteps.length > 0
      ? (rawSteps as Record<string, unknown>[]).slice(0, 4).map((step, index) => ({
          title: str(step['title']) || str(step['name']) || `Step ${index + 1}`,
          description:
            str(step['description']) ||
            'Each phase is scoped carefully so expectations, sequencing, and finish standards stay aligned.',
        }))
      : [
          { title: 'Consult', description: 'Review the space, understand priorities, and align scope with budget.' },
          { title: 'Plan', description: 'Define materials, sequencing, and project logistics before the build begins.' },
          { title: 'Build', description: 'Execute with steady communication, clean coordination, and finish control.' },
          { title: 'Deliver', description: 'Close out the work with walkthroughs, punch-list clarity, and confidence.' },
        ];

  return (
    <section className={`bg-neutral-950 py-14 text-white md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="font-body text-sm uppercase tracking-[0.28em] text-white/65">Our Process</p>
        </FadeIn>
        <FadeInUp>
          <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)] lg:items-end">
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                A structured path from first conversation to final walkthrough
              </h2>
              <p className="mt-4 max-w-2xl font-body text-base leading-7 text-white/75 md:text-lg">
                {heroSubheadline ||
                  `${branding.name} keeps projects moving with a process that reduces ambiguity and protects finish quality.`}
              </p>
            </div>
            <div className="relative min-h-[240px] overflow-hidden rounded-[2rem] border border-white/10">
              {aboutImageUrl ? (
                <Image src={aboutImageUrl} alt={branding.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 45vw" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/25" />
              <div className="absolute bottom-0 left-0 p-6">
                <p className="font-heading text-2xl font-semibold">Built to stay clear at every stage</p>
              </div>
            </div>
          </div>
        </FadeInUp>

        <StaggerContainer className="mt-10 grid gap-5 lg:grid-cols-4">
          {processSteps.map((step, index) => (
            <StaggerItem key={`${step.title}-${index}`}>
              <ScaleIn>
                <article className="relative h-full rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-primary-foreground">
                      {index + 1}
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="mt-5 font-body text-sm leading-6 text-white/75">{step.description}</p>
                </article>
              </ScaleIn>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-6 md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <p className="font-heading text-2xl font-semibold text-white">Ready to map out your project?</p>
              <p className="mt-2 font-body text-sm leading-6 text-white/75">
                Start with a design estimate and build the scope around your goals, timeline, and space.
              </p>
            </div>
            <Link
              href="/visualizer"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02] md:mt-0"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
