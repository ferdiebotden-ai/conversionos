'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useBranding } from '@/components/branding-provider';

export default function DataDeletionPage() {
  const branding = useBranding();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ success: false, message: data.error || 'Something went wrong. Please try again.' });
      } else {
        setResult({ success: true, message: data.message });
        setEmail('');
        setName('');
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Data Deletion Request</h1>
      <p className="text-sm text-muted-foreground mb-8">{branding.name}</p>

      <div className="space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Under PIPEDA, you have the right to request deletion of your personal information.
          Submit your email address below and we will process your request within 30 days.
        </p>

        {result ? (
          <div
            className={`flex items-start gap-3 p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="size-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            )}
            <p className={`text-sm ${result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
              {result.message}
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deletion-email">Email address *</Label>
            <Input
              id="deletion-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deletion-name">Full name (optional)</Label>
            <Input
              id="deletion-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Providing your name helps us locate all associated records.
            </p>
          </div>

          <Button type="submit" disabled={isLoading || !email} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Deletion Request'
            )}
          </Button>
        </form>

        <div className="text-sm text-muted-foreground space-y-3 pt-4 border-t border-border">
          <p>
            <strong>What happens next:</strong> We will verify your identity and process the
            deletion of your personal data within 30 days. You will receive a confirmation
            email when the process is complete.
          </p>
          <p>
            Please note that certain data may be retained as required by law (e.g., financial
            records for tax compliance).
          </p>
          <p>
            For more information, see our{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
