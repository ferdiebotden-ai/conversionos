'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';

export function ServicesSection({ branding, config: rawConfig, tokens, className }: SectionBaseProps) {
  void tokens;
  const config = rawConfig as unknown as Record<string, unknown>;

  function str(v: unknown): string {
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  }

  function records(v: unknown): Record<string, unknown>[] {
    return Array.isArray(v)
      ? v.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      : [];
  }

  const serviceArea = str(config['serviceArea']) || str(config['service_area']) || branding.address || 'your area';
  const heroImageUrl = str(config['heroImageUrl']) || str(config['hero_image_url']);
  const aboutText = str(config['aboutText']) || str(config['about_text']);
  const aboutCopy = str(config['aboutCopy']) || str(config['about_copy']) || aboutText;
  const services = records(config['services']);

  const fallbackServices = [
    {
      name: 'Custom Home Builds',
      description: 'Ground-up construction managed with clear milestones, tight coordination, and durable finishes.',
      imageUrl: heroImageUrl,
    },
    {
      name: 'Renovations & Additions',
      description: 'Expansions and interior upgrades that improve flow, comfort, and long-term value.',
      imageUrl: '',
    },
    {
      name: 'Concrete & Structural Work',
      description: 'Reliable framing, forming, and foundational work designed for strength and precision.',
      imageUrl: '',
    },
  ];

  const serviceCards = services.length
    ? services.map((service) => {
        const imageUrls = Array.isArray(service['image_urls']) ? service['image_urls'] : [];
        return {
          name: str(service['name']) || 'Construction Service',
          description:
            str(service['description']) || 'Tailored project support with practical planning and detail-focused execution.',
          imageUrl: str(service['imageUrl']) || str(service['image_url']) || str(imageUrls[0]),
        };
      })
    : fallbackServices;

  return (
    <section className={`bg-background py-14 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="flex flex-col gap-6 border-b border-border pb-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-body text-sm uppercase tracking-[0.28em] text-primary">Services</p>
              <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                Practical construction services tailored to {serviceArea}
              </h2>
              <FadeIn>
                <p className="mt-4 max-w-xl font-body text-base leading-7 text-muted-foreground">
                  {aboutCopy ||
                    `${branding.name} supports projects from first concepts through the final build with a focus on quality, communication, and dependable site management.`}
                </p>
              </FadeIn>
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
          {serviceCards.map((service, index) => (
            <StaggerItem key={`${service.name}-${index}`}>
              <article className="group overflow-hidden rounded-[28px] border border-border bg-card shadow-sm transition-transform duration-300 hover:scale-[1.02]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <ScaleIn>
                    <div className="absolute inset-0">
                      {service.imageUrl ? (
                        <Image
                          src={service.imageUrl}
                          alt={service.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/55 to-muted/80" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                    </div>
                  </ScaleIn>
                  <div className="relative flex h-full items-start justify-between p-5">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-900">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-heading text-2xl font-semibold text-foreground">{service.name}</h3>
                  <p className="mt-3 font-body text-base leading-7 text-muted-foreground">{service.description}</p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
