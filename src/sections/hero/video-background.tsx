'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Phone, Play } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { StaggerContainer, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function VideoBackgroundHero({ branding, config, className }: Props) {
  const posterUrl = config.heroImageUrl || config.aboutImageUrl;

  return (
    <section className={`relative overflow-hidden ${className ?? ''}`}>
      <div className="relative h-[500px] md:h-[600px] lg:h-[650px]">
        {/* Fallback image with play overlay (no videoUrl in CompanyConfig) */}
        {posterUrl ? (
          <>
            <Image
              src={posterUrl}
              alt={`${branding.name} — ${config.heroHeadline || branding.tagline}`}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform hover:scale-110">
                <Play className="size-8 text-white" fill="white" />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/90 via-foreground/70 to-foreground/50" />
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
                    <Link href="/visualizer">Start Your Project</Link>
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
            </StaggerContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
