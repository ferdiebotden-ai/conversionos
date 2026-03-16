'use client';

/**
 * Step 4: Instant Estimate + Contact Form
 * Shows a cost range IMMEDIATELY using calculateCostEstimate() (zero AI calls).
 * The estimate appears ABOVE the contact form.
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
import {
  calculateCostEstimate,
  formatCAD,
  BUSINESS_CONSTANTS,
} from '@/lib/ai/knowledge/pricing-data';
import type { FinishLevel } from '@/lib/ai/knowledge/pricing-data';
import { DollarSign, ArrowRight, Loader2, Info } from 'lucide-react';
import { useBranding } from '@/components/branding-provider';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Timeline = 'asap' | '1_3_months' | '3_6_months' | '6_plus_months' | 'just_exploring';

/** Map room types to valid API projectType values (LeadSubmissionSchema enum) */
const ROOM_TO_PROJECT_TYPE: Record<string, string> = {
  kitchen: 'kitchen',
  bathroom: 'bathroom',
  basement: 'basement',
  flooring: 'flooring',
  exterior: 'exterior',
  painting: 'painting',
  // Room types that don't map 1:1 to a projectType fall back to 'other'
  living_room: 'other',
  bedroom: 'other',
  dining_room: 'other',
};

const TIMELINE_OPTIONS: { value: Timeline; label: string }[] = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1_3_months', label: 'Within 3 months' },
  { value: '3_6_months', label: '3-6 months' },
  { value: '6_plus_months', label: '6+ months' },
  { value: 'just_exploring', label: 'Just exploring' },
];

interface StepInstantEstimateProps {
  roomType: string;
  sqft: number;
  finishLevel: FinishLevel;
  onSubmitted: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepInstantEstimate({
  roomType,
  sqft,
  finishLevel,
  onSubmitted,
  className,
}: StepInstantEstimateProps) {
  const branding = useBranding();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [timeline, setTimeline] = useState<Timeline | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate estimate immediately (pure, no API call)
  const estimate = calculateCostEstimate(roomType, finishLevel, sqft);

  const isValid =
    name.trim().length >= 2 &&
    email.includes('@') &&
    email.includes('.');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
            projectType: ROOM_TO_PROJECT_TYPE[roomType] || 'other',
            areaSqft: sqft,
            finishLevel,
            timeline: timeline || undefined,
            goalsText: notes.trim() || undefined,
            scopeJson: estimate
              ? {
                  source: 'planner_wizard',
                  finishLevel,
                  sqft,
                  roomType,
                  totalLow: estimate.totalLow,
                  totalHigh: estimate.totalHigh,
                }
              : undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Something went wrong');
        }

        onSubmitted();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, email, phone, roomType, timeline, notes, finishLevel, sqft, estimate, isValid, isSubmitting, onSubmitted],
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* ─── Instant Estimate Card ─── */}
      {estimate && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Your Instant Estimate
              </p>
            </div>
          </div>

          <p className="text-2xl font-bold text-foreground">
            {formatCAD(estimate.totalLow)} - {formatCAD(estimate.totalHigh)}
          </p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {finishLevel.charAt(0).toUpperCase() + finishLevel.slice(1)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ~{sqft} sqft {roomType.replace('_', ' ')}
            </span>
          </div>

          <div className="mt-3 flex items-start gap-1.5">
            <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Includes {Math.round(BUSINESS_CONSTANTS.contingencyRate * 100)}% contingency.
              HST ({Math.round(BUSINESS_CONSTANTS.hstRate * 100)}%) additional.
              Preliminary estimate — final pricing requires an in-person assessment.
            </p>
          </div>
        </div>
      )}

      {/* ─── Contact Form ─── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-1">
          Get Your Detailed Quote
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Share your details and {branding.name} will follow up with a personalised estimate.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="planner-name" className="text-xs font-medium">
              Name
            </Label>
            <Input
              id="planner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
              disabled={isSubmitting}
              className="mt-0.5"
            />
          </div>

          <div>
            <Label htmlFor="planner-email" className="text-xs font-medium">
              Email
            </Label>
            <Input
              id="planner-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isSubmitting}
              className="mt-0.5"
            />
          </div>

          <div>
            <Label htmlFor="planner-phone" className="text-xs font-medium">
              Phone <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="planner-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              autoComplete="tel"
              disabled={isSubmitting}
              className="mt-0.5"
            />
          </div>

          <div>
            <Label htmlFor="planner-timeline" className="text-xs font-medium">
              When are you hoping to start?
            </Label>
            <Select
              value={timeline}
              onValueChange={(v) => setTimeline(v as Timeline)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="planner-timeline" className="mt-0.5">
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
            <Label htmlFor="planner-notes" className="text-xs font-medium">
              Anything else?{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="planner-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Budget range, materials you love, specific ideas..."
              disabled={isSubmitting}
              rows={2}
              maxLength={2000}
              className="mt-0.5 resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            size="lg"
            className="w-full min-h-[44px]"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Get My Detailed Quote
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            Your details are shared only with {branding.name}.
          </p>
        </form>
      </div>
    </div>
  );
}
