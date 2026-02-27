'use client';

/**
 * Quote Line Item Card
 * Mobile-friendly card layout for line items in the quote editor.
 * Drop-in alternative to the table-based QuoteLineItem, sharing the same props.
 * [DEV-054 M3]
 */

import { useState, memo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trash2, Sparkles, Copy, Pencil, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransparencyCard } from './transparency-card';
import type { LineItem, LineItemCategory } from './quote-line-item';

const CATEGORY_OPTIONS: { value: LineItemCategory; label: string }[] = [
  { value: 'materials', label: 'Materials' },
  { value: 'labor', label: 'Labour' },
  { value: 'contract', label: 'Contract' },
  { value: 'permit', label: 'Permit' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'allowances', label: 'Allowances' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLOURS: Record<LineItemCategory, string> = {
  materials: 'border-l-blue-500',
  labor: 'border-l-orange-500',
  contract: 'border-l-violet-500',
  permit: 'border-l-rose-500',
  equipment: 'border-l-cyan-500',
  allowances: 'border-l-emerald-500',
  other: 'border-l-gray-400',
};

const CATEGORY_BADGE_COLOURS: Record<LineItemCategory, string> = {
  materials: 'bg-blue-50 text-blue-700 border-blue-200',
  labor: 'bg-orange-50 text-orange-700 border-orange-200',
  contract: 'bg-violet-50 text-violet-700 border-violet-200',
  permit: 'bg-rose-50 text-rose-700 border-rose-200',
  equipment: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  allowances: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

interface QuoteLineItemCardProps {
  item: LineItem;
  onChange: (item: LineItem) => void;
  onDelete: () => void;
  onDuplicate?: (() => void) | undefined;
  isReadOnly?: boolean | undefined;
  contractorPriceMatch?: boolean | undefined;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(value);
}

function getConfidenceColor(score: number): string {
  if (score >= 0.8) return 'bg-green-50 text-green-700 border-green-200';
  if (score >= 0.6) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-orange-50 text-orange-700 border-orange-200';
}

function getCategoryLabel(category: LineItemCategory): string {
  return CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}

function QuoteLineItemCardInner({
  item,
  onChange,
  onDelete,
  onDuplicate,
  isReadOnly = false,
  contractorPriceMatch = false,
}: QuoteLineItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showTransparency, setShowTransparency] = useState(false);

  const handleFieldChange = useCallback(
    <K extends keyof LineItem>(field: K, value: LineItem[K]) => {
      const updated = { ...item, [field]: value };

      if (field === 'quantity' || field === 'unit_price') {
        updated.total = updated.quantity * updated.unit_price;
      }

      if (item.isFromAI && !item.isModified) {
        updated.isModified = true;
      }

      onChange(updated);
    },
    [item, onChange]
  );

  // Visual state
  const itemState = item.isFromAI && item.isModified
    ? 'modified'
    : item.isFromAI
      ? 'ai'
      : 'manual';

  const stateStyles = {
    ai: 'bg-purple-50/50',
    modified: 'bg-amber-50/50',
    manual: '',
  };

  return (
    <Card
      className={cn(
        'relative border-l-4 py-3 px-4 gap-2 transition-all duration-200',
        CATEGORY_COLOURS[item.category],
        stateStyles[itemState]
      )}
      data-testid="line-item-card"
    >
      {/* Collapsed view — always visible */}
      <div
        className="flex flex-col gap-1.5"
        onClick={() => {
          if (!isReadOnly && !expanded) setExpanded(true);
        }}
        role={!isReadOnly && !expanded ? 'button' : undefined}
        tabIndex={!isReadOnly && !expanded ? 0 : undefined}
        onKeyDown={(e) => {
          if (!isReadOnly && !expanded && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setExpanded(true);
          }
        }}
      >
        {/* Top row: category badge + total */}
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="outline"
            className={cn('text-xs shrink-0', CATEGORY_BADGE_COLOURS[item.category])}
          >
            {getCategoryLabel(item.category)}
          </Badge>
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-semibold text-base tabular-nums">
              {formatCurrency(item.total)}
            </span>
            {/* AI / Adjusted badges */}
            {item.isFromAI && !item.isModified && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0',
                  item.confidenceScore != null
                    ? getConfidenceColor(item.confidenceScore)
                    : 'bg-purple-50 text-purple-600 border-purple-200'
                )}
              >
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                AI{item.confidenceScore != null ? ` ${Math.round(item.confidenceScore * 100)}%` : ''}
              </Badge>
            )}
            {item.isFromAI && item.isModified && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200"
              >
                <Pencil className="h-2.5 w-2.5 mr-0.5" />
                Adjusted
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm leading-snug">{item.description}</p>

        {/* Quantity line */}
        <p className="text-xs text-muted-foreground tabular-nums">
          {item.quantity} &times; {formatCurrency(item.unit_price)}/{item.unit || 'ea'}
        </p>

        {/* Contractor price match */}
        {contractorPriceMatch && (
          <Badge
            variant="outline"
            className="self-start text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            Using your prices
          </Badge>
        )}
      </div>

      {/* Expanded editing fields */}
      {expanded && !isReadOnly && (
        <div className="mt-3 pt-3 border-t border-border space-y-3" data-testid="card-edit-fields">
          {/* Description — full width */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Description
            </label>
            <Input
              value={item.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Item description"
              aria-label="Item description"
              className="min-h-[44px]"
            />
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Category
              </label>
              {item.category === 'other' ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={item.customCategory || ''}
                    onChange={(e) => handleFieldChange('customCategory', e.target.value)}
                    placeholder="Category..."
                    className="min-h-[44px]"
                    aria-label="Custom category"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={() => handleFieldChange('category', 'materials')}
                    aria-label="Switch to category dropdown"
                  >
                    &times;
                  </Button>
                </div>
              ) : (
                <Select
                  value={item.category}
                  onValueChange={(value) =>
                    handleFieldChange('category', value as LineItemCategory)
                  }
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Unit
              </label>
              <Input
                value={item.unit}
                onChange={(e) => handleFieldChange('unit', e.target.value)}
                placeholder="ea"
                aria-label="Unit"
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* Quantity + Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Quantity
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.quantity}
                onChange={(e) =>
                  handleFieldChange('quantity', parseFloat(e.target.value) || 0)
                }
                aria-label="Quantity"
                className="min-h-[44px]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Unit Price ($)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price}
                onChange={(e) =>
                  handleFieldChange('unit_price', parseFloat(e.target.value) || 0)
                }
                aria-label="Unit price"
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* Done button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full min-h-[44px]"
            onClick={() => setExpanded(false)}
            data-testid="card-done-button"
          >
            <Check className="h-4 w-4 mr-1" />
            Done
          </Button>
        </div>
      )}

      {/* Action bar — always visible */}
      <div className="flex items-center gap-1 mt-1 pt-1.5 border-t border-border/50">
        {/* Transparency toggle */}
        {item.isFromAI && item.transparencyData && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-10 text-xs gap-1',
              showTransparency
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
            onClick={() => setShowTransparency(!showTransparency)}
            aria-label="Show price breakdown"
          >
            <Info className="h-4 w-4" />
            Breakdown
          </Button>
        )}

        <div className="flex-1" />

        {/* Duplicate */}
        {onDuplicate && !isReadOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            onClick={onDuplicate}
            aria-label="Duplicate item"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}

        {/* Delete */}
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Transparency card (collapsible) */}
      {showTransparency && item.transparencyData && (
        <div className="mt-1">
          <TransparencyCard data={item.transparencyData} />
        </div>
      )}
    </Card>
  );
}

export const QuoteLineItemCard = memo(QuoteLineItemCardInner);
