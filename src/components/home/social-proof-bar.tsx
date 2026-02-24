'use client';

/**
 * Social Proof Bar
 * Horizontal trust metrics bar between hero and visualizer teaser.
 * Data from company_profile.trust_metrics in admin_settings.
 */

import { Star, Calendar, FolderCheck, ShieldCheck } from 'lucide-react';

interface TrustMetrics {
  google_rating?: string;
  projects_completed?: string;
  years_in_business?: string;
  licensed_insured?: boolean;
}

interface SocialProofBarProps {
  metrics: TrustMetrics;
}

export function SocialProofBar({ metrics }: SocialProofBarProps) {
  const items: { icon: React.ReactNode; value: string; label: string }[] = [];

  if (metrics.google_rating) {
    items.push({
      icon: <Star className="size-5 fill-yellow-400 text-yellow-400" />,
      value: metrics.google_rating,
      label: 'Google Rating',
    });
  }

  if (metrics.years_in_business) {
    items.push({
      icon: <Calendar className="size-5 text-primary" />,
      value: `${metrics.years_in_business} ${Number(metrics.years_in_business) === 1 ? 'Year' : 'Years'}`,
      label: 'In Business',
    });
  }

  if (metrics.projects_completed) {
    items.push({
      icon: <FolderCheck className="size-5 text-primary" />,
      value: metrics.projects_completed,
      label: 'Projects',
    });
  }

  if (metrics.licensed_insured) {
    items.push({
      icon: <ShieldCheck className="size-5 text-primary" />,
      value: 'Licensed',
      label: '& Insured',
    });
  }

  // Only show when 3+ metrics available
  if (items.length < 3) return null;

  return (
    <div className="border-y border-border bg-muted/20 py-6">
      <div className="container mx-auto px-4">
        {/* Desktop: flex row with dividers */}
        <div className="hidden sm:flex items-center justify-center gap-0 divide-x divide-border">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-8">
              {item.icon}
              <div className="text-left">
                <div className="text-lg font-bold text-foreground leading-tight">{item.value}</div>
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
                <div className="text-base font-bold text-foreground leading-tight">{item.value}</div>
                <div className="text-[11px] text-muted-foreground">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
