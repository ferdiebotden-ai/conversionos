'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function ServicesSection({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function rec(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }

  const heroHeadline = str(config['heroHeadline']) || str(config['hero_headline']);
  const servicesRaw = Array.isArray(config['services']) ? config['services'] : [];
  const services = servicesRaw.length
    ? servicesRaw.map((item) => rec(item))
    : [
        {
          name: 'Custom Renovations',
          description: `Thoughtful planning and clean execution tailored to ${branding.name}.`,
        },
        {
          name: 'Interior Build-Outs',
          description: 'Practical layouts, durable finishes, and schedule-aware coordination.',
        },
        {
          name: 'Project Management',
          description: 'Clear scopes, reliable communication, and detail-focused delivery.',
        },
      ];
  const tokenCount =
    tokens && typeof tokens === 'object' ? Object.keys(tokens as Record<string, unknown>).length : 0;

  return (
    <section
      id="services"
      data-token-count={tokenCount}
      className={`bg-muted py-16 text-foreground md:py-24 ${className ?? ''}`}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Built Around the Work</p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight md:text-5xl">
                Services shaped for decisive planning and durable results.
              </h2>
            </div>
            <div className="max-w-xl">
              <p className="font-body text-base leading-7 text-muted-foreground">
                {heroHeadline
                  ? `${heroHeadline} is backed by a service mix designed to move from concept to completion without losing clarity.`
                  : `${branding.name} combines build knowledge, finish discipline, and practical scheduling across each service line.`}
              </p>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {services.map((service, index) => {
              const imageUrls = Array.isArray(service['image_urls']) ? service['image_urls'] : [];
              const serviceImage =
                str(service['imageUrl']) || str(service['image_url']) || str(imageUrls[0]);

              return (
                <StaggerItem key={`${str(service['name']) || 'service'}-${index}`}>
                  <ScaleIn>
                    <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-background shadow-sm transition-transform duration-300 hover:scale-[1.02]">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {serviceImage ? (
                          <Image
                            src={serviceImage}
                            alt={str(service['name']) || branding.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 1024px) 100vw, 33vw"
                          />
                        ) : (
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage:
                                'linear-gradient(160deg, oklch(var(--primary) / 0.90), oklch(var(--muted) / 0.92))',
                            }}
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                          {String(index + 1).padStart(2, '0')}
                        </p>
                        <h3 className="mt-4 font-heading text-2xl font-semibold">
                          {str(service['name']) || `Service ${index + 1}`}
                        </h3>
                        <p className="mt-3 flex-1 font-body text-sm leading-7 text-muted-foreground">
                          {str(service['description']) ||
                            'A focused scope, practical sequencing, and a finish standard built around long-term performance.'}
                        </p>
                        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                          <span className="text-sm text-muted-foreground">Detailed scopes and image-backed planning</span>
                          <Link
                            href="/visualizer"
                            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-92"
                          >
                            Estimate
                          </Link>
                        </div>
                      </div>
                    </article>
                  </ScaleIn>
                </StaggerItem>
              );
            })}
          </div>
        </StaggerContainer>

        <FadeInUp>
          <div className="mt-12 flex flex-col gap-4 rounded-[30px] bg-primary px-6 py-7 text-primary-foreground md:flex-row md:items-center md:justify-between md:px-8">
            <p className="max-w-2xl font-body text-sm leading-7 text-primary-foreground/86">
              Every service can feed directly into the design workflow, so ideas, pricing direction, and build expectations stay aligned from the start.
            </p>
            <Link
              href="/visualizer"
              className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition-transform duration-200 hover:scale-[1.01]"
            >
              Start Your Project
            </Link>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
