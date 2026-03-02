'use client';

/**
 * No-Photo Lead Capture Form
 * Variant of LeadCaptureForm for homeowners who skip photo upload.
 * Includes projectType selector (since no visualization infers it).
 * Posts to /api/leads with no visualizationId — API tags source as 'chat_no_photo'.
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
import { ArrowRight, Loader2 } from 'lucide-react';
import { useBranding } from '@/components/branding-provider';

const PROJECT_TYPES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'basement', label: 'Basement' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'other', label: 'Other / Not Sure' },
] as const;

type Timeline = 'asap' | '1_3_months' | '3_6_months' | '6_plus_months' | 'just_exploring';

const TIMELINE_OPTIONS: { value: Timeline; label: string }[] = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1_3_months', label: 'Within 3 months' },
  { value: '3_6_months', label: '3–6 months' },
  { value: '6_plus_months', label: '6+ months' },
  { value: 'just_exploring', label: 'Just exploring' },
];

interface NoPhotoLeadFormProps {
  onSubmitted: () => void;
  className?: string | undefined;
}

export function NoPhotoLeadForm({ onSubmitted, className }: NoPhotoLeadFormProps) {
  const branding = useBranding();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [projectType, setProjectType] = useState('');
  const [timeline, setTimeline] = useState<Timeline | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid =
    name.trim().length >= 2 &&
    email.includes('@') &&
    email.includes('.') &&
    projectType !== '';

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
            projectType,
            timeline: timeline || undefined,
            goalsText: notes.trim() || undefined,
            // No visualizationId, no uploadedPhotos — API sets source to 'chat_no_photo'
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Something went wrong');
        }

        onSubmitted();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, email, phone, projectType, timeline, notes, isValid, isSubmitting, onSubmitted]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={panelSpring}
      className={cn('border border-border rounded-2xl bg-card p-5', className)}
      data-testid="no-photo-lead-form"
    >
      <h3 className="text-lg font-semibold mb-1">Ready to get started?</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Share your details and {branding.name} will get back to you.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="np-name" className="text-sm font-medium">
            Name
          </Label>
          <Input
            id="np-name"
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
          <Label htmlFor="np-email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="np-email"
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
          <Label htmlFor="np-phone" className="text-sm font-medium">
            Phone <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="np-phone"
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
          <Label htmlFor="np-project-type" className="text-sm font-medium">
            What type of project?
          </Label>
          <Select
            value={projectType}
            onValueChange={setProjectType}
            disabled={isSubmitting}
          >
            <SelectTrigger id="np-project-type" className="mt-1">
              <SelectValue placeholder="Select a project type" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="np-timeline" className="text-sm font-medium">
            When are you hoping to start?
          </Label>
          <Select
            value={timeline}
            onValueChange={(v) => setTimeline(v as Timeline)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="np-timeline" className="mt-1">
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
          <Label htmlFor="np-notes" className="text-sm font-medium">
            Tell us about your project{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="np-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Room size, budget, materials you love, anything that helps..."
            disabled={isSubmitting}
            rows={3}
            maxLength={2000}
            className="mt-1 resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

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
