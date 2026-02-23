'use client';

/**
 * Cost Range Indicator
 * Shows an estimated cost range below visualization results.
 * Tier + mode gated:
 *   - Elevate: never shown (no pricing_display entitlement)
 *   - Accelerate/Dominate: shown based on quote_assistance config
 *     - mode 'none': not rendered
 *     - mode 'range': shows range snapped to configured band
 *     - mode 'estimate': shows midpoint estimate with disclaimer
 */

import { useState, useEffect } from 'react';
import { useTier } from '@/components/tier-provider';
import {
  calculateCostEstimate,
  snapToRangeBand,
  formatCAD,
} from '@/lib/ai/knowledge/pricing-data';
import type { QuoteAssistanceConfig, QuoteAssistanceMode } from '@/lib/quote-assistance';
import { DollarSign, Info } from 'lucide-react';

interface CostRangeIndicatorProps {
  roomType: string;
  /** Estimated sqft from photo analysis or form data */
  sqft?: number;
  /** Finish level inferred from style or form data */
  finishLevel?: 'economy' | 'standard' | 'premium';
  className?: string;
}

export function CostRangeIndicator({
  roomType,
  sqft,
  finishLevel = 'standard',
  className,
}: CostRangeIndicatorProps) {
  const { tier, canAccess } = useTier();
  const [config, setConfig] = useState<QuoteAssistanceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch quote assistance config once on mount
  useEffect(() => {
    if (!canAccess('pricing_display')) {
      setLoading(false);
      return;
    }

    fetch('/api/admin/quote-assistance')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.config) {
          setConfig(data.config);
        }
      })
      .catch(() => {
        // Silently fail — no pricing shown
      })
      .finally(() => setLoading(false));
  }, [canAccess]);

  // Gate: no pricing_display entitlement → don't render
  if (!canAccess('pricing_display')) return null;

  // Loading state — don't flash content
  if (loading) return null;

  // No config or mode is 'none' → don't render
  if (!config || config.mode === 'none') return null;

  // Calculate cost estimate
  const estimate = calculateCostEstimate(roomType, finishLevel, sqft);
  if (!estimate) return null;

  return (
    <CostDisplay
      mode={config.mode}
      rangeBand={config.rangeBand}
      rangeLow={estimate.totalLow}
      rangeHigh={estimate.totalHigh}
      midpoint={Math.round((estimate.totalLow + estimate.totalHigh) / 2)}
      className={className}
    />
  );
}

/** Inner display component — pure render, no data fetching */
function CostDisplay({
  mode,
  rangeBand,
  rangeLow,
  rangeHigh,
  midpoint,
  className,
}: {
  mode: QuoteAssistanceMode;
  rangeBand: number;
  rangeLow: number;
  rangeHigh: number;
  midpoint: number;
  className?: string | undefined;
}) {
  if (mode === 'range') {
    const snapped = snapToRangeBand(rangeLow, rangeHigh, rangeBand);
    return (
      <div className={`flex items-center gap-3 rounded-lg bg-muted/60 border border-border px-4 py-3 ${className ?? ''}`}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
          <DollarSign className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            Estimated: {formatCAD(snapped.low)} – {formatCAD(snapped.high)} + HST
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on typical Ontario renovation costs for this room type and style
          </p>
        </div>
        <div className="shrink-0" title="Preliminary estimate based on room type, size, and finish level">
          <Info className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (mode === 'estimate') {
    return (
      <div className={`flex items-center gap-3 rounded-lg bg-muted/60 border border-border px-4 py-3 ${className ?? ''}`}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
          <DollarSign className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            AI estimate: ~{formatCAD(midpoint)} + HST
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preliminary AI estimate. Final pricing requires an in-person assessment.
          </p>
        </div>
        <div className="shrink-0" title="This is an AI-generated preliminary estimate">
          <Info className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return null;
}
