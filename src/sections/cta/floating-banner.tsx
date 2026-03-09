'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTier } from '@/components/tier-provider';
import { canAccess } from '@/lib/entitlements';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function CTAFloatingBanner({ branding, className }: Props) {
  const [isVisible, setIsVisible] = useState(true);
  const { tier } = useTier();
  const hasQuoteEngine = canAccess(tier, 'ai_quote_engine');

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-primary text-primary-foreground ${className ?? ''}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <p className="text-sm font-medium sm:text-base">
          {branding.name} &mdash; See your renovation before it begins
        </p>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={hasQuoteEngine ? '/visualizer' : '/contact'}>
              {hasQuoteEngine ? 'Get Started' : 'Contact Us'}
            </Link>
          </Button>
          <button
            onClick={() => setIsVisible(false)}
            className="rounded-full p-1.5 hover:bg-primary-foreground/20"
            aria-label="Close banner"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
