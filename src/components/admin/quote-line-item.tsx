'use client';

/**
 * Quote Line Item
 * Individual editable row in the quote editor
 * Enhanced with duplicate, adjust, and visual state indicators
 * [DEV-054]
 */

import { useState, memo } from 'react';
import { Input } from '@/components/ui/input';
import { isNonEmptyString } from '@/lib/utils/validation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Trash2, Sparkles, Copy, GripVertical, Pencil, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransparencyBreakdown } from '@/lib/schemas/transparency';
import { TransparencyCard } from './transparency-card';

export type LineItemCategory = 'materials' | 'labor' | 'contract' | 'permit' | 'equipment' | 'allowances' | 'other';

export interface LineItem {
  id: string;
  description: string;
  category: LineItemCategory;
  customCategory?: string | undefined;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  isFromAI?: boolean | undefined;
  isModified?: boolean | undefined;
  isAccepted?: boolean | undefined;
  confidenceScore?: number | undefined;
  aiReasoning?: string | undefined;
  transparencyData?: TransparencyBreakdown | undefined;
  costBeforeMarkup?: number | undefined;
  markupPercent?: number | undefined;
}

const CATEGORY_OPTIONS = [
  { value: 'materials', label: 'Materials' },
  { value: 'labor', label: 'Labour' },
  { value: 'contract', label: 'Contract' },
  { value: 'permit', label: 'Permit' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'allowances', label: 'Allowances' },
  { value: 'other', label: 'Other' },
];

interface QuoteLineItemProps {
  item: LineItem;
  onChange: (item: LineItem) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  isDraggable?: boolean;
}

