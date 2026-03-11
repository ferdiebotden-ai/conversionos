'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function HeroSection({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function rec(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }

  const heroHeadline = str(config['heroHeadline']) || str(config['hero_headline']);
  const heroSubheadline = str(config['heroSubheadline']) || str(config['hero_subheadline']);
  const heroImageUrl = str(config['heroImageUrl']) || str(config['hero_image_url']);
  const serviceArea = str(config['serviceArea']) || str(config['service_area']);
  const services = Array.isArray(config['services']) ? config['services'] : [];
  const trustMetrics =
    config['trustMetrics'] && typeof config['trustMetrics'] === "object"
      ? (config['trustMetrics'] as Record<string, unknown>)
      : null;
  const tokenCount =
    tokens && typeof tokens === 'object' ? Object.keys(tokens as Record<string, unknown>).length : 0;

  const statCards = [
    {
      label: 'Service Area',
      value: serviceArea || 'Southwestern Ontario',
    },
    {
      label: 'Core Services',
      value: `${Math.max(services.length, 3)}+`,
    },
    {
      label: 'Project Focus',
      value:
        str(trustMetrics ? trustMetrics['projectsCompleted'] : '') ||
        str(trustMetrics ? trustMetrics['projects_completed'] : '') ||
        'Design-Led Builds',
    },
  ];

  return (
    <section
      data-token-count={tokenCount}
      className={`relative overflow-hidden bg-background text-foreground ${className ?? ''}`}
    >
      <div className="absolute inset-0">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={branding.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(135deg, oklch(var(--primary) / 0.96), oklch(var(--primary) / 0.74))',
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, oklch(var(--background) / 0.08), oklch(0 0 0 / 0.62))',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top right, oklch(var(--background) / 0.18), transparent 34%)',
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[640px] max-w-7xl items-end px-4 py-16 md:px-6 md:py-24">
        <StaggerContainer>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div className="max-w-3xl">
              <FadeIn>
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-white/80 backdrop-blur-sm">
                  {serviceArea || 'Custom Construction'}
                </div>
              </FadeIn>
              <FadeInUp>
                <h1 className="mt-6 font-heading text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
                  {heroHeadline || branding.name}
                </h1>
              </FadeInUp>
              <FadeInUp>
                <p className="mt-5 max-w-2xl font-body text-base leading-7 text-white/86 md:text-lg">
                  {heroSubheadline ||
                    `${branding.name} plans, builds, and refines spaces with a practical process and a high-finish standard from first concept to final detail.`}
                </p>
              </FadeInUp>
              <FadeInUp>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/visualizer"
                    className="rounded-full bg-primary px-7 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.01]"
                  >
                    Get Your Free Design Estimate
                  </Link>
                  <Link
                    href="#services"
                    className="rounded-full border border-white/30 bg-white/10 px-7 py-3 text-center text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/16"
                  >
                    Explore Services
                  </Link>
                </div>
              </FadeInUp>
            </div>

            <ScaleIn>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {statCards.map((item) => (
                  <StaggerItem key={item.label}>
                    <div className="rounded-3xl border border-white/18 bg-white/10 p-5 backdrop-blur-md">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/65">{item.label}</p>
                      <p className="mt-3 text-xl font-semibold text-white md:text-2xl">{item.value}</p>
                    </div>
                  </StaggerItem>
                ))}
              </div>
            </ScaleIn>
          </div>
        </StaggerContainer>
      </div>

      <div className="relative border-t border-white/12 bg-black/18 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-sm text-white/78 md:flex-row md:items-center md:justify-between md:px-6">
          <p>{branding.address || `${branding.name} brings detail-first construction to every stage of the project.`}</p>
          <p>{str(rec(services[0])['name']) || 'Renovations'} to {str(rec(services[1])['name']) || 'full build-outs'} with clear planning.</p>
        </div>
      </div>
    </section>
  );
}
