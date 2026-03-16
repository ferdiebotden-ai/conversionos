'use client';

/**
 * Step 3: Style & Finish Level
 * Captures design style preference and finish level (economy/standard/premium).
 * Uses the 10-style visual pattern from style-selector.tsx and PER_SQFT_RANGES
 * for $/sqft context.
 */

import { cn } from '@/lib/utils';
import { Check, Palette } from 'lucide-react';
import { PER_SQFT_RANGES, formatCAD } from '@/lib/ai/knowledge/pricing-data';
import type { DesignStyle } from '@/components/visualizer/style-selector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FinishLevelSelection = 'economy' | 'standard' | 'premium';

export interface StyleFinishData {
  style: DesignStyle | null;
  finishLevel: FinishLevelSelection;
}

interface StepStyleFinishProps {
  value: StyleFinishData;
  onChange: (value: StyleFinishData) => void;
  roomType: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STYLE_OPTIONS: { id: DesignStyle; label: string; image: string }[] = [
  { id: 'modern', label: 'Modern', image: '/images/styles/modern.png' },
  { id: 'traditional', label: 'Traditional', image: '/images/styles/traditional.png' },
  { id: 'farmhouse', label: 'Farmhouse', image: '/images/styles/farmhouse.png' },
  { id: 'industrial', label: 'Industrial', image: '/images/styles/industrial.png' },
  { id: 'minimalist', label: 'Minimalist', image: '/images/styles/minimalist.png' },
  { id: 'contemporary', label: 'Contemporary', image: '/images/styles/contemporary.png' },
  { id: 'transitional', label: 'Transitional', image: '/images/styles/transitional.png' },
  { id: 'scandinavian', label: 'Scandinavian', image: '/images/styles/scandinavian.png' },
  { id: 'coastal', label: 'Coastal', image: '/images/styles/coastal.png' },
  { id: 'mid_century_modern', label: 'Mid-Century Modern', image: '/images/styles/mid_century_modern.png' },
];

const FINISH_OPTIONS: { id: FinishLevelSelection; label: string; description: string }[] = [
  { id: 'economy', label: 'Economy', description: 'Builder-grade materials, functional focus' },
  { id: 'standard', label: 'Standard', description: 'Quality materials, balanced value' },
  { id: 'premium', label: 'Premium', description: 'High-end finishes, designer selections' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepStyleFinish({
  value,
  onChange,
  roomType,
  className,
}: StepStyleFinishProps) {
  const sqftRanges = PER_SQFT_RANGES[roomType];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Style selection — compact 5x2 grid */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Design Style</h3>
        <div className="grid grid-cols-5 gap-2">
          {STYLE_OPTIONS.map((opt) => {
            const isSelected = value.style === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...value, style: opt.id })}
                className={cn(
                  'group relative rounded-lg overflow-hidden transition-all aspect-square',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                  'hover:ring-2 hover:ring-primary/50',
                  isSelected && 'ring-2 ring-primary',
                )}
              >
                <img
                  src={opt.image}
                  alt={`${opt.label} style`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <span className="text-[10px] font-medium text-white leading-tight">
                    {opt.label}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Finish level */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Finish Level</h3>
        <div className="grid grid-cols-3 gap-2">
          {FINISH_OPTIONS.map((opt) => {
            const isSelected = value.finishLevel === opt.id;
            const range = sqftRanges?.[opt.id];

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...value, finishLevel: opt.id })}
                className={cn(
                  'flex flex-col items-start px-3 py-3 rounded-lg border-2 transition-all text-left',
                  'hover:border-primary/50',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border',
                )}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {opt.description}
                </span>
                {range && (
                  <span className="text-xs font-medium text-primary mt-1">
                    {formatCAD(range.min)}–{formatCAD(range.max)}/sqft
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