function QuoteLineItemInner({
  item,
  onChange,
  onDelete,
  onDuplicate,
  isDraggable = false,
}: QuoteLineItemProps) {
  const [showTransparency, setShowTransparency] = useState(false);

  // V1: Inline validation
  const validationErrors = {
    description: !isNonEmptyString(item.description, 5) ? 'Description must be at least 5 characters' : null,
    unit_price: item.unit_price <= 0 ? 'Unit price must be greater than $0' : null,
    quantity: item.quantity <= 0 ? 'Quantity must be greater than 0' : null,
  };

  function handleFieldChange<K extends keyof LineItem>(
    field: K,
    value: LineItem[K]
  ) {
    const updated = { ...item, [field]: value };

    // Recalculate total when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      updated.total = updated.quantity * updated.unit_price;
    }

    // Mark as modified if it was from AI
    if (item.isFromAI && !item.isModified) {
      updated.isModified = true;
    }

    onChange(updated);
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value);
  }

  // Determine the visual state
  const getItemState = () => {
    if (item.isFromAI && item.isModified) return 'modified';
    if (item.isFromAI) return 'ai';
    return 'manual';
  };

  const itemState = getItemState();

  const stateStyles = {
    'ai': 'bg-purple-50/50 border-l-2 border-l-purple-400',
    'modified': 'bg-amber-50/50 border-l-2 border-l-amber-400',
    'manual': '',
  };

  function getConfidenceColor(score: number): string {
    if (score >= 0.8) return 'bg-green-50 text-green-700 border-green-200';
    if (score >= 0.6) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-orange-50 text-orange-700 border-orange-200';
  }

  return (
    <TooltipProvider>
      <><tr className={cn('group transition-colors', stateStyles[itemState])}>
        {/* Drag handle (if draggable) */}
        {isDraggable && (
          <td className="p-2 w-8">
            <div className="cursor-grab opacity-0 group-hover:opacity-50 hover:opacity-100">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </td>
        )}

        {/* Description */}
        <td className="p-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5 min-w-[200px]">
              <Input
                value={item.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Item description"
                className={cn('min-w-[200px]', validationErrors.description && item.description.length > 0 && 'border-red-400 focus-visible:ring-red-400')}
                aria-label="Item description"
                aria-invalid={!!validationErrors.description && item.description.length > 0}
              />
              {validationErrors.description && item.description.length > 0 && (
                <span className="text-xs text-red-500">{validationErrors.description}</span>
              )}
            </div>
            {/* Status badges */}
            {item.isFromAI && !item.isModified && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-xs",
                      item.confidenceScore != null
                        ? getConfidenceColor(item.confidenceScore)
                        : "bg-purple-50 text-purple-600 border-purple-200"
                    )}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI{item.confidenceScore != null ? ` ${Math.round(item.confidenceScore * 100)}%` : ''}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{item.aiReasoning || 'AI-generated item'}</p>
                  <p className="mt-1 text-[10px] opacity-70">AI confidence this estimate is accurate based on project scope and Ontario pricing data</p>
                </TooltipContent>
              </Tooltip>
            )}
            {item.isFromAI && item.isModified && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-xs bg-amber-50 text-amber-600 border-amber-200"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Adjusted
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>AI item modified by contractor</TooltipContent>
              </Tooltip>
            )}
          </div>
        </td>

      {/* Category */}
      <td className="p-2">
        {item.category === 'other' ? (
          <div className="flex items-center gap-1">
            <Input
              value={item.customCategory || ''}
              onChange={(e) => handleFieldChange('customCategory', e.target.value)}
              placeholder="Category..."
              className="w-[100px]"
              aria-label="Custom category"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleFieldChange('category', 'materials')}
              aria-label="Switch to category dropdown"
            >
              ×
            </Button>
          </div>
        ) : (
          <Select
            value={item.category}
            onValueChange={(value) =>
              handleFieldChange('category', value as LineItem['category'])
            }
          >
            <SelectTrigger className="w-[120px]">
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
      </td>

      {/* Quantity */}
      <td className="p-2">
        <div className="flex flex-col gap-0.5">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.quantity}
            onChange={(e) =>
              handleFieldChange('quantity', parseFloat(e.target.value) || 0)
            }
            className={cn('w-[80px]', validationErrors.quantity && 'border-red-400 focus-visible:ring-red-400')}
            aria-label="Quantity"
            aria-invalid={!!validationErrors.quantity}
          />
          {validationErrors.quantity && (
            <span className="text-xs text-red-500">{'> 0'}</span>
          )}
        </div>
      </td>

      {/* Unit */}
      <td className="p-2">
        <Input
          value={item.unit}
          onChange={(e) => handleFieldChange('unit', e.target.value)}
          placeholder="ea"
          className="w-[80px]"
          aria-label="Unit"
        />
      </td>

      {/* Unit Price */}
      <td className="p-2">
        <div className="flex flex-col gap-0.5">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={item.unit_price}
            onChange={(e) =>
              handleFieldChange('unit_price', parseFloat(e.target.value) || 0)
            }
            className={cn('w-[120px]', validationErrors.unit_price && 'border-red-400 focus-visible:ring-red-400')}
            aria-label="Unit price"
            aria-invalid={!!validationErrors.unit_price}
          />
          {validationErrors.unit_price && (
            <span className="text-xs text-red-500">{'> $0'}</span>
          )}
        </div>
      </td>

        {/* Total (read-only) */}
        <td className="p-2 text-right font-medium">{formatCurrency(item.total)}</td>

        {/* Actions */}
        <td className="p-2">
          <div className="flex items-center gap-1">
            {/* F4: Transparency info button — always visible for AI items */}
            {item.isFromAI && item.transparencyData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 transition-opacity",
                      showTransparency
                        ? "text-primary opacity-100"
                        : "text-primary/70 hover:text-primary opacity-50 hover:opacity-100"
                    )}
                    onClick={() => setShowTransparency(!showTransparency)}
                    aria-label="Show price breakdown"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>How this price was calculated</TooltipContent>
              </Tooltip>
            )}

            {/* M1: Touch-visible action buttons — hover on desktop, always on touch devices */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
              {/* Duplicate button */}
              {onDuplicate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={onDuplicate}
                      aria-label="Duplicate item"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Duplicate item</TooltipContent>
                </Tooltip>
              )}

              {/* Delete button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={onDelete}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove item</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </td>
      </tr>
      {showTransparency && item.transparencyData && (
        <tr>
          <td colSpan={isDraggable ? 8 : 7} className="p-0">
            <TransparencyCard data={item.transparencyData} />
          </td>
        </tr>
      )}
      </>
    </TooltipProvider>
  );
}

// P1: Custom comparator for memo — only re-render on meaningful changes
export function lineItemMemoComparator(
  prev: QuoteLineItemProps,
  next: QuoteLineItemProps
): boolean {
  return (
    prev.item.id === next.item.id &&
    prev.item.description === next.item.description &&
    prev.item.quantity === next.item.quantity &&
    prev.item.unit_price === next.item.unit_price &&
    prev.item.category === next.item.category &&
    prev.item.isModified === next.item.isModified &&
    prev.isDraggable === next.isDraggable
  );
}

export const QuoteLineItem = memo(QuoteLineItemInner, lineItemMemoComparator);
