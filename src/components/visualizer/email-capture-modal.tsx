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
import { Label } from '@/components/ui/label';
import { Download, Mail, Loader2, Sparkles } from 'lucide-react';
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
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Save email to the visualization
      const response = await fetch('/api/visualizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualizationId,
          email,
          share: false,
          marketingOptIn,
          consentTimestamp: marketingOptIn ? new Date().toISOString() : undefined,
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

  const handleSkip = () => {
    // Allow download without email (less ideal but respects user choice)
    onEmailSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Get Your Visualization</DialogTitle>
          <DialogDescription className="text-center">
            Enter your email to download and we&apos;ll also send you a copy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email-capture">Email address</Label>
            <Input
              id="email-capture"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* CASL-compliant opt-in */}
          <div className="flex items-start gap-3 bg-muted/50 p-3 rounded-lg">
            <input
              type="checkbox"
              id="marketing-optin"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 mt-0.5"
              disabled={isLoading}
            />
            <Label htmlFor="marketing-optin" className="text-sm text-muted-foreground font-normal">
              Send me design inspiration and renovation tips from {branding.name}
              (you can unsubscribe anytime)
            </Label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !email}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send & Download
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isLoading}
              className="w-full text-muted-foreground"
            >
              Skip, just download
            </Button>
          </div>

          {/* Value proposition */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Get exclusive design ideas, early access to our AI tools, and
              special offers for Ontario homeowners.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
