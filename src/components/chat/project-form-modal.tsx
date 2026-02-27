'use client';

/**
 * Project Form Modal
 * Alternative to chat - structured form for collecting project details
 * Pre-fills data from chat conversation context
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { ProjectSummaryData } from './estimate-sidebar';
import { useBranding } from '@/components/branding-provider';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: ProjectSummaryData;
  onSubmit: (data: FormData) => Promise<void>;
}

interface FormData {
  // Contact info
  name: string;
  email: string;
  phone: string;
  // Project details
  projectType: string;
  areaSqft: string;
  timeline: string;
  finishLevel: string;
  goals: string;
}

const PROJECT_TYPE_OPTIONS = [
  { value: 'kitchen', label: 'Kitchen Renovation' },
  { value: 'bathroom', label: 'Bathroom Renovation' },
  { value: 'basement', label: 'Basement Finishing' },
  { value: 'flooring', label: 'Flooring Installation' },
  { value: 'painting', label: 'Painting' },
  { value: 'exterior', label: 'Exterior Work' },
  { value: 'other', label: 'Other / Multiple' },
];

const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1-3mo', label: '1-3 months' },
  { value: '3-6mo', label: '3-6 months' },
  { value: '6-12mo', label: '6-12 months' },
  { value: 'planning', label: 'Just exploring / planning' },
];

const FINISH_LEVEL_OPTIONS = [
  { value: 'economy', label: 'Economy - Budget-friendly materials' },
  { value: 'standard', label: 'Standard - Mid-range quality' },
  { value: 'premium', label: 'Premium - High-end finishes' },
];

export function ProjectFormModal({
  isOpen,
  onClose,
  initialData,
  onSubmit,
}: ProjectFormModalProps) {
  const branding = useBranding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with data from chat
  const [formData, setFormData] = useState<FormData>({
    name: initialData.contactName || '',
    email: initialData.contactEmail || '',
    phone: initialData.contactPhone || '',
    projectType: initialData.projectType || '',
    areaSqft: initialData.areaSqft?.toString() || '',
    timeline: initialData.timeline || '',
    finishLevel: initialData.finishLevel || '',
    goals: initialData.goals || '',
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Please enter your name';
    if (!formData.email.trim() || !formData.email.includes('@')) {
      return 'Please enter a valid email address';
    }
    if (!formData.projectType) return 'Please select a project type';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          // Success state
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle>Request Submitted!</DialogTitle>
              <DialogDescription className="text-center">
                Thanks{formData.name ? `, ${formData.name.split(' ')[0]}` : ''}! {branding.name} will
                review your project and contact you within 24 hours.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Confirmation sent to{' '}
                <span className="font-medium text-foreground">{formData.email}</span>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Form state
          <>
            <DialogHeader>
              <DialogTitle>Project Details Form</DialogTitle>
              <DialogDescription>
                Fill out the form below to submit your renovation request. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Contact Information
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="form-name">Name *</Label>
                    <Input
                      id="form-name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="form-email">Email *</Label>
                    <Input
                      id="form-email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-phone">Phone (optional)</Label>
                  <Input
                    id="form-phone"
                    type="tel"
                    placeholder={branding.phone}
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <hr className="border-border" />

              {/* Project Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Project Details
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="form-projectType">Project Type *</Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value) => handleChange('projectType', value)}
                  >
                    <SelectTrigger id="form-projectType">
                      <SelectValue placeholder="Select a project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="form-areaSqft">Approximate Size (sqft)</Label>
                    <Input
                      id="form-areaSqft"
                      type="number"
                      placeholder="e.g., 200"
                      value={formData.areaSqft}
                      onChange={(e) => handleChange('areaSqft', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="form-timeline">Timeline</Label>
                    <Select
                      value={formData.timeline}
                      onValueChange={(value) => handleChange('timeline', value)}
                    >
                      <SelectTrigger id="form-timeline">
                        <SelectValue placeholder="When do you want to start?" />
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-finishLevel">Finish Level</Label>
                  <Select
                    value={formData.finishLevel}
                    onValueChange={(value) => handleChange('finishLevel', value)}
                  >
                    <SelectTrigger id="form-finishLevel">
                      <SelectValue placeholder="Select quality level" />
                    </SelectTrigger>
                    <SelectContent>
                      {FINISH_LEVEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-goals">Project Goals / Description</Label>
                  <Textarea
                    id="form-goals"
                    placeholder="Tell us about what you're looking to accomplish with this renovation..."
                    value={formData.goals}
                    onChange={(e) => handleChange('goals', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleClose} className="sm:flex-1">
                Back to Chat
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
