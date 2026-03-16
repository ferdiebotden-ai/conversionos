'use client';

/**
 * Quote Line Items Layout
 * Switches between table layout (desktop) and card layout (mobile <768px).
 * Drop-in wrapper for the quote editor's line items section.
 * [DEV-054 M3]
 */

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { QuoteLineItem, type LineItem } from './quote-line-item';
import { QuoteLineItemCard } from './quote-line-item-card';
import { useMediaQuery } from '@/hooks/use-media-query';

interface QuoteLineItemsLayoutProps {
  items: LineItem[];
  onChangeItem: (index: number, item: LineItem) => void;
  onDeleteItem: (index: number) => void;
  onDuplicateItem: (index: number) => void;
  isReadOnly?: boolean | undefined;
  contractorPriceMatches?: Set<string> | undefined;
}

export function QuoteLineItemsLayout({
  items,
  onChangeItem,
  onDeleteItem,
  onDuplicateItem,
  isReadOnly = false,
  contractorPriceMatches,
}: QuoteLineItemsLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isMobile) {
    return (
      <div className="space-y-3" data-testid="line-items-mobile">
        {items.map((item, index) => (
          <QuoteLineItemCard
            key={item.id}
            item={item}
            onChange={(updated) => onChangeItem(index, updated)}
            onDelete={() => onDeleteItem(index)}
            onDuplicate={() => onDuplicateItem(index)}
            isReadOnly={isReadOnly}
            contractorPriceMatch={contractorPriceMatches?.has(item.description)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="line-items-desktop">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Description</TableHead>
            <TableHead className="w-[120px]">Category</TableHead>
            <TableHead className="w-[80px]">Qty</TableHead>
            <TableHead className="w-[80px]">Unit</TableHead>
            <TableHead className="w-[120px]">Unit Price</TableHead>
            <TableHead className="text-right w-[120px]">Total</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <QuoteLineItem
              key={item.id}
              item={item}
              onChange={(updated) => onChangeItem(index, updated)}
              onDelete={() => onDeleteItem(index)}
              onDuplicate={() => onDuplicateItem(index)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
