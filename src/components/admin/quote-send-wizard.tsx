'use client';

/**
 * Quote Send Wizard
 * Multi-step wizard for reviewing and sending quotes with AI email drafting
 * [DEV-072]
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Sparkles,
  FileText,
  Mail,
  Send,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  Edit3,
  Pencil,
} from 'lucide-react';
import { StepProgress, PdfSkeleton } from '@/components/ui/progress-loader';
import { SRAnnounce } from '@/components/ui/sr-announce';
import { EmailPreview } from './email-preview';
import type { AIEmail } from '@/lib/schemas/ai-email';
import { useBranding } from '@/components/branding-provider';

const EMAIL_GEN_STEPS = [
  { label: 'Reading project details...' },
  { label: 'Crafting personalized message...' },
  { label: 'Polishing email copy...' },
];

const SEND_STEPS = [
  { label: 'Generating your PDF...' },
  { label: 'Composing email...' },
  { label: 'Delivering to customer...' },
];

type TierMode = 'single' | 'tiered';
type TierName = 'good' | 'better' | 'best';

interface QuoteSendWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  customerName: string;
  customerEmail: string;
  projectType: string;
  quoteTotal: number;
  depositRequired: number;
  lineItemCount: number;
  goalsText?: string | undefined;
  sentAt?: Date | null | undefined;
  onSendComplete: () => void;
  tierMode?: TierMode | undefined;
  tierTotals?: Record<TierName, number> | undefined;
}

type WizardStep = 'review' | 'preview' | 'email' | 'confirm';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const STEP_TITLES: Record<WizardStep, string> = {
  review: 'Review Quote',
  preview: 'Preview PDF',
  email: 'Compose Email',
  confirm: 'Confirm & Send',
};

const STEP_ORDER: WizardStep[] = ['review', 'preview', 'email', 'confirm'];

export function QuoteSendWizard({
  open,
  onOpenChange,
  leadId,
  customerName,
  customerEmail,
  projectType,
  quoteTotal,
  depositRequired,
  lineItemCount,
  goalsText,
  sentAt,
  onSendComplete,
  tierMode,
  tierTotals,
}: QuoteSendWizardProps) {
  const branding = useBranding();
  const [currentStep, setCurrentStep] = useState<WizardStep>('review');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email state
  const [aiEmail, setAiEmail] = useState<AIEmail | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isEmailEdited, setIsEmailEdited] = useState(false);

  // PDF preview state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // Send state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Get current step index
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  // Reset state when dialog opens — prefetch PDF and generate email
  useEffect(() => {
    if (open) {
      setCurrentStep('review');
      setError(null);
      setSendSuccess(false);
      setIsEmailEdited(false);
      // Generate AI email on open
      generateEmail();
      // Prefetch PDF so it's ready when user reaches the preview step (P2)
      loadPdfPreview();
    } else {
      // Clean up PDF URL when closing
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
  }, [open]);

  // Generate AI email
  async function generateEmail() {
    setIsGeneratingEmail(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${leadId}/draft-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          projectType,
          quoteTotal,
          depositRequired,
          lineItemCount,
          goalsText,
          isResend: !!sentAt,
        }),
      });

      if (!response.ok) {
        // Fall back to default if AI fails
        setEmailSubject(`Your ${projectType} Renovation Quote - ${branding.name}`);
        setEmailBody(`Hi ${customerName.split(' ')[0]},

Thank you for considering ${branding.name} for your ${projectType} renovation project. Please find your detailed quote attached to this email.

We've carefully reviewed your requirements and prepared an estimate that reflects our commitment to quality workmanship and fair pricing.

If you have any questions about the quote or would like to discuss your project further, please don't hesitate to reach out.

We look forward to working with you.

Best regards,
The ${branding.name} Team`);
        return;
      }

      const data = await response.json();
      setAiEmail(data.aiEmail);
      setEmailSubject(data.aiEmail.subject);
      setEmailBody(
        `${data.aiEmail.greeting}\n\n${data.aiEmail.bodyParagraphs.join('\n\n')}\n\n${data.aiEmail.callToAction}\n\n${data.aiEmail.closing}`
      );
    } catch (err) {
      console.error('Error generating email:', err);
      // Use default email on error
      setEmailSubject(`Your ${projectType} Renovation Quote - ${branding.name}`);
      setEmailBody(`Hi ${customerName.split(' ')[0]},

Thank you for considering ${branding.name} for your ${projectType} renovation project. Please find your detailed quote attached.

Best regards,
The ${branding.name} Team`);
    } finally {
      setIsGeneratingEmail(false);
    }
  }

  // Load PDF preview
  async function loadPdfPreview() {
    if (pdfUrl) return; // Already loaded

    setIsLoadingPdf(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${leadId}/pdf`);

      if (!response.ok) {
        throw new Error('Failed to load PDF preview');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF preview');
    } finally {
      setIsLoadingPdf(false);
    }
  }

  // Download PDF
  function handleDownloadPdf() {
    if (!pdfUrl) return;

    const a = document.createElement('a');
    a.href = pdfUrl;
    const companyPrefix = (branding.name || 'Quote').replace(/\s+/g, '-');
    a.download = `${companyPrefix}-Quote-${customerName.replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Send quote
  async function handleSend() {
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${leadId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailSubject,
          emailBody,
          useCustomEmail: isEmailEdited,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send quote');
      }

      setSendSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        onSendComplete();
      }, 1500);
    } catch (err) {
      console.error('Error sending quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to send quote');
    } finally {
      setIsSending(false);
    }
  }

  // Navigation
  function goToStep(step: WizardStep) {
    setError(null);
    setCurrentStep(step);

    // Load PDF when going to preview step
    if (step === 'preview') {
      loadPdfPreview();
    }
  }

  function goNext() {
    const nextIndex = currentStepIndex + 1;
    const nextStep = STEP_ORDER[nextIndex];
    if (nextIndex < STEP_ORDER.length && nextStep) {
      goToStep(nextStep);
    }
  }

  function goBack() {
    const prevIndex = currentStepIndex - 1;
    const prevStep = STEP_ORDER[prevIndex];
    if (prevIndex >= 0 && prevStep) {
      goToStep(prevStep);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden flex flex-col">
        <SRAnnounce
          message={
            isGeneratingEmail ? 'Generating email...' :
            isSending ? 'Sending quote...' : ''
          }
        />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Send Quote to Customer
          </DialogTitle>
          <DialogDescription>
            {STEP_TITLES[currentStep]} - Step {currentStepIndex + 1} of {STEP_ORDER.length}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {STEP_ORDER.map((step, index) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => goToStep(step)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index === currentStepIndex
                    ? 'bg-primary text-white'
                    : index < currentStepIndex
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {index < currentStepIndex ? <Check className="h-4 w-4" /> : index + 1}
              </button>
              {index < STEP_ORDER.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    index < currentStepIndex ? 'bg-green-200' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="px-1 py-2">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quote Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Customer</span>
                      <p className="font-medium">{customerName}</p>
                      <p className="text-muted-foreground">{customerEmail}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Project</span>
                      <p className="font-medium capitalize">{projectType}</p>
                      <p className="text-muted-foreground">{lineItemCount} line items</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t space-y-2">
                    {tierMode === 'tiered' && tierTotals ? (
                      <>
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          All three tiers will be included in the quote
                        </div>
                        {(['good', 'better', 'best'] as TierName[]).map((tier) => (
                          <div key={tier} className="flex justify-between">
                            <span className={tier === 'better' ? 'font-medium text-primary' : 'text-muted-foreground'}>
                              {tier.charAt(0).toUpperCase() + tier.slice(1)}
                              {tier === 'better' && ' (Recommended)'}
                            </span>
                            <span className={tier === 'better' ? 'font-bold' : 'font-medium'}>
                              {formatCurrency(tierTotals[tier])}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between text-primary pt-1 border-t">
                          <span className="font-medium">Deposit Required (15%)</span>
                          <span className="font-bold">{formatCurrency(depositRequired)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-bold text-lg">{formatCurrency(quoteTotal)}</span>
                        </div>
                        <div className="flex justify-between text-primary">
                          <span className="font-medium">Deposit Required (15%)</span>
                          <span className="font-bold">{formatCurrency(depositRequired)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {sentAt && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <p className="text-amber-800">
                    This quote was previously sent on{' '}
                    {sentAt.toLocaleDateString('en-CA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    . Sending again will update the customer with the latest version.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview Step */}
          {currentStep === 'preview' && (
            <div className="space-y-4">
              {isLoadingPdf ? (
                <PdfSkeleton />
              ) : pdfUrl ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-2 flex items-center justify-between">
                    <span className="text-sm font-medium">PDF Preview</span>
                    <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                  <iframe
                    src={pdfUrl}
                    className="w-full h-[400px]"
                    title="Quote PDF Preview"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Unable to load PDF preview</p>
                </div>
              )}
            </div>
          )}

          {/* Email Step */}
          {currentStep === 'email' && (
            <div className="space-y-4">
              {isGeneratingEmail ? (
                <StepProgress steps={EMAIL_GEN_STEPS} stepDuration={2000} />
              ) : (
                <Tabs defaultValue="edit" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <TabsList>
                      <TabsTrigger value="edit" className="gap-1.5">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="gap-1.5">
                        <Eye className="h-4 w-4" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2">
                      {aiEmail && !isEmailEdited && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Generated
                        </Badge>
                      )}
                      {isEmailEdited && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edited
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateEmail}
                        disabled={isGeneratingEmail}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>

                  <TabsContent value="edit" className="mt-0">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="email-to" className="text-sm">To</Label>
                        <Input
                          id="email-to"
                          value={customerEmail}
                          disabled
                          className="bg-muted"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="email-subject" className="text-sm">Subject</Label>
                        <Input
                          id="email-subject"
                          value={emailSubject}
                          onChange={(e) => {
                            setEmailSubject(e.target.value);
                            setIsEmailEdited(true);
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="email-body" className="text-sm">Message</Label>
                        <Textarea
                          id="email-body"
                          value={emailBody}
                          onChange={(e) => {
                            setEmailBody(e.target.value);
                            setIsEmailEdited(true);
                          }}
                          rows={10}
                        />
                        <p className="text-xs text-muted-foreground">
                          The quote PDF will be attached to this email automatically.
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="mt-0">
                    <EmailPreview
                      subject={emailSubject}
                      body={emailBody}
                      recipientEmail={customerEmail}
                      recipientName={customerName}
                      quoteTotal={quoteTotal}
                      depositRequired={depositRequired}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}

          {/* Confirm Step */}
          {currentStep === 'confirm' && (
            <div className="space-y-4">
              {sendSuccess ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Quote Sent Successfully!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The quote has been emailed to {customerEmail}
                  </p>
                </div>
              ) : isSending ? (
                <StepProgress steps={SEND_STEPS} stepDuration={2000} />
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Confirm Send</CardTitle>
                      <CardDescription>
                        Please review the details before sending
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recipient</span>
                        <span className="font-medium">{customerEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subject</span>
                        <span className="font-medium truncate max-w-[300px]">{emailSubject}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Attachment</span>
                        <span className="font-medium">Quote PDF</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quote Total</span>
                        <span className="font-bold">{formatCurrency(quoteTotal)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <p className="text-sm text-muted-foreground text-center">
                    Click &quot;Send Quote&quot; to email the quote to {customerName}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <DialogFooter className="flex-row justify-between sm:justify-between">
          {!isSending && (
            <Button
              variant="outline"
              onClick={goBack}
              disabled={currentStepIndex === 0 || sendSuccess}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {isSending && <div />}

          <div className="flex gap-2">
            {!isSending && (
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            )}

            {currentStep !== 'confirm' ? (
              <Button
                onClick={goNext}
                className="bg-primary hover:bg-primary/90"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : !sendSuccess && !isSending ? (
              <Button
                onClick={handleSend}
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Quote
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
