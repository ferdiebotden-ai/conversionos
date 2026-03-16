'use client';

/**
 * Email Capture Modal
 * Captures email before allowing download (CASL-compliant)
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2 } from 'lucide-react';
import { useBranding } from '@/components/branding-provider';

interface EmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visualizationId: string;
  onEmailSubmitted: () => void;
  favouritedIndices?: Set<number> | undefined;
}

export function EmailCaptureModal({
  open,
  onOpenChange,
  visualizationId,
  onEmailSubmitted,
  favouritedIndices,
}: EmailCaptureModalProps) {
  const branding = useBranding();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/visualizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualizationId,
          email,
          share: false,
          favouritedConceptIndices: favouritedIndices?.size
            ? Array.from(favouritedIndices)
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      onEmailSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Email Your Designs</DialogTitle>
          <DialogDescription className="text-center">
            We&apos;ll send your concepts straight to your inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Input
            id="email-capture"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            disabled={isLoading}
            autoFocus
          />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !email}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send to My Email
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By submitting, you consent to receive this email from {branding.name}.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
