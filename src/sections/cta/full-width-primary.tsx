'use client';

import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function CTAFullWidthPrimary({ branding, className }: Props) {
  return (
    <section className={`bg-primary py-10 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto max-w-4xl px-4 text-center">
        <FadeInUp>
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
            Ready to See Your Renovation?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/85">
            Upload a photo of your space and get AI-generated design concepts in minutes.
            {branding.name && ` ${branding.name} makes it easy.`}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button variant="secondary" size="lg" asChild>
              <Link href="/visualizer">
                Start Your Project
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              variant="link"
              size="lg"
              className="text-primary-foreground underline-offset-4 hover:text-primary-foreground/80"
              asChild
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
