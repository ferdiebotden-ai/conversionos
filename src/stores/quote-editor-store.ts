'use client';

/**
 * Quote Editor Store — Zustand store with undo/redo history
 * Reuses the proven history-manager pattern from the CAD drawing store.
 * [F12 — Undo/Redo for Quote Editor]
 */

import { create } from 'zustand';
import type { LineItem } from '@/components/admin/quote-line-item';
import {
  createHistoryState,
  pushHistory as pushHistoryFn,
  popUndo,
  popRedo,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
  type HistoryState,
} from '@/components/cad/state/history-manager';

/** The subset of editor state that is undoable */
export interface UndoableState {
  lineItems: LineItem[];
  assumptions: string;
  exclusions: string;
  contingencyPercent: number;
}

interface StoreState extends UndoableState {
  history: HistoryState;
  /** Pending debounce timer for text-field snapshots */
  _pendingSnapshotTimer: ReturnType<typeof setTimeout> | null;
}

interface StoreActions {
  // Line item mutations
  addItem: (item: LineItem) => void;
  updateItem: (index: number, item: LineItem) => void;
  deleteItem: (index: number) => void;
  duplicateItem: (index: number) => void;

  // Text field mutations (debounced history push)
  setAssumptions: (value: string) => void;
  setExclusions: (value: string) => void;
  setContingency: (value: number) => void;

  // Bulk operations (immediate history push)
  resetToAI: (items: LineItem[], assumptions: string, exclusions: string) => void;
  loadFromAI: (items: LineItem[], assumptions: string, exclusions: string) => void;
  insertTemplate: (items: LineItem[]) => void;
  addScopeGapItem: (item: LineItem) => void;
  setLineItems: (items: LineItem[]) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Initialisation (no history push)
  init: (state: UndoableState) => void;
}

function snapshotUndoable(state: StoreState): string {
  return JSON.stringify({
    lineItems: state.lineItems,
    assumptions: state.assumptions,
    exclusions: state.exclusions,
    contingencyPercent: state.contingencyPercent,
  });
}

function restoreSnapshot(snapshot: string): UndoableState | null {
  try {
    return JSON.parse(snapshot);
  } catch {
    console.error('Failed to restore quote editor snapshot');
    return null;
  }
}

const DEBOUNCE_MS = 1000;

export const useQuoteEditorStore = create<StoreState & StoreActions>()(
  (set, get) => {
    /** Flush any pending debounced snapshot before an immediate action */
    function flushPending() {
      const state = get();
      if (state._pendingSnapshotTimer) {
        clearTimeout(state._pendingSnapshotTimer);
        set({ _pendingSnapshotTimer: null });
      }
    }

    /** Push current state to history, then apply the mutation */
    function pushAndSet(updates: Partial<StoreState>) {
      const state = get();
      flushPending();
      const snap = snapshotUndoable(state);
      set({
        ...updates,
        history: pushHistoryFn(state.history, snap),
      });
    }

    /** For debounced text fields: schedule a snapshot push after DEBOUNCE_MS of inactivity */
    function debouncedPushAndSet(updates: Partial<StoreState>) {
      const state = get();

      // If no pending timer, push current state as a snapshot now (start of edit batch)
      if (!state._pendingSnapshotTimer) {
        const snap = snapshotUndoable(state);
        const timer = setTimeout(() => {
          set({ _pendingSnapshotTimer: null });
        }, DEBOUNCE_MS);
        set({
          ...updates,
          history: pushHistoryFn(state.history, snap),
          _pendingSnapshotTimer: timer,
        });
      } else {
        // Already in a debounce batch — just apply the update, extend the timer
        clearTimeout(state._pendingSnapshotTimer);
        const timer = setTimeout(() => {
          set({ _pendingSnapshotTimer: null });
        }, DEBOUNCE_MS);
        set({
          ...updates,
          _pendingSnapshotTimer: timer,
        });
      }
    }

    return {
      // Initial state
      lineItems: [],
      assumptions: '',
      exclusions: '',
      contingencyPercent: 10,
      history: createHistoryState(),
      _pendingSnapshotTimer: null,

      // --- Line item mutations ---
      addItem: (item) => {
        const state = get();
        pushAndSet({ lineItems: [...state.lineItems, item] });
      },

      updateItem: (index, item) => {
        const state = get();
        const newItems = [...state.lineItems];
        newItems[index] = item;
        // Use debounced push for item edits (descriptions, prices typed character by character)
        debouncedPushAndSet({ lineItems: newItems });
      },

      deleteItem: (index) => {
        const state = get();
        pushAndSet({ lineItems: state.lineItems.filter((_, i) => i !== index) });
      },

      duplicateItem: (index) => {
        const state = get();
        const itemToDuplicate = state.lineItems[index];
        if (!itemToDuplicate) return;
        const dup: LineItem = {
          ...itemToDuplicate,
          id: Math.random().toString(36).substring(2, 9),
          description: `${itemToDuplicate.description} (copy)`,
          isFromAI: false,
          isModified: false,
          isAccepted: false,
        };
        const newItems = [...state.lineItems];
        newItems.splice(index + 1, 0, dup);
        pushAndSet({ lineItems: newItems });
      },

      // --- Text field mutations (debounced) ---
      setAssumptions: (value) => {
        debouncedPushAndSet({ assumptions: value });
      },

      setExclusions: (value) => {
        debouncedPushAndSet({ exclusions: value });
      },

      setContingency: (value) => {
        debouncedPushAndSet({ contingencyPercent: value });
      },

      // --- Bulk operations ---
      resetToAI: (items, assumptions, exclusions) => {
        pushAndSet({
          lineItems: items,
          assumptions,
          exclusions,
        });
      },

      loadFromAI: (items, assumptions, exclusions) => {
        pushAndSet({
          lineItems: items,
          assumptions,
          exclusions,
        });
      },

      insertTemplate: (items) => {
        const state = get();
        pushAndSet({ lineItems: [...state.lineItems, ...items] });
      },

      addScopeGapItem: (item) => {
        const state = get();
        pushAndSet({ lineItems: [...state.lineItems, item] });
      },

      setLineItems: (items) => {
        pushAndSet({ lineItems: items });
      },

      // --- History ---
      undo: () => {
        const state = get();
        flushPending();
        const currentSnap = snapshotUndoable(state);
        const result = popUndo(state.history, currentSnap);
        if (!result) return;
        const restored = restoreSnapshot(result.snapshot);
        if (!restored) return;
        set({
          ...restored,
          history: result.history,
        });
      },

      redo: () => {
        const state = get();
        flushPending();
        const currentSnap = snapshotUndoable(state);
        const result = popRedo(state.history, currentSnap);
        if (!result) return;
        const restored = restoreSnapshot(result.snapshot);
        if (!restored) return;
        set({
          ...restored,
          history: result.history,
        });
      },

      canUndo: () => historyCanUndo(get().history),
      canRedo: () => historyCanRedo(get().history),

      // --- Initialisation (no history push) ---
      init: (state) => {
        set({
          ...state,
          history: createHistoryState(),
          _pendingSnapshotTimer: null,
        });
      },
    };
  }
);
