'use client';

/**
 * Enhanced Cost Display
 * 4-level expandable cost breakdown for renovation estimates.
 *
 * Level 1 (always visible): Total range + finish level + timeline
 * Level 2 (click to expand): Breakdown by category (materials, labour, permits, contingency)
 * Level 3 (deep expand): Individual line items with source citations
 * Level 4: "Ask Emma why" button for chat integration
 *
 * Tier + mode gated — wraps existing CostRangeIndicator logic.
 */

import { useState } from 'react';
import {
  formatCAD,
  BUSINESS_CONSTANTS,
} from '@/lib/ai/knowledge/pricing-data';
import type { TradeLabourEstimate } from '@/lib/ai/trade-labour-estimator';
import type { PermitRequirement } from '@/lib/ai/knowledge/ontario-permit-rules';
import type { TimelineEstimate } from '@/lib/ai/timeline-estimator';
import type { IdentifiedMaterial } from '@/lib/ai/concept-pricing';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  ChevronDown,
  ChevronRight,
  Clock,
  Wrench,
  ShieldCheck,
  HardHat,
  MessageCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnhancedCostDisplayProps {
  /** Total estimate range (after contingency + HST) */
  totalRange: { low: number; high: number };
  /** Finish level label */
  finishLevel: 'economy' | 'standard' | 'premium';
  /** Timeline estimate (optional — only shown when available) */
  timeline?: TimelineEstimate;
  /** Materials identified from the concept image */
  materials?: IdentifiedMaterial[];
  /** Labour breakdown by trade */
  labourEstimates?: TradeLabourEstimate[];
  /** Permit requirements */
  permits?: PermitRequirement[];
  /** Material cost subtotal */
  materialCostRange?: { low: number; high: number };
  /** Labour cost subtotal */
  labourCostRange?: { low: number; high: number };
  /** Callback when user clicks "Ask Emma" */
  onAskEmma?: (question: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Finish level display labels
// ---------------------------------------------------------------------------

const FINISH_LABELS: Record<string, string> = {
  economy: 'Economy',
  standard: 'Standard',
  premium: 'Premium',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnhancedCostDisplay({
  totalRange,
  finishLevel,
  timeline,
  materials,
  labourEstimates,
  permits,
  materialCostRange,
  labourCostRange,
  onAskEmma,
  className,
}: EnhancedCostDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLineItems, setShowLineItems] = useState(false);

  const timelineLabel = timeline
    ? formatTimelineLabel(timeline.totalDays)
    : undefined;

  const contingencyLow = Math.round(totalRange.low * BUSINESS_CONSTANTS.contingencyRate / (1 + BUSINESS_CONSTANTS.contingencyRate) / (1 + BUSINESS_CONSTANTS.hstRate));
  const contingencyHigh = Math.round(totalRange.high * BUSINESS_CONSTANTS.contingencyRate / (1 + BUSINESS_CONSTANTS.contingencyRate) / (1 + BUSINESS_CONSTANTS.hstRate));
  const hstLow = Math.round(totalRange.low * BUSINESS_CONSTANTS.hstRate / (1 + BUSINESS_CONSTANTS.hstRate));
  const hstHigh = Math.round(totalRange.high * BUSINESS_CONSTANTS.hstRate / (1 + BUSINESS_CONSTANTS.hstRate));

  return (
    <div className={`rounded-lg border border-border bg-card overflow-hidden ${className ?? ''}`}>
      {/* ─── Level 1: Summary Bar ─── */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colours text-left">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {formatCAD(totalRange.low)} – {formatCAD(totalRange.high)}{' '}
              <span className="font-normal text-muted-foreground">+ HST</span>
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {FINISH_LABELS[finishLevel] ?? finishLevel}
              </Badge>
              {timelineLabel && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {timelineLabel}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        </CollapsibleTrigger>

        {/* ─── Level 2: Category Breakdown ─── */}
        <CollapsibleContent>
          <Separator />
          <div className="px-4 py-3 space-y-3">
            {/* Materials */}
            {materialCostRange && (materialCostRange.low > 0 || materialCostRange.high > 0) && (
              <CategoryRow
                icon={<Wrench className="w-3.5 h-3.5" />}
                label="Materials"
                low={materialCostRange.low}
                high={materialCostRange.high}
              />
            )}

            {/* Labour by trade */}
            {labourCostRange && (labourCostRange.low > 0 || labourCostRange.high > 0) && (
              <CategoryRow
                icon={<HardHat className="w-3.5 h-3.5" />}
                label="Labour"
                low={labourCostRange.low}
                high={labourCostRange.high}
                {...(labourEstimates && labourEstimates.length > 0
                  ? { detail: `${labourEstimates.length} trades` }
                  : {})}
              />
            )}

            {/* Permits */}
            {permits && permits.length > 0 && (
              <CategoryRow
                icon={<ShieldCheck className="w-3.5 h-3.5" />}
                label="Permits"
                low={permits.reduce((s, p) => s + p.estimatedCost.low, 0)}
                high={permits.reduce((s, p) => s + p.estimatedCost.high, 0)}
                detail={`${permits.length} permit${permits.length > 1 ? 's' : ''} required`}
              />
            )}

            {/* Contingency */}
            <CategoryRow
              label={`Contingency (${Math.round(BUSINESS_CONSTANTS.contingencyRate * 100)}%)`}
              low={contingencyLow}
              high={contingencyHigh}
            />

            {/* HST */}
            <CategoryRow
              label={`HST (${Math.round(BUSINESS_CONSTANTS.hstRate * 100)}%)`}
              low={hstLow}
              high={hstHigh}
            />

            {/* ─── Level 3: Line Items Toggle ─── */}
            {(materials && materials.length > 0) || (labourEstimates && labourEstimates.length > 0) ? (
              <>
                <Separator />
                <Collapsible open={showLineItems} onOpenChange={setShowLineItems}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                    {showLineItems ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    View detailed line items
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="mt-2 space-y-3">
                      {/* Material line items */}
                      {materials && materials.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Materials
                          </p>
                          <div className="space-y-1">
                            {materials
                              .filter((m) => m.confidence >= 0.5)
                              .map((m, i) => (
                                <LineItem
                                  key={`mat-${i}`}
                                  name={m.name}
                                  quantity={m.estimatedQuantity}
                                  range={m.priceRange}
                                  unit={m.unit}
                                  source="Ontario contractor averages 2024-2026"
                                />
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Labour line items */}
                      {labourEstimates && labourEstimates.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Labour by Trade
                          </p>
                          <div className="space-y-1">
                            {labourEstimates.map((l, i) => (
                              <div
                                key={`lab-${i}`}
                                className="flex items-baseline justify-between text-xs"
                              >
                                <span className="text-foreground">
                                  {l.trade}{' '}
                                  <span className="text-muted-foreground">
                                    ({l.hours.low}–{l.hours.high} hrs at{' '}
                                    {formatCAD(l.rate.low)}–{formatCAD(l.rate.high)}/hr)
                                  </span>
                                </span>
                                <span className="font-medium text-foreground ml-2 shrink-0">
                                  {formatCAD(l.cost.low)} – {formatCAD(l.cost.high)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Permit line items */}
                      {permits && permits.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Permits
                          </p>
                          <div className="space-y-1">
                            {permits.map((p, i) => (
                              <div
                                key={`permit-${i}`}
                                className="flex items-baseline justify-between text-xs"
                              >
                                <span className="text-foreground">
                                  {capitalise(p.type)} permit{' '}
                                  <span className="text-muted-foreground">
                                    — {p.reason}
                                  </span>
                                </span>
                                <span className="font-medium text-foreground ml-2 shrink-0">
                                  {formatCAD(p.estimatedCost.low)} – {formatCAD(p.estimatedCost.high)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            ) : null}

            {/* ─── Level 4: Ask Emma ─── */}
            {onAskEmma && (
              <>
                <Separator />
                <button
                  type="button"
                  onClick={() =>
                    onAskEmma(
                      `Can you explain the cost breakdown for this ${FINISH_LABELS[finishLevel]?.toLowerCase() ?? finishLevel} renovation estimate of ${formatCAD(totalRange.low)} – ${formatCAD(totalRange.high)}?`,
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <MessageCircle className="w-3 h-3" />
                  Ask Emma why this costs what it does
                </button>
              </>
            )}

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground leading-tight">
              Preliminary AI estimate based on room type, visible materials, and Ontario
              contractor averages. Final pricing requires an in-person assessment.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryRow({
  icon,
  label,
  low,
  high,
  detail,
}: {
  icon?: React.ReactNode;
  label: string;
  low: number;
  high: number;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
        {detail && (
          <span className="text-xs text-muted-foreground/70">({detail})</span>
        )}
      </span>
      <span className="font-medium text-foreground">
        {formatCAD(low)} – {formatCAD(high)}
      </span>
    </div>
  );
}

function LineItem({
  name,
  quantity,
  range,
  unit,
  source,
}: {
  name: string;
  quantity: string;
  range: { low: number; high: number };
  unit: string;
  source: string;
}) {
  return (
    <div className="text-xs">
      <div className="flex items-baseline justify-between">
        <span className="text-foreground">{name}</span>
        <span className="font-medium text-foreground ml-2 shrink-0">
          {formatCAD(range.low)} – {formatCAD(range.high)}
          <span className="font-normal text-muted-foreground"> {unit}</span>
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {quantity} — {source}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimelineLabel(days: { low: number; high: number }): string {
  if (days.high <= 5) {
    return `${days.low}–${days.high} days`;
  }

  const weeksLow = Math.ceil(days.low / 5);
  const weeksHigh = Math.ceil(days.high / 5);

  if (weeksLow === weeksHigh) {
    return `~${weeksLow} week${weeksLow > 1 ? 's' : ''}`;
  }

  return `${weeksLow}–${weeksHigh} weeks`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
