'use client';

/**
 * Category Markup Settings
 * Table UI for configuring per-category markups with live margin calculation.
 * [DEV-072 Phase 2]
 */

import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import {
  type CategoryMarkupsConfig,
  CATEGORY_LABELS,
  markupToMargin,
} from '@/lib/pricing/category-markups';

interface CategoryMarkupSettingsProps {
  markups: CategoryMarkupsConfig;
  onChange: (category: keyof CategoryMarkupsConfig, value: number) => void;
}

export function CategoryMarkupSettings({ markups, onChange }: CategoryMarkupSettingsProps) {
  const categories = Object.keys(CATEGORY_LABELS) as (keyof CategoryMarkupsConfig)[];

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
        <span>Category</span>
        <span>Markup %</span>
        <TooltipProvider>
          <span className="flex items-center gap-1">
            Margin %
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Markup is added to cost. Margin is the percentage of selling price.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Example: 25% markup = 20% margin
                </p>
              </TooltipContent>
            </Tooltip>
          </span>
        </TooltipProvider>
      </div>

      {/* Category rows */}
      {categories.map((category) => {
        const markup = markups[category];
        const margin = markupToMargin(markup);

        return (
          <div key={category} className="grid grid-cols-3 gap-4 items-center">
            <span className="text-sm">{CATEGORY_LABELS[category]}</span>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={markup}
              onChange={(e) => onChange(category, parseFloat(e.target.value) || 0)}
              className="h-8 w-24"
              aria-label={`${CATEGORY_LABELS[category]} markup percentage`}
            />
            <span className="text-sm text-muted-foreground tabular-nums">
              {margin.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
