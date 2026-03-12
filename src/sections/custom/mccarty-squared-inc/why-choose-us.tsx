// @ts-nocheck
'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function WhyChooseUs({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  function str(v: unknown): string {
    if (Array.isArray(v)) return v.filter(s => typeof s === 'string').join(' ').trim();
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  const whyChooseUs = Array.isArray(config['whyChooseUs']) ? config['whyChooseUs'] : [];
  const aboutImageUrl = str(config['aboutImageUrl']) || str(config['about_image_url']);
  const trustMetrics =
    config['trustMetrics'] && typeof config['trustMetrics'] === 'object'
      ? (config['trustMetrics'] as Record<string, unknown>)
      : null;

  const reasons =
    whyChooseUs.length > 0
      ? (whyChooseUs as Record<string, unknown>[])
      : [
          { title: 'Clear communication', description: 'Updates stay direct, practical, and tied to real project milestones.' },
          { title: 'Disciplined execution', description: 'Work is sequenced carefully so quality does not slip under pressure.' },
          { title: 'Finish-focused results', description: 'Small details receive the same attention as large structural decisions.' },
        ];

  function formatLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  const metricList = trustMetrics
    ? Object.entries(trustMetrics).filter(([, v]) => typeof v === 'string' || typeof v === 'number').slice(0, 2).map(([k, v]) => [formatLabel(k), String(v)])
    : [];

  return (
    <section className={`bg-muted py-14 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div>
            <FadeIn>
              <p className="font-body text-sm uppercase tracking-[0.28em] text-primary">Why Choose Us</p>
            </FadeIn>
            <FadeInUp>
              <h2 className="mt-4 max-w-3xl font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                The difference is in how the work is managed and delivered
              </h2>
            </FadeInUp>
            <FadeInUp>
              <p className="mt-4 max-w-2xl font-body text-base leading-7 text-muted-foreground md:text-lg">
                {branding.name} is built around preparation, accountability, and finished spaces that feel considered rather than rushed.
              </p>
            </FadeInUp>

            <StaggerContainer className="mt-8 grid gap-4 md:grid-cols-2">
              {reasons.slice(0, 4).map((reason, index) => (
                <StaggerItem key={`${str(reason['title'])}-${index}`}>
                  <ScaleIn>
                    <article className="h-full rounded-[1.5rem] border border-border bg-background p-6 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {index + 1}
                      </div>
                      <h3 className="mt-4 font-heading text-xl font-semibold text-foreground">
                        {str(reason['title']) || `Reason ${index + 1}`}
                      </h3>
                      <p className="mt-3 font-body text-sm leading-6 text-muted-foreground">
                        {str(reason['description']) || str(reason['copy']) || 'A practical advantage clients can feel throughout the project.'}
                      </p>
                    </article>
                  </ScaleIn>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          <div className="space-y-5">
            <ScaleIn>
              <div className="relative min-h-[280px] overflow-hidden rounded-[2rem] border border-border bg-card">
                {aboutImageUrl ? (
                  <Image src={aboutImageUrl} alt={branding.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 40vw" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="font-heading text-2xl font-semibold">Built to earn trust before the project is done</p>
                </div>
              </div>
            </ScaleIn>

            <div className="grid gap-4 sm:grid-cols-2">
              {metricList.length > 0 ? (
                metricList.map(([label, value], index) => (
                  <StaggerItem key={`${label}-${index}`}>
                    <div className="rounded-[1.5rem] border border-border bg-background p-5">
                      <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                      <p className="mt-3 font-heading text-lg font-semibold text-foreground">
                        {str(value) || 'Trusted project delivery'}
                      </p>
                    </div>
                  </StaggerItem>
                ))
              ) : (
                <>
                  <StaggerItem>
                    <div className="rounded-[1.5rem] border border-border bg-background p-5">
                      <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">Approach</p>
                      <p className="mt-3 font-heading text-lg font-semibold text-foreground">Structured, responsive, finish-focused</p>
                    </div>
                  </StaggerItem>
                  <StaggerItem>
                    <div className="rounded-[1.5rem] border border-border bg-background p-5">
                      <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">Outcome</p>
                      <p className="mt-3 font-heading text-lg font-semibold text-foreground">Spaces that feel intentional and complete</p>
                    </div>
                  </StaggerItem>
                </>
              )}
            </div>

            <FadeInUp>
              <Link
                href="/visualizer"
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
              >
                Get Your Free Design Estimate
              </Link>
            </FadeInUp>
          </div>
        </div>
      </div>
    </section>
  );
}
