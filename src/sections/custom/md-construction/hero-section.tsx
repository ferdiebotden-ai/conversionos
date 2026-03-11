'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function HeroSection({ branding, config, tokens, className }: SectionBaseProps) {
  void tokens;

  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function records(v: unknown): Record<string, unknown>[] {
    return Array.isArray(v)
      ? v.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      : [];
  }

  const heroHeadline = str(config['heroHeadline']) || str(config['hero_headline']);
  const heroSubheadline = str(config['heroSubheadline']) || str(config['hero_subheadline']);
  const heroImageUrl = str(config['heroImageUrl']) || str(config['hero_image_url']);
  const aboutText = str(config['aboutText']) || str(config['about_text']);
  const aboutCopy = str(config['aboutCopy']) || str(config['about_copy']) || aboutText;
  const serviceArea = str(config['serviceArea']) || str(config['service_area']) || branding.address || 'Southwestern Ontario';
  const services = records(config['services']);
  const trustMetrics =
    config['trustMetrics'] && typeof config['trustMetrics'] === 'object'
      ? (config['trustMetrics'] as Record<string, unknown>)
      : null;

  const serviceTags = services
    .slice(0, 3)
    .map((service) => str(service['name']))
    .filter(Boolean);
  const highlights = serviceTags.length ? serviceTags : ['Custom Builds', 'Renovations', 'Concrete Work'];
  const summary =
    aboutCopy ||
    `${branding.name} delivers durable construction work with clear planning, dependable crews, and finishes built for everyday use.`;

  const stats = trustMetrics
    ? Object.entries(trustMetrics)
        .slice(0, 3)
        .map(([label, value]) => ({
          label: label.replace(/([a-z])([A-Z])/g, '$1 $2'),
          value: str(value) || String(value ?? ''),
        }))
        .filter((item) => item.value)
    : [];

  const fallbackStats = [
    { value: serviceArea, label: 'Primary service area' },
    { value: `${services.length || 6}+`, label: 'Core service lines' },
    { value: branding.phone || branding.email || 'Prompt communication', label: 'Easy to reach' },
  ];

  return (
    <section className={`relative overflow-hidden py-16 md:py-24 ${className ?? ''}`}>
      <div className="absolute inset-0">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={branding.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/75 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/35" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:items-end">
          <StaggerContainer className="max-w-3xl">
            <FadeInUp>
              <p className="font-body text-sm uppercase tracking-[0.3em] text-white/70">
                {branding.name}
              </p>
            </FadeInUp>
            <FadeInUp>
              <h1 className="mt-4 font-heading text-4xl font-bold leading-tight text-white md:text-6xl">
                {heroHeadline || `Built right for ${serviceArea}`}
              </h1>
            </FadeInUp>
            <FadeInUp>
              <p className="mt-5 max-w-2xl font-body text-lg leading-8 text-white/85 md:text-xl">
                {heroSubheadline ||
                  'Thoughtful planning, honest timelines, and durable craftsmanship from first call to final walkthrough.'}
              </p>
            </FadeInUp>
            <FadeIn>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/visualizer"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
                >
                  Get Your Free Design Estimate
                </Link>
                <Link
                  href="/visualizer"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
                >
                  Explore Your Project Options
                </Link>
              </div>
            </FadeIn>
            <StaggerContainer className="mt-10 flex flex-wrap gap-3">
              {highlights.map((item, index) => (
                <StaggerItem key={`${item}-${index}`}>
                  <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85 backdrop-blur-sm">
                    {item}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </StaggerContainer>

          <ScaleIn>
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-md">
              <p className="font-body text-xs uppercase tracking-[0.28em] text-white/65">Why homeowners call</p>
              <p className="mt-4 font-body text-base leading-7 text-white/85">{summary}</p>
              <div className="mt-6 grid gap-3">
                {(stats.length ? stats : fallbackStats).map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4"
                  >
                    <p className="font-heading text-2xl font-semibold text-white">{item.value}</p>
                    <p className="mt-1 font-body text-sm text-white/70">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScaleIn>
        </div>
      </div>
    </section>
  );
}
