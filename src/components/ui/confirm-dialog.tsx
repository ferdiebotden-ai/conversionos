'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Optional confirmation checkbox text — user must check before confirming */
  confirmationText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  /** Optional list items to display between description and actions */
  listItems?: string[];
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  confirmationText,
  onConfirm,
  onCancel,
  listItems,
}: ConfirmDialogProps) {
  const [checked, setChecked] = React.useState(false);

  // Reset checkbox when dialog opens/closes
  React.useEffect(() => {
    if (!open) setChecked(false);
  }, [open]);

  const requiresCheckbox = !!confirmationText;
  const canConfirm = !requiresCheckbox || checked;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {listItems && listItems.length > 0 && (
          <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
            {listItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        {confirmationText && (
          <label className="flex items-start gap-3 cursor-pointer py-2">
            <Checkbox
              checked={checked}
              onCheckedChange={(val) => setChecked(val === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              {confirmationText}
            </span>
          </label>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={cn(
              destructive &&
                'bg-destructive text-white hover:bg-destructive/90',
              !canConfirm && 'opacity-50 cursor-not-allowed'
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
