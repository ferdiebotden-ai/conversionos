'use client';

import { Star, Briefcase, Clock, Shield } from 'lucide-react';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';
import { FadeIn } from '@/components/motion';

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function TrustBadgeStrip({ config, className }: Props) {
  const metrics = config.trustMetrics;
  if (!metrics) return null;

  const items: { icon: React.ReactNode; value: string; label: string }[] = [];

  if (metrics.google_rating) {
    items.push({
      icon: <Star className="size-5 fill-yellow-400 text-yellow-400" />,
      value: metrics.google_rating,
      label: 'Google Rating',
    });
  }

  if (metrics.years_in_business) {
    const yrs = Number(metrics.years_in_business);
    items.push({
      icon: <Clock className="size-5 text-primary" />,
      value: `${metrics.years_in_business}${yrs === 1 ? ' Year' : '+ Years'}`,
      label: 'In Business',
    });
  }

  if (metrics.projects_completed) {
    items.push({
      icon: <Briefcase className="size-5 text-primary" />,
      value: metrics.projects_completed,
      label: 'Projects Completed',
    });
  }

  if (metrics.licensed_insured) {
    items.push({
      icon: <Shield className="size-5 text-primary" />,
      value: 'Licensed',
      label: '& Insured',
    });
  }

  if (items.length === 0) return null;

  return (
    <FadeIn>
      <section
        className={`border-y border-border bg-muted/20 py-6 md:py-8 ${className ?? ''}`}
      >
        <div className="container mx-auto px-4">
          {/* Desktop: horizontal with dividers */}
          <div className="hidden items-center justify-center gap-0 divide-x divide-border sm:flex">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-8 md:px-12">
                {item.icon}
                <div className="text-left">
                  <div className="text-lg font-bold leading-tight text-foreground">
                    {item.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: 2x2 grid */}
          <div className="grid grid-cols-2 gap-4 sm:hidden">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {item.icon}
                <div>
                  <div className="text-base font-bold leading-tight text-foreground">
                    {item.value}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}
