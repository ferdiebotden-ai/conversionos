'use client';

/**
 * Contractor Intake Dialog
 * Multi-tab dialog for creating leads from voice dictation, typed notes, or manual form.
 * AI extraction pre-fills form fields from unstructured input.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Badge } from '@/components/ui/badge';
import { VoiceDictationInput } from './voice-dictation-input';
import { Mic, Type, ClipboardList, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import type { IntakeExtraction } from '@/lib/schemas/intake';

interface ContractorIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: (leadId: string) => void;
}

type IntakeMethod = 'voice_dictation' | 'text_input' | 'form';

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  projectType: string;
  areaSqft: string;
  finishLevel: string;
  timeline: string;
  budgetBand: string;
  goalsText: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  projectType: '',
  areaSqft: '',
  finishLevel: '',
  timeline: '',
  budgetBand: '',
  goalsText: '',
};

const PROJECT_TYPES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'basement', label: 'Basement' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'other', label: 'Other' },
];

const FINISH_LEVELS = [
  { value: 'economy', label: 'Economy' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
];

const TIMELINES = [
  { value: 'asap', label: 'ASAP' },
  { value: '1_3_months', label: '1-3 Months' },
  { value: '3_6_months', label: '3-6 Months' },
  { value: '6_plus_months', label: '6+ Months' },
  { value: 'just_exploring', label: 'Just Exploring' },
];

const BUDGET_BANDS = [
  { value: 'under_15k', label: 'Under $15K' },
  { value: '15k_25k', label: '$15K - $25K' },
  { value: '25k_40k', label: '$25K - $40K' },
  { value: '40k_60k', label: '$40K - $60K' },
  { value: '60k_plus', label: '$60K+' },
  { value: 'not_sure', label: 'Not Sure' },
];

export function ContractorIntakeDialog({
  open,
  onOpenChange,
  onLeadCreated,
}: ContractorIntakeDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('dictate');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [rawInput, setRawInput] = useState('');
  const [intakeMethod, setIntakeMethod] = useState<IntakeMethod>('voice_dictation');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [extractionSource, setExtractionSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typedNotes, setTypedNotes] = useState('');

  const resetDialog = useCallback(() => {
    setForm(EMPTY_FORM);
    setRawInput('');
    setIntakeMethod('voice_dictation');
    setIsExtracting(false);
    setIsSubmitting(false);
    setShowReview(false);
    setExtractionSource(null);
    setError(null);
    setTypedNotes('');
    setActiveTab('dictate');
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetDialog();
      onOpenChange(open);
    },
    [onOpenChange, resetDialog],
  );

  const applyExtraction = useCallback((extraction: IntakeExtraction) => {
    setForm((prev) => ({
      ...prev,
      name: extraction.name || prev.name,
      email: extraction.email || prev.email,
      phone: extraction.phone || prev.phone,
      address: extraction.address || prev.address,
      city: extraction.city || prev.city,
      projectType: extraction.projectType || prev.projectType,
      areaSqft: extraction.areaSqft ? String(extraction.areaSqft) : prev.areaSqft,
      finishLevel: extraction.finishLevel || prev.finishLevel,
      timeline: extraction.timeline || prev.timeline,
      budgetBand: extraction.budgetBand || prev.budgetBand,
      goalsText: extraction.goalsText || prev.goalsText,
    }));
    setShowReview(true);
  }, []);

  const extractFromInput = useCallback(
    async (input: string, method: IntakeMethod) => {
      setIsExtracting(true);
      setError(null);
      setRawInput(input);
      setIntakeMethod(method);

      try {
        const response = await fetch('/api/leads/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'extract', rawInput: input }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Extraction failed.' }));
          throw new Error(data.error || 'Extraction failed.');
        }

        const data = (await response.json()) as { extraction: IntakeExtraction };
        applyExtraction(data.extraction);
        setExtractionSource(method === 'voice_dictation' ? 'Extracted from dictation' : 'Extracted from text');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to extract fields. Please try manual entry.');
      } finally {
        setIsExtracting(false);
      }
    },
    [applyExtraction],
  );

  const handleDictationTranscript = useCallback(
    (text: string) => {
      extractFromInput(text, 'voice_dictation');
    },
    [extractFromInput],
  );

  const handleTextExtract = useCallback(() => {
    if (typedNotes.trim()) {
      extractFromInput(typedNotes.trim(), 'text_input');
    }
  }, [typedNotes, extractFromInput]);

  const handleFormTabSwitch = useCallback(() => {
    setIntakeMethod('form');
    setShowReview(true);
    setExtractionSource(null);
  }, []);

  const updateField = useCallback((field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const isFormValid = form.name.length >= 2 && form.email.includes('@');

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        action: 'create',
        name: form.name,
        email: form.email,
        intakeMethod,
      };

      if (form.phone) body['phone'] = form.phone;
      if (form.address) body['address'] = form.address;
      if (form.city) body['city'] = form.city;
      if (form.projectType) body['projectType'] = form.projectType;
      if (form.areaSqft) body['areaSqft'] = Number(form.areaSqft);
      if (form.finishLevel) body['finishLevel'] = form.finishLevel;
      if (form.timeline) body['timeline'] = form.timeline;
      if (form.budgetBand) body['budgetBand'] = form.budgetBand;
      if (form.goalsText) body['goalsText'] = form.goalsText;
      if (rawInput) body['rawInput'] = rawInput;

      const response = await fetch('/api/leads/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to create lead.' }));
        throw new Error(data.error || 'Failed to create lead.');
      }

      const data = (await response.json()) as { leadId: string };
      onLeadCreated(data.leadId);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, rawInput, intakeMethod, isFormValid, onLeadCreated, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Lead — Contractor Intake</DialogTitle>
          <DialogDescription>
            Record a phone call summary, paste an email, or enter details manually.
          </DialogDescription>
        </DialogHeader>

        {!showReview ? (
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'form') handleFormTabSwitch(); }} className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dictate" className="gap-1.5">
                <Mic className="h-3.5 w-3.5" />
                Dictate
              </TabsTrigger>
              <TabsTrigger value="type" className="gap-1.5">
                <Type className="h-3.5 w-3.5" />
                Type / Paste
              </TabsTrigger>
              <TabsTrigger
                value="form"
                className="gap-1.5"
                onClick={handleFormTabSwitch}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Form
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dictate" className="mt-4">
              <VoiceDictationInput
                onTranscript={handleDictationTranscript}
                disabled={isExtracting}
              />
              {isExtracting && (
                <div className="flex items-center gap-2 mt-4 justify-center text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Extracting lead details...
                </div>
              )}
            </TabsContent>

            <TabsContent value="type" className="mt-4 space-y-3">
              <Textarea
                placeholder="Paste email, type notes, or describe the job..."
                value={typedNotes}
                onChange={(e) => setTypedNotes(e.target.value)}
                rows={8}
                disabled={isExtracting}
              />
              <Button
                onClick={handleTextExtract}
                disabled={isExtracting || !typedNotes.trim()}
                className="w-full"
              >
                {isExtracting ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5 animate-pulse" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Extract Fields
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Form tab immediately shows review via handleFormTabSwitch */}
            <TabsContent value="form" />
          </Tabs>
        ) : (
          /* Review Form */
          <div className="space-y-4 mt-2">
            {extractionSource && (
              <Badge variant="secondary" className="text-xs">
                {extractionSource}
              </Badge>
            )}

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="intake-name" className="text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="intake-name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Customer name"
                  className={!form.name ? 'border-amber-300' : undefined}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intake-email" className="text-xs">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="intake-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="customer@email.com"
                  className={!form.email ? 'border-amber-300' : undefined}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intake-phone" className="text-xs">Phone</Label>
                <Input
                  id="intake-phone"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="519-555-1234"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intake-city" className="text-xs">City</Label>
                <Input
                  id="intake-city"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Stratford"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intake-address" className="text-xs">Address</Label>
              <Input
                id="intake-address"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            {/* Project info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Project Type</Label>
                <Select
                  value={form.projectType || 'none'}
                  onValueChange={(v) => updateField('projectType', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intake-area" className="text-xs">Area (sq ft)</Label>
                <Input
                  id="intake-area"
                  type="number"
                  value={form.areaSqft}
                  onChange={(e) => updateField('areaSqft', e.target.value)}
                  placeholder="e.g. 200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Finish Level</Label>
                <Select
                  value={form.finishLevel || 'none'}
                  onValueChange={(v) => updateField('finishLevel', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {FINISH_LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timeline</Label>
                <Select
                  value={form.timeline || 'none'}
                  onValueChange={(v) => updateField('timeline', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {TIMELINES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Budget Band</Label>
                <Select
                  value={form.budgetBand || 'none'}
                  onValueChange={(v) => updateField('budgetBand', v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {BUDGET_BANDS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intake-goals" className="text-xs">Project Notes / Goals</Label>
              <Textarea
                id="intake-goals"
                value={form.goalsText}
                onChange={(e) => updateField('goalsText', e.target.value)}
                placeholder="Describe the work the customer needs..."
                rows={3}
              />
            </div>

            {/* Missing required fields warning */}
            {!isFormValid && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-md p-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Name and a valid email are required to create a lead.</span>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReview(false);
                  setExtractionSource(null);
                }}
                disabled={isSubmitting}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Lead'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
