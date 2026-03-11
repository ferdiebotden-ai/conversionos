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

  const heroHeadline = str(config['heroHeadline']) || str(config['hero_headline']);
  const heroSubheadline = str(config['heroSubheadline']) || str(config['hero_subheadline']);
  const heroImageUrl = str(config['heroImageUrl']) || str(config['hero_image_url']);
  const serviceArea = str(config['serviceArea']) || str(config['service_area']);
  const aboutCopy =
    str(config['aboutCopy']) ||
    str(config['aboutText']) ||
    str(config['about_copy']) ||
    str(config['about_text']);
  const services = Array.isArray(config['services']) ? config['services'] : [];

  const eyebrow = serviceArea || branding.address || 'Precision Renovation & Construction';
  const intro =
    heroSubheadline ||
    aboutCopy ||
    `${branding.name} delivers polished construction work with a practical, client-first process.`;
  const featuredServices = services.slice(0, 3) as Record<string, unknown>[];

  return (
    <section
      className={`relative overflow-hidden bg-neutral-950 text-white ${className ?? ''}`}
    >
      <div className="absolute inset-0">
        {heroImageUrl ? (
          <Image src={heroImageUrl} alt={branding.name} fill className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-black/35" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8 lg:py-32">
        <StaggerContainer className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div>
            <FadeIn>
              <p className="font-body text-sm uppercase tracking-[0.3em] text-white/70">{eyebrow}</p>
            </FadeIn>
            <FadeInUp>
              <h1 className="mt-4 max-w-4xl font-heading text-4xl font-bold leading-tight md:text-5xl lg:text-7xl">
                {heroHeadline || branding.name}
              </h1>
            </FadeInUp>
            <FadeInUp>
              <p className="mt-6 max-w-2xl font-body text-base leading-7 text-white/85 md:text-lg">
                {intro}
              </p>
            </FadeInUp>
            <FadeInUp>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/visualizer"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
                >
                  Get Your Free Design Estimate
                </Link>
                {branding.phone && (
                  <a
                    href={`tel:${branding.phone}`}
                    className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors duration-200 hover:bg-white/15"
                  >
                    {branding.phone}
                  </a>
                )}
              </div>
            </FadeInUp>
          </div>

          <ScaleIn>
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur-md">
              <p className="font-body text-xs uppercase tracking-[0.24em] text-white/65">
                Featured Focus
              </p>
              <div className="mt-5 space-y-4">
                {featuredServices.length > 0 ? (
                  featuredServices.map((service, index) => (
                    <StaggerItem key={`${str(service['name'])}-${index}`}>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="font-heading text-lg font-semibold text-white">
                          {str(service['name']) || `Service ${index + 1}`}
                        </p>
                        <p className="mt-2 font-body text-sm leading-6 text-white/75">
                          {str(service['description']) || 'Built around planning, execution, and durable finishes.'}
                        </p>
                      </div>
                    </StaggerItem>
                  ))
                ) : (
                  <StaggerItem>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="font-heading text-lg font-semibold text-white">Built for demanding projects</p>
                      <p className="mt-2 font-body text-sm leading-6 text-white/75">
                        Clear scopes, refined execution, and reliable communication from concept to completion.
                      </p>
                    </div>
                  </StaggerItem>
                )}
              </div>
            </div>
          </ScaleIn>
        </StaggerContainer>
      </div>
    </section>
  );
}
