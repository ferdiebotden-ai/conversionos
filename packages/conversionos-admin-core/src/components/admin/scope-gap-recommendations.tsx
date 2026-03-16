'use client';

/**
 * Scope Gap Recommendations
 * Collapsible section showing AI-detected missing items with "Add to Quote" actions.
 * [DEV-072 Phase 2]
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Lightbulb, AlertTriangle, Info, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScopeGap } from '@/lib/ai/scope-gap-rules';

interface ScopeGapRecommendationsProps {
  gaps: ScopeGap[];
  onAddItem: (gap: ScopeGap) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ScopeGapRecommendations({ gaps, onAddItem }: ScopeGapRecommendationsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [addedRuleIds, setAddedRuleIds] = useState<Set<string>>(new Set());

  if (gaps.length === 0) return null;

  const warningCount = gaps.filter((g) => g.severity === 'warning').length;
  const infoCount = gaps.filter((g) => g.severity === 'info').length;

  function handleAddItem(gap: ScopeGap) {
    onAddItem(gap);
    setAddedRuleIds((prev) => new Set([...prev, gap.ruleId]));
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-amber-50/50 border border-amber-200/30 hover:bg-amber-50/80 transition-colors">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          <span className="font-medium text-sm">AI Recommendations</span>
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
            {gaps.length}
          </Badge>
          {warningCount > 0 && (
            <span className="text-xs text-amber-600">
              {warningCount} important
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2">
        {gaps.map((gap) => {
          const isAdded = addedRuleIds.has(gap.ruleId);
          const SeverityIcon = gap.severity === 'warning' ? AlertTriangle : Info;
          const severityColor = gap.severity === 'warning' ? 'text-amber-600' : 'text-blue-500';
          const borderColor = gap.severity === 'warning' ? 'border-amber-200/50' : 'border-blue-200/50';

          return (
            <div
              key={gap.ruleId}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-all',
                borderColor,
                isAdded && 'opacity-50 bg-muted/30',
              )}
            >
              <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
                <SeverityIcon className={cn('h-4 w-4', severityColor)} />
                <span className={cn('text-xs font-medium', severityColor)}>
                  {gap.severity === 'warning' ? 'Warning' : 'Suggestion'}
                </span>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm">{gap.message}</p>
                <p className="text-xs text-muted-foreground">
                  Estimated: {formatCurrency(gap.estimatedCostLow)} – {formatCurrency(gap.estimatedCostHigh)}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddItem(gap)}
                disabled={isAdded}
                className="shrink-0"
              >
                {isAdded ? (
                  <>Added</>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
