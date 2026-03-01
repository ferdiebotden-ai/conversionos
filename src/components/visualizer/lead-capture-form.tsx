'use client';

/**
 * Lead Capture Form
 * Inline form for capturing lead details after the Design Studio flow.
 * Slides in below the chat — NOT a modal, NOT a new page.
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { panelSpring } from '@/lib/animations';
import { ScaleIn } from '@/components/motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { useBranding } from '@/components/branding-provider';

// ── Types ──────────────────────────────────────────────────────────────────

interface LeadCaptureFormProps {
  visualizationId: string;
  roomType: string;
  originalPhotoUrl: string;
  className?: string | undefined;
  onSubmitted: () => void;
}

type Timeline = 'asap' | '1_3_months' | '3_6_months' | '6_plus_months' | 'just_exploring';

const TIMELINE_OPTIONS: { value: Timeline; label: string }[] = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1_3_months', label: 'Within 3 months' },
  { value: '3_6_months', label: '3–6 months' },
  { value: '6_plus_months', label: '6+ months' },
  { value: 'just_exploring', label: 'Just exploring' },
];

// ── Component ──────────────────────────────────────────────────────────────

export function LeadCaptureForm({
  visualizationId,
  roomType,
  originalPhotoUrl,
  className,
  onSubmitted,
}: LeadCaptureFormProps) {
  const branding = useBranding();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [timeline, setTimeline] = useState<Timeline | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const isValid = name.trim().length >= 2 && email.includes('@') && email.includes('.');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          projectType: roomType.replace(/\s+/g, '_').toLowerCase(),
          timeline: timeline || undefined,
          goalsText: notes.trim() || undefined,
          visualizationId,
          uploadedPhotos: originalPhotoUrl ? [originalPhotoUrl] : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong');
      }

      setIsSuccess(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, phone, timeline, notes, roomType, visualizationId, originalPhotoUrl, isValid, isSubmitting, onSubmitted]);

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={panelSpring}
        className={cn('border border-border rounded-2xl bg-card p-6 text-center', className)}
        data-testid="lead-capture-success"
      >
        <ScaleIn>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
        </ScaleIn>
        <h3 className="text-lg font-semibold">You&apos;re all set!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {branding.name} has everything they need. They&apos;ll follow up within 24 hours.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={panelSpring}
      className={cn('border border-border rounded-2xl bg-card p-5', className)}
      data-testid="lead-capture-form"
    >
      <h3 className="text-lg font-semibold mb-1">Ready to bring this to life?</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Share your details and {branding.name} will get back to you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="lead-name" className="text-sm font-medium">
            Name
          </Label>
          <Input
            id="lead-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            required
            disabled={isSubmitting}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="lead-email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="lead-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={isSubmitting}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="lead-phone" className="text-sm font-medium">
            Phone <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="lead-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            autoComplete="tel"
            disabled={isSubmitting}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="lead-timeline" className="text-sm font-medium">
            When are you hoping to start?
          </Label>
          <Select
            value={timeline}
            onValueChange={(v) => setTimeline(v as Timeline)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="lead-timeline" className="mt-1">
              <SelectValue placeholder="Select a timeline" />
            </SelectTrigger>
            <SelectContent>
              {TIMELINE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="lead-notes" className="text-sm font-medium">
            Anything else? <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="lead-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Budget, special requirements, materials you love..."
            disabled={isSubmitting}
            rows={3}
            maxLength={2000}
            className="mt-1 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full min-h-[48px]"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit Request
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Your details are shared only with {branding.name}.
        </p>
      </form>
    </motion.div>
  );
}
