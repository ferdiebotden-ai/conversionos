'use client';

/**
 * Microphone Permission Dialog
 * Pre-permission prompt before requesting mic access.
 * - granted → skipped entirely (connect directly)
 * - prompt → friendly dialog explaining why mic is needed
 * - denied → recovery instructions (browser settings)
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PersonaAvatar } from './persona-avatar';
import { Mic, Settings } from 'lucide-react';
import type { PageContext } from '@/lib/ai/personas/types';

interface MicrophonePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: PageContext;
  permissionState: 'prompt' | 'denied';
  onAllow: () => void;
}

export function MicrophonePermissionDialog({
  open,
  onOpenChange,
  context,
  permissionState,
  onAllow,
}: MicrophonePermissionDialogProps) {
  const name = 'Emma';

  if (permissionState === 'denied') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Microphone access blocked</DialogTitle>
            <DialogDescription>
              Your browser has blocked microphone access. To talk to {name}, you&apos;ll
              need to re-enable it in your browser settings.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              How to fix this:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click the lock/info icon in your browser&apos;s address bar</li>
              <li>Find &ldquo;Microphone&rdquo; in the permissions list</li>
              <li>Change it to &ldquo;Allow&rdquo;</li>
              <li>Refresh this page and try again</li>
            </ol>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // permissionState === 'prompt'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center sm:items-start">
          <PersonaAvatar context={context} size="lg" state="static" />
          <DialogTitle>{name} needs your microphone</DialogTitle>
          <DialogDescription>
            To have a voice conversation, we need access to your microphone.
            You can end the call at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onAllow}>
            <Mic className="h-4 w-4 mr-2" />
            Allow &amp; Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
