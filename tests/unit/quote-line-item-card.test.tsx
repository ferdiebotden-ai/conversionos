/**
 * QuoteLineItemCard Unit Tests
 * Collapsed/expanded rendering, field editing, actions, read-only mode, badges.
 * [DEV-054 M3]
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuoteLineItemCard } from '@/components/admin/quote-line-item-card';
import type { LineItem } from '@/components/admin/quote-line-item';

// --- Helpers ---

function makeItem(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: 'item-1',
    description: 'Kitchen demolition and removal',
    category: 'labor',
    quantity: 2,
    unit: 'days',
    unit_price: 150,
    total: 300,
    ...overrides,
  };
}

function renderCard(
  props: Partial<Parameters<typeof QuoteLineItemCard>[0]> = {}
) {
  const defaultProps = {
    item: makeItem(),
    onChange: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    ...props,
  };

  return {
    ...render(<QuoteLineItemCard {...defaultProps} />),
    ...defaultProps,
  };
}

// --- Tests ---

describe('QuoteLineItemCard', () => {
  describe('collapsed rendering', () => {
    it('renders description text', () => {
      renderCard();
      expect(screen.getByText('Kitchen demolition and removal')).toBeDefined();
    });

    it('renders category badge', () => {
      renderCard();
      expect(screen.getByText('Labour')).toBeDefined();
    });

    it('renders formatted total', () => {
      renderCard();
      expect(screen.getByText('$300.00')).toBeDefined();
    });

    it('renders quantity x unit price line', () => {
      renderCard();
      // "2 × $150.00/days"
      const qtyLine = screen.getByText(/2\s+×\s+\$150\.00\/days/);
      expect(qtyLine).toBeDefined();
    });

    it('does not show edit fields when collapsed', () => {
      renderCard();
      expect(screen.queryByTestId('card-edit-fields')).toBeNull();
    });
  });

  describe('expand/collapse', () => {
    it('expands on click to show edit fields', () => {
      renderCard();

      // Click the collapsed content area
      fireEvent.click(screen.getByText('Kitchen demolition and removal'));

      expect(screen.getByTestId('card-edit-fields')).toBeDefined();
      expect(screen.getByLabelText('Item description')).toBeDefined();
      expect(screen.getByLabelText('Quantity')).toBeDefined();
      expect(screen.getByLabelText('Unit price')).toBeDefined();
      expect(screen.getByLabelText('Unit')).toBeDefined();
    });

    it('collapses when Done button is clicked', () => {
      renderCard();

      // Expand
      fireEvent.click(screen.getByText('Kitchen demolition and removal'));
      expect(screen.getByTestId('card-edit-fields')).toBeDefined();

      // Click Done
      fireEvent.click(screen.getByTestId('card-done-button'));
      expect(screen.queryByTestId('card-edit-fields')).toBeNull();
    });

    it('expands on keyboard Enter', () => {
      renderCard();

      const collapsedDiv = screen.getByText('Kitchen demolition and removal').closest('[role="button"]');
      expect(collapsedDiv).not.toBeNull();
      fireEvent.keyDown(collapsedDiv!, { key: 'Enter' });
      expect(screen.getByTestId('card-edit-fields')).toBeDefined();
    });
  });

  describe('field editing', () => {
    it('calls onChange with updated description', () => {
      const { onChange } = renderCard();

      // Expand
      fireEvent.click(screen.getByText('Kitchen demolition and removal'));

      const input = screen.getByLabelText('Item description');
      fireEvent.change(input, { target: { value: 'Updated description' } });

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Updated description' })
      );
    });

    it('recalculates total when quantity changes', () => {
      const { onChange } = renderCard();

      // Expand
      fireEvent.click(screen.getByText('Kitchen demolition and removal'));

      const qtyInput = screen.getByLabelText('Quantity');
      fireEvent.change(qtyInput, { target: { value: '5' } });

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5, total: 750 })
      );
    });

    it('recalculates total when unit price changes', () => {
      const { onChange } = renderCard();

      // Expand
      fireEvent.click(screen.getByText('Kitchen demolition and removal'));

      const priceInput = screen.getByLabelText('Unit price');
      fireEvent.change(priceInput, { target: { value: '200' } });

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ unit_price: 200, total: 400 })
      );
    });

    it('marks AI item as modified on first edit', () => {
      const item = makeItem({ isFromAI: true, isModified: false });
      const { onChange } = renderCard({ item });

      // Expand
      fireEvent.click(screen.getByText('Kitchen demolition and removal'));

      const input = screen.getByLabelText('Item description');
      fireEvent.change(input, { target: { value: 'Changed' } });

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ isModified: true })
      );
    });
  });

  describe('actions', () => {
    it('calls onDelete when delete button clicked', () => {
      const { onDelete } = renderCard();

      const deleteBtn = screen.getByLabelText('Remove item');
      fireEvent.click(deleteBtn);

      expect(onDelete).toHaveBeenCalledOnce();
    });

    it('calls onDuplicate when duplicate button clicked', () => {
      const { onDuplicate } = renderCard();

      const dupBtn = screen.getByLabelText('Duplicate item');
      fireEvent.click(dupBtn);

      expect(onDuplicate).toHaveBeenCalledOnce();
    });

    it('hides duplicate button when onDuplicate not provided', () => {
      renderCard({ onDuplicate: undefined });
      expect(screen.queryByLabelText('Duplicate item')).toBeNull();
    });
  });

  describe('read-only mode', () => {
    it('does not expand on click when read-only', () => {
      renderCard({ isReadOnly: true });

      fireEvent.click(screen.getByText('Kitchen demolition and removal'));
      expect(screen.queryByTestId('card-edit-fields')).toBeNull();
    });

    it('hides delete and duplicate buttons when read-only', () => {
      renderCard({ isReadOnly: true });

      expect(screen.queryByLabelText('Remove item')).toBeNull();
      expect(screen.queryByLabelText('Duplicate item')).toBeNull();
    });
  });

  describe('badges', () => {
    it('shows AI badge for AI-generated items', () => {
      const item = makeItem({ isFromAI: true, confidenceScore: 0.85 });
      renderCard({ item });

      expect(screen.getByText(/AI 85%/)).toBeDefined();
    });

    it('shows Adjusted badge for modified AI items', () => {
      const item = makeItem({ isFromAI: true, isModified: true });
      renderCard({ item });

      expect(screen.getByText('Adjusted')).toBeDefined();
    });

    it('shows contractor price match badge', () => {
      renderCard({ contractorPriceMatch: true });

      expect(screen.getByText('Using your prices')).toBeDefined();
    });

    it('does not show contractor price match badge when false', () => {
      renderCard({ contractorPriceMatch: false });

      expect(screen.queryByText('Using your prices')).toBeNull();
    });
  });

  describe('transparency card', () => {
    it('shows breakdown button for AI items with transparency data', () => {
      const item = makeItem({
        isFromAI: true,
        transparencyData: {
          roomAnalysis: 'Standard kitchen area',
          materialSelection: 'Mid-range materials',
          costBreakdown: [
            { label: 'Labour', quantity: 2, unit: 'days', unitCost: 150, total: 300, source: 'ontario_db' as const },
          ],
          markupApplied: { percent: 20, amount: 60, label: 'Standard markup' },
          dataSource: 'Ontario pricing DB',
          totalBeforeMarkup: 300,
          totalAfterMarkup: 360,
        },
      });
      renderCard({ item });

      expect(screen.getByLabelText('Show price breakdown')).toBeDefined();
    });

    it('toggles transparency card on button click', () => {
      const item = makeItem({
        isFromAI: true,
        transparencyData: {
          roomAnalysis: 'Standard kitchen area',
          materialSelection: 'Mid-range materials',
          costBreakdown: [
            { label: 'Labour', quantity: 2, unit: 'days', unitCost: 150, total: 300, source: 'ontario_db' as const },
          ],
          markupApplied: { percent: 20, amount: 60, label: 'Standard markup' },
          dataSource: 'Ontario pricing DB',
          totalBeforeMarkup: 300,
          totalAfterMarkup: 360,
        },
      });
      renderCard({ item });

      // Not visible initially
      expect(screen.queryByText('Standard kitchen area')).toBeNull();

      // Click breakdown button
      fireEvent.click(screen.getByLabelText('Show price breakdown'));

      // Now visible
      expect(screen.getByText('Standard kitchen area')).toBeDefined();
    });
  });

  describe('touch targets', () => {
    it('action buttons have minimum 40px height', () => {
      renderCard();

      const deleteBtn = screen.getByLabelText('Remove item');
      const dupBtn = screen.getByLabelText('Duplicate item');

      // Check class includes h-10 (40px)
      expect(deleteBtn.className).toContain('h-10');
      expect(dupBtn.className).toContain('h-10');
    });
  });

  describe('category colours', () => {
    it('uses labour colour for labor category', () => {
      const { container } = renderCard({ item: makeItem({ category: 'labor' }) });
      const card = container.querySelector('[data-testid="line-item-card"]');
      expect(card?.className).toContain('border-l-orange-500');
    });

    it('uses materials colour for materials category', () => {
      const { container } = renderCard({ item: makeItem({ category: 'materials' }) });
      const card = container.querySelector('[data-testid="line-item-card"]');
      expect(card?.className).toContain('border-l-blue-500');
    });
  });
});
