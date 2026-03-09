'use client';

import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function EditorialCenteredHero({ branding, config, className }: Props) {
  return (
    <section
      className={`bg-primary px-4 py-24 md:py-32 lg:py-40 ${className ?? ''}`}
    >
      <div className="container mx-auto">
        <FadeInUp className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-primary-foreground lg:text-7xl">
            {config.heroHeadline || branding.tagline}
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-xl leading-8 text-primary-foreground/80 md:text-2xl">
            {config.heroSubheadline ||
              `Serving ${branding.city}, ${branding.province} and surrounding communities with quality craftsmanship.`}
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-14 rounded-full px-8 text-lg"
            >
              <Link href="/visualizer">Visualise Your Dream Space</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 rounded-full border-primary-foreground/30 px-8 text-lg text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/contact">Get in Touch</Link>
            </Button>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
