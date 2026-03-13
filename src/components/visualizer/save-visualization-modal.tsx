'use client';

/**
 * Save Visualization Modal
 * Email capture for saving and sharing visualizations
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
import { Mail, Share2, Check, Copy, Loader2 } from 'lucide-react';

interface SaveVisualizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visualizationId: string;
  onSaved?: (shareUrl: string) => void;
}

export function SaveVisualizationModal({
  open,
  onOpenChange,
  visualizationId,
  onSaved,
}: SaveVisualizationModalProps) {
  const [email, setEmail] = useState('');
  const [shareEnabled, setShareEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!email) {
      setError('Please enter your email address');
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
          share: shareEnabled,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await response.json();
      setSuccess(true);
      setShareUrl(data.shareUrl);
      onSaved?.(data.shareUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save visualization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      // Reset state after closing
      setTimeout(() => {
        setEmail('');
        setSuccess(false);
        setShareUrl(null);
        setError(null);
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle>Save Your Visualization</DialogTitle>
              <DialogDescription>
                Enter your email to save this design and get a shareable link
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="share"
                  checked={shareEnabled}
                  onChange={(e) => setShareEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={isLoading}
                />
                <Label htmlFor="share" className="text-sm text-muted-foreground">
                  Enable sharing link so others can view this design
                </Label>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading || !email}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <DialogTitle className="text-center">Saved Successfully!</DialogTitle>
              <DialogDescription className="text-center">
                We&apos;ve sent a copy to your email. You can also share this link:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {shareUrl && (
                <div className="flex items-center gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 text-sm"
                    aria-label="Share URL"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    aria-label="Copy share link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Close
                </Button>
                {shareUrl && (
                  <Button
                    onClick={() => {
                      window.open(shareUrl, '_blank');
                    }}
                    className="flex-1"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    View Share Page
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
