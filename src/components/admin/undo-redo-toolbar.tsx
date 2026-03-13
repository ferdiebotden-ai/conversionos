'use client';

/**
 * Undo/Redo Toolbar
 * Two-button toolbar for undo/redo in the quote editor.
 * [F12 — Undo/Redo for Quote Editor]
 */

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Undo2, Redo2 } from 'lucide-react';
import { useQuoteEditorStore } from '@/stores/quote-editor-store';

export function UndoRedoToolbar() {
  const undo = useQuoteEditorStore((s) => s.undo);
  const redo = useQuoteEditorStore((s) => s.redo);
  const canUndoVal = useQuoteEditorStore((s) => s.canUndo());
  const canRedoVal = useQuoteEditorStore((s) => s.canRedo());

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={undo}
              disabled={!canUndoVal}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (&#8984;Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={redo}
              disabled={!canRedoVal}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (&#8679;&#8984;Z)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
