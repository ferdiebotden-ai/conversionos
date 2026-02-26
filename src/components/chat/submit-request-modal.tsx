'use client';

/**
 * Submit Request Modal
 * Confirmation dialog for submitting a renovation request
 * Shows summary of collected data and captures contact info with Ontario-specific fields
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check, ArrowLeft, PartyPopper, Calendar, Home, AlertCircle } from 'lucide-react';
import { StepProgress } from '@/components/ui/progress-loader';
import type { ProjectSummaryData } from './estimate-sidebar';
import { useBranding } from '@/components/branding-provider';

interface SubmitRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: ProjectSummaryData;
  messages: Array<{ role: string; content: string }>;
  onSubmit: (contactInfo: ContactInfo) => Promise<void>;
}

// Extended contact info with Ontario-specific fields
interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  additionalNotes?: string;
  // Ontario-specific fields
  propertyType?: string;
  propertyAge?: string;
  isOwner?: boolean;
  hasHOA?: boolean;
  hoaRestrictions?: string;
  permitAware?: boolean;
  preferredStartDate?: string;
  accessNotes?: string;
}

// Property type options
const PROPERTY_TYPE_OPTIONS = [
  { value: 'detached', label: 'Detached House' },
  { value: 'semi', label: 'Semi-Detached' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'condo', label: 'Condo/Apartment' },
  { value: 'other', label: 'Other' },
];

// Property age options
const PROPERTY_AGE_OPTIONS = [
  { value: 'new', label: 'New Construction' },
  { value: '0-10', label: '0-10 years' },
  { value: '10-25', label: '10-25 years' },
  { value: '25-50', label: '25-50 years' },
  { value: '50+', label: '50+ years' },
];

const PROJECT_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen Renovation',
  bathroom: 'Bathroom Renovation',
  basement: 'Basement Finishing',
  flooring: 'Flooring Installation',
  painting: 'Painting',
  exterior: 'Exterior Work',
  other: 'General Renovation',
};

const TIMELINE_LABELS: Record<string, string> = {
  asap: 'ASAP',
  '1-3mo': '1-3 months',
  '3-6mo': '3-6 months',
  '6-12mo': '6-12 months',
  planning: 'Just planning',
};

const FINISH_LABELS: Record<string, string> = {
  economy: 'Economy',
  standard: 'Standard',
  premium: 'Premium',
};

type Step = 'review' | 'contact' | 'details' | 'submitting' | 'success';

const SUBMIT_PROGRESS_STEPS = [
  { label: 'Saving your project details...' },
  { label: 'Analyzing your renovation needs...' },
  { label: 'Setting up your personalized quote...' },
  { label: 'Finalizing your request...' },
];

const RENOVATION_TIPS = [
  'Kitchen renovations in Ontario typically add 75-100% of their cost to home value',
  'The best time to start a renovation in Ontario is early spring or late fall',
  'A detailed scope of work helps avoid surprises and change orders',
  'Building permits in Ontario usually take 2-4 weeks to process',
  'Energy-efficient upgrades may qualify for Ontario rebate programs',
  'Choosing a local contractor means faster response times and material sourcing',
  'A 15% deposit secures your spot in the project schedule',
  'Photos help us provide a more accurate initial estimate',
  'Most kitchen renovations in Ontario take 4-8 weeks to complete',
  'Bathroom renovations are the second-highest ROI home improvement project',
];

export function SubmitRequestModal({
  isOpen,
  onClose,
  projectData,
  onSubmit,
}: SubmitRequestModalProps) {
  const branding = useBranding();
  const [step, setStep] = useState<Step>('review');
  const [error, setError] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: projectData.contactName || '',
    email: projectData.contactEmail || '',
    phone: projectData.contactPhone || '',
    isOwner: true,
    hasHOA: false,
    permitAware: false,
  });

  const handleSubmit = async () => {
    // Validate contact info
    if (!contactInfo.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!contactInfo.email.trim() || !contactInfo.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setStep('submitting');

    try {
      // Minimum display time so progress screen is visible
      const delay = new Promise((resolve) => setTimeout(resolve, 1500));
      await Promise.all([onSubmit(contactInfo), delay]);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
      setStep('details');
    }
  };

  const handleClose = () => {
    // Prevent close during submission
    if (step === 'submitting') return;

    // Reset state on close
    setStep('review');
    setError(null);
    onClose();
  };

  // Check if we already have contact info
  const hasContactInfo =
    projectData.contactName && projectData.contactEmail;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="submit-modal">
        {step === 'review' && (
          <>
            <DialogHeader>
              <DialogTitle>Ready to submit your request?</DialogTitle>
              <DialogDescription>
                Review your project details below. You can still chat to add more information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {/* Project Summary */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                {projectData.projectType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Project</span>
                    <span className="font-medium">
                      {PROJECT_TYPE_LABELS[projectData.projectType] || projectData.projectType}
                    </span>
                  </div>
                )}
                {projectData.areaSqft && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium">~{projectData.areaSqft} sqft</span>
                  </div>
                )}
                {projectData.timeline && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Timeline</span>
                    <span className="font-medium">
                      {TIMELINE_LABELS[projectData.timeline] || projectData.timeline}
                    </span>
                  </div>
                )}
                {projectData.finishLevel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Finish Level</span>
                    <span className="font-medium">
                      {FINISH_LABELS[projectData.finishLevel] || projectData.finishLevel}
                    </span>
                  </div>
                )}
                {(projectData.photosCount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Photos</span>
                    <span className="font-medium flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      {projectData.photosCount} uploaded
                    </span>
                  </div>
                )}
              </div>

              {projectData.goals && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Goals: </span>
                  <span className="line-clamp-2">{projectData.goals}</span>
                </div>
              )}

              {/* Additional notes */}
              <div className="space-y-2">
                <Label htmlFor="additional-notes" className="text-sm text-muted-foreground">
                  Anything else we should know?
                </Label>
                <Textarea
                  id="additional-notes"
                  placeholder="Special requirements, accessibility needs, design inspiration..."
                  value={contactInfo.additionalNotes || ''}
                  onChange={(e) =>
                    setContactInfo((prev) => ({ ...prev, additionalNotes: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose} className="sm:flex-1">
                Continue Conversation
              </Button>
              <Button
                onClick={() => setStep('contact')}
                className="sm:flex-1"
              >
                Continue to Submit
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'contact' && (
          <>
            <DialogHeader>
              <DialogTitle>Your contact information</DialogTitle>
              <DialogDescription>
                We&apos;ll send your detailed quote to this email within 24 hours.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={contactInfo.name}
                  onChange={(e) =>
                    setContactInfo((prev) => ({ ...prev, name: e.target.value }))
                  }
                  data-testid="contact-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={contactInfo.email}
                  onChange={(e) =>
                    setContactInfo((prev) => ({ ...prev, email: e.target.value }))
                  }
                  data-testid="contact-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={branding.phone}
                  value={contactInfo.phone}
                  onChange={(e) =>
                    setContactInfo((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  data-testid="contact-phone"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('review')}
                className="sm:flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => {
                  // Validate contact info before proceeding
                  if (!contactInfo.name.trim()) {
                    setError('Please enter your name');
                    return;
                  }
                  if (!contactInfo.email.trim() || !contactInfo.email.includes('@')) {
                    setError('Please enter a valid email address');
                    return;
                  }
                  setError(null);
                  setStep('details');
                }}
                className="sm:flex-1"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'details' && (
          <>
            <DialogHeader>
              <DialogTitle>Property details</DialogTitle>
              <DialogDescription>
                Help us understand your property better for an accurate quote.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Property Type */}
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type</Label>
                <Select
                  value={contactInfo.propertyType ?? ''}
                  onValueChange={(value) =>
                    setContactInfo((prev) => ({ ...prev, propertyType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property Age */}
              <div className="space-y-2">
                <Label htmlFor="propertyAge">Property Age</Label>
                <Select
                  value={contactInfo.propertyAge ?? ''}
                  onValueChange={(value) =>
                    setContactInfo((prev) => ({ ...prev, propertyAge: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How old is your property?" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_AGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ownership Status */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isOwner"
                  checked={contactInfo.isOwner ?? true}
                  onCheckedChange={(checked) =>
                    setContactInfo((prev) => ({ ...prev, isOwner: checked === true }))
                  }
                />
                <Label htmlFor="isOwner" className="text-sm font-normal cursor-pointer">
                  I am the property owner
                </Label>
              </div>

              {/* HOA/Condo */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasHOA"
                    checked={contactInfo.hasHOA ?? false}
                    onCheckedChange={(checked) =>
                      setContactInfo((prev) => ({ ...prev, hasHOA: checked === true }))
                    }
                  />
                  <Label htmlFor="hasHOA" className="text-sm font-normal cursor-pointer">
                    Property has HOA or condo board
                  </Label>
                </div>
                {contactInfo.hasHOA && (
                  <Textarea
                    placeholder="Any restrictions we should know about? (e.g., work hours, approval needed)"
                    value={contactInfo.hoaRestrictions || ''}
                    onChange={(e) =>
                      setContactInfo((prev) => ({ ...prev, hoaRestrictions: e.target.value }))
                    }
                    className="mt-2"
                    rows={2}
                  />
                )}
              </div>

              {/* Preferred Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Preferred Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={contactInfo.preferredStartDate || ''}
                  onChange={(e) =>
                    setContactInfo((prev) => ({ ...prev, preferredStartDate: e.target.value }))
                  }
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Access Notes */}
              <div className="space-y-2">
                <Label htmlFor="accessNotes" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Access Information
                </Label>
                <Textarea
                  id="accessNotes"
                  placeholder="Lockbox code, key location, pets, parking info, etc."
                  value={contactInfo.accessNotes || ''}
                  onChange={(e) =>
                    setContactInfo((prev) => ({ ...prev, accessNotes: e.target.value }))
                  }
                  rows={2}
                />
              </div>

              {/* Permit Awareness */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Some renovations in Ontario require building permits. We&apos;ll help you determine if permits are needed.
                    </p>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="permitAware"
                        checked={contactInfo.permitAware ?? false}
                        onCheckedChange={(checked) =>
                          setContactInfo((prev) => ({ ...prev, permitAware: checked === true }))
                        }
                      />
                      <Label htmlFor="permitAware" className="text-sm font-normal cursor-pointer text-amber-800 dark:text-amber-200">
                        I understand permits may be required
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('contact')}
                className="sm:flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="sm:flex-1"
                data-testid="submit-form-button"
              >
                Submit Request Now
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'submitting' && (
          <div className="py-6" data-testid="submit-progress">
            <StepProgress
              steps={SUBMIT_PROGRESS_STEPS}
              tips={RENOVATION_TIPS}
              stepDuration={2500}
              tipDuration={3500}
            />
          </div>
        )}

        {step === 'success' && (
          <>
            <DialogHeader className="text-center" data-testid="submission-success">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <PartyPopper className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle>Request submitted!</DialogTitle>
              <DialogDescription className="text-center">
                Thanks{contactInfo.name ? `, ${contactInfo.name.split(' ')[0]}` : ''}! {branding.name} will
                review your project and contact you within 24 hours.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Confirmation sent to{' '}
                <span className="font-medium text-foreground">{contactInfo.email}</span>
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
