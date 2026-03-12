'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function ServicesSection({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  function str(v: unknown): string {
    if (Array.isArray(v)) return v.filter(s => typeof s === 'string').join(' ').trim();
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  const heroHeadline = str(config['heroHeadline']) || str(config['hero_headline']);
  const services = Array.isArray(config['services']) ? config['services'] : [];
  const serviceArea = str(config['serviceArea']) || str(config['service_area']);
  const intro =
    str(config['heroSubheadline']) ||
    str(config['hero_subheadline']) ||
    `From planning through finish work, ${branding.name} delivers clean execution across every phase.`;

  return (
    <section className={`bg-background py-14 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="font-body text-sm uppercase tracking-[0.28em] text-primary">
            {serviceArea || 'Core Services'}
          </p>
        </FadeIn>
        <FadeInUp>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                {heroHeadline ? `${heroHeadline} Services` : 'Work tailored to the way you live and build'}
              </h2>
              <p className="mt-4 font-body text-base leading-7 text-muted-foreground md:text-lg">{intro}</p>
            </div>
            <Link
              href="/visualizer"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
            >
              Get Your Free Design Estimate
            </Link>
          </div>
        </FadeInUp>

        <StaggerContainer className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(services as Record<string, unknown>[]).map((service, index) => {
            const imageUrls = Array.isArray(service['image_urls']) ? service['image_urls'] : [];
            const serviceImage = str(imageUrls[0]);
            const title = str(service['name']) || `Service ${index + 1}`;
            const description =
              str(service['description']) || `${branding.name} handles this scope with structured planning and finish-focused execution.`;

            return (
              <StaggerItem key={`${title}-${index}`}>
                <ScaleIn>
                  <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm transition-transform duration-300 hover:scale-[1.02]">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {serviceImage ? (
                        <Image
                          src={serviceImage}
                          alt={title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-heading text-xl font-semibold text-foreground">{title}</h3>
                        <span className="rounded-full bg-muted px-3 py-1 font-body text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="mt-4 flex-1 font-body text-sm leading-6 text-muted-foreground">
                        {description}
                      </p>
                      <div className="mt-6 border-t border-border pt-4">
                        <Link
                          href="/visualizer"
                          className="font-body text-sm font-semibold text-primary transition-colors hover:text-foreground"
                        >
                          Start a design estimate
                        </Link>
                      </div>
                    </div>
                  </article>
                </ScaleIn>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
