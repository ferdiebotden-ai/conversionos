'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeInUp } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useTier } from '@/components/tier-provider';
import { canAccess } from '@/lib/entitlements';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function CTASplitWithImage({ branding, config, className }: Props) {
  const { tier } = useTier();
  const hasQuoteEngine = canAccess(tier, 'ai_quote_engine');
  const imageUrl = config.aboutImageUrl || config.heroImageUrl;

  return (
    <section className={`bg-muted/30 py-12 md:py-20 ${className ?? ''}`}>
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2">
        <FadeInUp>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Let&apos;s Bring Your Vision to Life
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See what your renovation could look like before any work begins.
            Upload a photo and get AI-generated design concepts in minutes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={hasQuoteEngine ? '/visualizer' : '/contact'}>
                {hasQuoteEngine ? 'Start Your Project' : 'Get in Touch'}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/contact">
                {hasQuoteEngine ? 'Get in Touch' : 'Contact Us'}
              </Link>
            </Button>
          </div>
        </FadeInUp>

        {imageUrl ? (
          <FadeInUp>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={imageUrl}
                alt={`${branding.name} project`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeInUp>
        ) : (
          <div className="aspect-[4/3] rounded-2xl bg-muted" />
        )}
      </div>
    </section>
  );
}
