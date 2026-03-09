'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function FullBleedOverlayHero({ branding, config, className }: Props) {
  const badges = config.trustBadges.length > 0
    ? config.trustBadges
    : config.certifications.map(c => ({ label: c, iconHint: 'award' }));

  return (
    <section className={`relative overflow-hidden ${className ?? ''}`}>
      <div className="relative h-[500px] md:h-[600px] lg:h-[650px]">
        {config.heroImageUrl ? (
          <Image
            src={config.heroImageUrl}
            alt={`${branding.name} — ${config.heroHeadline || branding.tagline}`}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-primary/40" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.15) 100%)',
          }}
        />
        <div className="relative z-10 flex h-full items-center">
          <div className="container mx-auto px-4">
            <StaggerContainer className="mx-auto max-w-3xl text-center">
              <StaggerItem>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {config.heroHeadline || branding.tagline}
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-6 text-lg leading-8 text-white/85 md:text-xl">
                  {config.heroSubheadline ||
                    `Quality craftsmanship and integrity in ${branding.city}, ${branding.province} and surrounding areas.`}
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Button asChild size="lg" className="h-14 w-full rounded-full px-8 text-lg sm:w-auto">
                    <Link href="/visualizer">Visualise Your Dream Space</Link>
                  </Button>
                  {branding.phone && (
                    <a
                      href={`tel:${branding.phone.replace(/\D/g, '')}`}
                      className="flex items-center gap-2 text-white/80 transition-colours hover:text-white"
                    >
                      <Phone className="size-4" />
                      <span className="text-base">{branding.phone}</span>
                    </a>
                  )}
                </div>
              </StaggerItem>
              {badges.length > 0 && (
                <StaggerItem>
                  <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/80">
                    {badges.slice(0, 3).map((badge, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span>{badge.label}</span>
                      </div>
                    ))}
                  </div>
                </StaggerItem>
              )}
            </StaggerContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
