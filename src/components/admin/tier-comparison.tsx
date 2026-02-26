'use client';

/**
 * Tier Comparison Bar
 * 3-column summary showing Good/Better/Best totals at a glance.
 * [DEV-072 Phase 2]
 */

import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LineItem } from './quote-line-item';

export type TierName = 'good' | 'better' | 'best';

interface TierInfo {
  label: string;
  description: string;
  items: LineItem[];
}

interface TierComparisonProps {
  tiers: Record<TierName, TierInfo>;
  activeTier: TierName;
  onSelectTier: (tier: TierName) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getTierTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0);
}

const TIER_CONFIG: Record<TierName, { displayName: string; finishLabel: string }> = {
  good: { displayName: 'Good', finishLabel: 'Economy' },
  better: { displayName: 'Better', finishLabel: 'Standard' },
  best: { displayName: 'Best', finishLabel: 'Premium' },
};

export function TierComparison({ tiers, activeTier, onSelectTier }: TierComparisonProps) {
  const goodTotal = getTierTotal(tiers.good.items);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(['good', 'better', 'best'] as TierName[]).map((tierName) => {
        const tier = tiers[tierName];
        const config = TIER_CONFIG[tierName];
        const total = getTierTotal(tier.items);
        const isActive = activeTier === tierName;
        const isRecommended = tierName === 'better';
        const percentAboveGood = goodTotal > 0 && tierName !== 'good'
          ? Math.round(((total - goodTotal) / goodTotal) * 100)
          : 0;

        return (
          <button
            key={tierName}
            onClick={() => onSelectTier(tierName)}
            className={cn(
              'relative p-4 rounded-lg border-2 text-left transition-all',
              isActive
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-muted hover:border-primary/30 hover:bg-muted/30',
              isRecommended && !isActive && 'border-primary/20',
            )}
          >
            {isRecommended && (
              <Badge
                variant="outline"
                className="absolute -top-2.5 left-3 bg-primary/10 text-primary border-primary/20 text-[10px]"
              >
                <Star className="h-3 w-3 mr-0.5 fill-primary" />
                Recommended
              </Badge>
            )}

            <div className="space-y-1.5 mt-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{config.displayName}</span>
                <span className="text-xs text-muted-foreground">{config.finishLabel}</span>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-1">
                {tier.description || `${tier.items.length} items`}
              </p>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-lg font-bold">{formatCurrency(total)}</span>
                {percentAboveGood > 0 && (
                  <span className="text-xs text-muted-foreground">+{percentAboveGood}%</span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">{tier.items.length} items</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
