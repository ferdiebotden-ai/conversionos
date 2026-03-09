'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function SplitImageTextHero({ branding, config, className }: Props) {
  const imageUrl = config.heroImageUrl || config.aboutImageUrl;

  return (
    <section className={`min-h-[500px] px-4 py-16 md:py-20 lg:py-24 ${className ?? ''}`}>
      <div className="container mx-auto">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          {/* Text side */}
          <FadeInUp className="order-1">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {config.heroHeadline || branding.tagline}
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground md:text-xl">
              {config.heroSubheadline ||
                `Quality craftsmanship and integrity in ${branding.city}, ${branding.province} and surrounding areas.`}
            </p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-14 rounded-full px-8 text-lg">
                <Link href="/visualizer">Start Your Project</Link>
              </Button>
              {branding.phone && (
                <a
                  href={`tel:${branding.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-2 text-muted-foreground transition-colours hover:text-foreground"
                >
                  <Phone className="size-4" />
                  <span className="text-base">{branding.phone}</span>
                </a>
              )}
            </div>
          </FadeInUp>

          {/* Image side */}
          <FadeInUp className="order-2">
            {imageUrl ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image
                  src={imageUrl}
                  alt={`${branding.name} — ${config.heroHeadline || branding.tagline}`}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ) : (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-muted" />
            )}
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}
