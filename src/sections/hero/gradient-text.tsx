'use client';

import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { Button } from '@/components/ui/button';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function GradientTextHero({ branding, config, className }: Props) {
  return (
    <section className={`bg-muted/30 px-4 py-24 md:py-32 lg:py-40 ${className ?? ''}`}>
      <div className="container mx-auto">
        <FadeInUp className="mx-auto max-w-5xl text-center">
          <h1 className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-6xl font-black tracking-tight text-transparent md:text-7xl lg:text-8xl">
            {config.heroHeadline || branding.tagline}
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground md:text-xl">
            {config.heroSubheadline ||
              `Serving ${branding.city}, ${branding.province} with quality craftsmanship.`}
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/visualizer">Start Your Project</Link>
            </Button>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
