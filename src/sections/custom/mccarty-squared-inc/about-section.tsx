'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function AboutSection({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  const aboutCopy =
    str(config['aboutCopy']) ||
    str(config['aboutText']) ||
    str(config['about_copy']) ||
    str(config['about_text']);
  const aboutImageUrl = str(config['aboutImageUrl']) || str(config['about_image_url']);
  const heroHeadline = str(config['heroHeadline']) || str(config['hero_headline']);
  const serviceArea = str(config['serviceArea']) || str(config['service_area']);
  const trustMetrics =
    config['trustMetrics'] && typeof config['trustMetrics'] === 'object'
      ? (config['trustMetrics'] as Record<string, unknown>)
      : null;

  const metrics = trustMetrics
    ? Object.entries(trustMetrics).slice(0, 3)
    : [
        ['Focus', 'Detail-led execution'],
        ['Approach', 'Clear communication'],
        ['Result', 'Durable finished spaces'],
      ];

  return (
    <section className={`bg-muted py-14 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)] lg:px-8">
        <ScaleIn>
          <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
            {aboutImageUrl ? (
              <Image src={aboutImageUrl} alt={branding.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 45vw" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <p className="font-body text-sm uppercase tracking-[0.28em] text-white/70">
                {serviceArea || 'About the Company'}
              </p>
              <p className="mt-3 max-w-sm font-heading text-2xl font-semibold">
                {heroHeadline || `${branding.name} builds with structure, polish, and accountability.`}
              </p>
            </div>
          </div>
        </ScaleIn>

        <StaggerContainer className="self-center">
          <FadeIn>
            <p className="font-body text-sm uppercase tracking-[0.28em] text-primary">Who We Are</p>
          </FadeIn>
          <FadeInUp>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Experienced work without the runaround
            </h2>
          </FadeInUp>
          <FadeInUp>
            <p className="mt-5 max-w-2xl font-body text-base leading-7 text-muted-foreground md:text-lg">
              {aboutCopy ||
                `${branding.name} combines disciplined project management with refined craftsmanship, helping clients move from concept to finished space with less friction and better visibility.`}
            </p>
          </FadeInUp>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {metrics.map(([label, value], index) => (
              <StaggerItem key={`${label}-${index}`}>
                <div className="rounded-[1.5rem] border border-border bg-background p-5">
                  <p className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-3 font-heading text-lg font-semibold text-foreground">
                    {str(value) || 'Built around client confidence'}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </div>

          <FadeInUp>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/visualizer"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
              >
                Get Your Free Design Estimate
              </Link>
              {branding.email && (
                <a
                  href={`mailto:${branding.email}`}
                  className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card"
                >
                  {branding.email}
                </a>
              )}
            </div>
          </FadeInUp>
        </StaggerContainer>
      </div>
    </section>
  );
}
