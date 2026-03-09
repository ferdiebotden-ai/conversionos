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

export function CTAInlineCard({ branding, className }: Props) {
  return (
    <section className={`py-8 md:py-12 ${className ?? ''}`}>
      <FadeInUp>
        <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 text-center">
          <h3 className="text-2xl font-bold tracking-tight">
            Ready to Get Started?
          </h3>
          <p className="mt-3 text-muted-foreground">
            Upload a photo of your space and see what {branding.name} can do for
            your home. AI-generated design concepts delivered in minutes.
          </p>
          <div className="mt-6">
            <Button size="lg" asChild>
              <Link href="/visualizer">
                Start Your Project
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </FadeInUp>
    </section>
  );
}
