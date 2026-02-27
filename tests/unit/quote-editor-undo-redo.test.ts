/**
 * Quote Editor Undo/Redo Tests
 * Tests for the Zustand store with undo/redo history.
 * [F12 — Undo/Redo for Quote Editor]
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useQuoteEditorStore } from '../../src/stores/quote-editor-store';
import type { LineItem } from '../../src/components/admin/quote-line-item';

function makeItem(overrides?: Partial<LineItem>): LineItem {
  return {
    id: Math.random().toString(36).substring(2, 9),
    description: 'Test item',
    category: 'materials',
    quantity: 1,
    unit: 'ea',
    unit_price: 100,
    total: 100,
    isFromAI: false,
    ...overrides,
  };
}

function initStore(items: LineItem[] = []) {
  useQuoteEditorStore.getState().init({
    lineItems: items,
    tieredLineItems: { good: [], better: [], best: [] },
    tieredDescriptions: {
      good: 'Economy',
      better: 'Standard',
      best: 'Premium',
    },
    tierMode: 'single',
    activeTier: 'better',
    assumptions: 'Test assumptions',
    exclusions: 'Test exclusions',
    contingencyPercent: 10,
  });
}

describe('Quote Editor Store — Undo/Redo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    initStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addItem', () => {
    it('adds an item and allows undo', () => {
      const store = useQuoteEditorStore.getState();
      const item = makeItem({ description: 'Drywall' });
      store.addItem(item);

      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(1);
      expect(useQuoteEditorStore.getState().canUndo()).toBe(true);

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(0);
    });

    it('allows redo after undo', () => {
      const store = useQuoteEditorStore.getState();
      const item = makeItem({ description: 'Drywall' });
      store.addItem(item);

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().canRedo()).toBe(true);

      useQuoteEditorStore.getState().redo();
      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(1);
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Drywall');
    });
  });

  describe('deleteItem', () => {
    it('deletes an item and allows undo to restore it', () => {
      const item = makeItem({ description: 'Flooring' });
      initStore([item]);

      useQuoteEditorStore.getState().deleteItem(0);
      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(0);

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(1);
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Flooring');
    });
  });

  describe('updateItem', () => {
    it('updates an item with debounced history', () => {
      const item = makeItem({ description: 'Original' });
      initStore([item]);

      // Rapid updates (debounced — only one history entry)
      const updated1 = { ...item, description: 'Updated 1' };
      useQuoteEditorStore.getState().updateItem(0, updated1);
      const updated2 = { ...item, description: 'Updated 2' };
      useQuoteEditorStore.getState().updateItem(0, updated2);
      const updated3 = { ...item, description: 'Updated 3' };
      useQuoteEditorStore.getState().updateItem(0, updated3);

      // Should have the latest value
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Updated 3');

      // Single undo should go back to original (debounced = 1 entry)
      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Original');
    });

    it('creates separate history entries when debounce timer expires', () => {
      const item = makeItem({ description: 'Original' });
      initStore([item]);

      // First edit batch
      useQuoteEditorStore.getState().updateItem(0, { ...item, description: 'Batch 1' });
      vi.advanceTimersByTime(1100); // Exceed debounce timeout

      // Second edit batch
      useQuoteEditorStore.getState().updateItem(0, { ...item, description: 'Batch 2' });
      vi.advanceTimersByTime(1100);

      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Batch 2');

      // First undo: back to Batch 1
      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Batch 1');

      // Second undo: back to Original
      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Original');
    });
  });

  describe('duplicateItem', () => {
    it('duplicates and allows undo', () => {
      const item = makeItem({ description: 'Tile' });
      initStore([item]);

      useQuoteEditorStore.getState().duplicateItem(0);
      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(2);
      expect(useQuoteEditorStore.getState().lineItems[1]?.description).toBe('Tile (copy)');

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(1);
    });
  });

  describe('switchTier', () => {
    it('switches tier and allows undo', () => {
      initStore();
      const store = useQuoteEditorStore.getState();
      // Set up tiered mode
      store.init({
        ...useQuoteEditorStore.getState(),
        tierMode: 'tiered',
        activeTier: 'better',
        lineItems: [makeItem({ description: 'Better item' })],
        tieredLineItems: {
          good: [makeItem({ description: 'Good item' })],
          better: [makeItem({ description: 'Better item' })],
          best: [makeItem({ description: 'Best item' })],
        },
      });

      useQuoteEditorStore.getState().switchTier('good');
      expect(useQuoteEditorStore.getState().activeTier).toBe('good');
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Good item');

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().activeTier).toBe('better');
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Better item');
    });
  });

  describe('toggleTierMode', () => {
    it('toggles to tiered and allows undo back to single', () => {
      initStore([makeItem()]);

      const newMode = useQuoteEditorStore.getState().toggleTierMode();
      expect(newMode).toBe('tiered');
      expect(useQuoteEditorStore.getState().tierMode).toBe('tiered');

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().tierMode).toBe('single');
    });
  });

  describe('setAssumptions / setExclusions', () => {
    it('undoes assumption text changes (debounced)', () => {
      initStore();
      expect(useQuoteEditorStore.getState().assumptions).toBe('Test assumptions');

      useQuoteEditorStore.getState().setAssumptions('New assumption 1');
      useQuoteEditorStore.getState().setAssumptions('New assumption 2');

      expect(useQuoteEditorStore.getState().assumptions).toBe('New assumption 2');

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().assumptions).toBe('Test assumptions');
    });

    it('undoes exclusion text changes (debounced)', () => {
      initStore();
      useQuoteEditorStore.getState().setExclusions('New exclusion');

      expect(useQuoteEditorStore.getState().exclusions).toBe('New exclusion');

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().exclusions).toBe('Test exclusions');
    });
  });

  describe('history cap', () => {
    it('caps undo stack at 50 entries', () => {
      initStore();
      // Push 55 items
      for (let i = 0; i < 55; i++) {
        useQuoteEditorStore.getState().addItem(makeItem({ description: `Item ${i}` }));
      }

      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(55);

      // Should be able to undo 50 times but not more
      let undoCount = 0;
      while (useQuoteEditorStore.getState().canUndo()) {
        useQuoteEditorStore.getState().undo();
        undoCount++;
      }
      expect(undoCount).toBe(50);
    });
  });

  describe('redo stack clears on new action after undo', () => {
    it('clears redo after a new mutation following undo', () => {
      initStore();
      const item1 = makeItem({ description: 'Item 1' });
      const item2 = makeItem({ description: 'Item 2' });

      useQuoteEditorStore.getState().addItem(item1);
      useQuoteEditorStore.getState().addItem(item2);

      // Undo once
      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().canRedo()).toBe(true);

      // New action — should clear redo
      const item3 = makeItem({ description: 'Item 3' });
      useQuoteEditorStore.getState().addItem(item3);
      expect(useQuoteEditorStore.getState().canRedo()).toBe(false);
    });
  });

  describe('immediate action flushes pending debounce', () => {
    it('flushes debounce before addItem', () => {
      const item = makeItem({ description: 'Original' });
      initStore([item]);

      // Start a debounced edit
      useQuoteEditorStore.getState().updateItem(0, { ...item, description: 'Editing...' });
      // Timer not yet expired — add a new item (immediate action)
      const newItem = makeItem({ description: 'New item' });
      useQuoteEditorStore.getState().addItem(newItem);

      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(2);
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Editing...');

      // Undo the addItem
      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(1);
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Editing...');

      // Undo the debounced edit
      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Original');
    });
  });

  describe('resetToAI', () => {
    it('resets to AI items and allows undo', () => {
      const manual = makeItem({ description: 'Manual edit' });
      initStore([manual]);

      const aiItem = makeItem({ description: 'AI item', isFromAI: true });
      useQuoteEditorStore.getState().resetToAI(
        [aiItem], null, 'AI assumptions', 'AI exclusions'
      );

      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('AI item');
      expect(useQuoteEditorStore.getState().assumptions).toBe('AI assumptions');

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Manual edit');
      expect(useQuoteEditorStore.getState().assumptions).toBe('Test assumptions');
    });
  });

  describe('insertTemplate', () => {
    it('inserts template items and allows undo', () => {
      initStore([makeItem({ description: 'Existing' })]);

      const tmplItems = [
        makeItem({ description: 'Template 1' }),
        makeItem({ description: 'Template 2' }),
      ];
      useQuoteEditorStore.getState().insertTemplate(tmplItems);

      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(3);

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().lineItems).toHaveLength(1);
      expect(useQuoteEditorStore.getState().lineItems[0]?.description).toBe('Existing');
    });
  });

  describe('setContingency', () => {
    it('undoes contingency changes (debounced)', () => {
      initStore();
      expect(useQuoteEditorStore.getState().contingencyPercent).toBe(10);

      useQuoteEditorStore.getState().setContingency(15);
      expect(useQuoteEditorStore.getState().contingencyPercent).toBe(15);

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().contingencyPercent).toBe(10);
    });
  });

  describe('init', () => {
    it('clears history on init', () => {
      initStore();
      useQuoteEditorStore.getState().addItem(makeItem());
      useQuoteEditorStore.getState().addItem(makeItem());
      expect(useQuoteEditorStore.getState().canUndo()).toBe(true);

      // Re-init should clear history
      initStore();
      expect(useQuoteEditorStore.getState().canUndo()).toBe(false);
      expect(useQuoteEditorStore.getState().canRedo()).toBe(false);
    });
  });

  describe('canUndo / canRedo', () => {
    it('returns false when stacks are empty', () => {
      initStore();
      expect(useQuoteEditorStore.getState().canUndo()).toBe(false);
      expect(useQuoteEditorStore.getState().canRedo()).toBe(false);
    });

    it('returns true after actions', () => {
      initStore();
      useQuoteEditorStore.getState().addItem(makeItem());
      expect(useQuoteEditorStore.getState().canUndo()).toBe(true);
      expect(useQuoteEditorStore.getState().canRedo()).toBe(false);

      useQuoteEditorStore.getState().undo();
      expect(useQuoteEditorStore.getState().canUndo()).toBe(false);
      expect(useQuoteEditorStore.getState().canRedo()).toBe(true);
    });
  });
});
