'use client';

/**
 * Regenerate Quote Dialog
 * Standalone dialog extracted from ai-quote-suggestions for use in the default-accepted flow.
 * Allows contractor to provide optional guidance before regenerating the AI quote.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, Loader2 } from 'lucide-react';

interface RegenerateQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate: (guidance?: string) => Promise<void>;
  isRegenerating: boolean;
}

export function RegenerateQuoteDialog({
  open,
  onOpenChange,
  onRegenerate,
  isRegenerating,
}: RegenerateQuoteDialogProps) {
  const [guidance, setGuidance] = useState('');

  async function handleRegenerate() {
    await onRegenerate(guidance.trim() || undefined);
    onOpenChange(false);
    setGuidance('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate AI Quote</DialogTitle>
          <DialogDescription>
            Optionally provide guidance to help the AI generate a better quote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="e.g., 'Include higher-end materials', 'The customer mentioned they want engineered hardwood', 'Add more detail for electrical work'"
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to regenerate with the same inputs, or provide specific guidance.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="bg-primary hover:bg-primary/90"
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Quote
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
