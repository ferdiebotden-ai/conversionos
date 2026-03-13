'use client';

/**
 * Invoice Send Wizard
 * 4-step wizard for reviewing and sending invoices
 * Follows the pattern established by quote-send-wizard.tsx
 * [DEV-089]
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Send,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
} from 'lucide-react';
import { PdfSkeleton } from '@/components/ui/progress-loader';
import { SRAnnounce } from '@/components/ui/sr-announce';
import { useBranding } from '@/components/branding-provider';

interface InvoiceSendWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  balanceDue: number;
  lineItemCount: number;
  onSendComplete: () => void;
}

type WizardStep = 'review' | 'preview' | 'email' | 'confirm';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const STEP_TITLES: Record<WizardStep, string> = {
  review: 'Review Invoice',
  preview: 'Preview PDF',
  email: 'Compose Email',
  confirm: 'Confirm & Send',
};

const STEP_ORDER: WizardStep[] = ['review', 'preview', 'email', 'confirm'];

export function InvoiceSendWizard({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  customerName,
  customerEmail,
  total,
  balanceDue,
  lineItemCount,
  onSendComplete,
}: InvoiceSendWizardProps) {
  const branding = useBranding();
  const [currentStep, setCurrentStep] = useState<WizardStep>('review');
  const [error, setError] = useState<string | null>(null);

  // Email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // PDF preview state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // Send state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  // Reset state when dialog opens — intentionally only depends on `open`
  useEffect(() => {
    if (open) {
      setCurrentStep('review');
      setError(null);
      setSendSuccess(false);

      // Set default email template
      setEmailSubject(`Invoice ${invoiceNumber} from ${branding.name}`);
      setEmailBody(
        `Hi ${customerName.split(' ')[0]},\n\n` +
        `Please find attached invoice ${invoiceNumber} for ${formatCurrency(total)}.\n\n` +
        `Balance due: ${formatCurrency(balanceDue)}\n\n` +
        `Payment can be made via e-transfer to: ${branding.paymentEmail}\n\n` +
        `If you have any questions about this invoice, please don't hesitate to reach out.\n\n` +
        `Thank you for your business.\n\n` +
        `Best regards,\nThe ${branding.name} Team`
      );

      // Prefetch PDF
      void loadPdfPreview();
    } else {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadPdfPreview() {
    if (pdfUrl) return;
    setIsLoadingPdf(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
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

  function handleDownloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    const companyPrefix = (branding.name || 'Invoice').replace(/\s+/g, '-');
    a.download = `${companyPrefix}-${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleSend() {
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: customerEmail,
          custom_message: emailBody,
          subject: emailSubject,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invoice');
      }

      setSendSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        onSendComplete();
      }, 1500);
    } catch (err) {
      console.error('Error sending invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invoice');
    } finally {
      setIsSending(false);
    }
  }

  function goToStep(step: WizardStep) {
    setError(null);
    setCurrentStep(step);
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
        <SRAnnounce message={isSending ? 'Sending invoice...' : ''} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Send Invoice to Customer
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
          {/* Step 1: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Invoice</span>
                      <p className="font-medium">{invoiceNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Customer</span>
                      <p className="font-medium">{customerName}</p>
                      <p className="text-muted-foreground">{customerEmail}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Line Items</span>
                      <span className="font-medium">{lineItemCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-lg">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span className="font-medium">Balance Due</span>
                      <span className="font-bold">{formatCurrency(balanceDue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Preview PDF */}
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
                    title="Invoice PDF Preview"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Unable to load PDF preview</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Compose Email */}
          {currentStep === 'email' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="invoice-email-to" className="text-sm">To</Label>
                  <Input
                    id="invoice-email-to"
                    value={customerEmail}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="invoice-email-subject" className="text-sm">Subject</Label>
                  <Input
                    id="invoice-email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="invoice-email-body" className="text-sm">Message</Label>
                  <Textarea
                    id="invoice-email-body"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    The invoice PDF will be attached to this email automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm & Send */}
          {currentStep === 'confirm' && (
            <div className="space-y-4">
              {sendSuccess ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Invoice Sent Successfully!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The invoice has been emailed to {customerEmail}
                  </p>
                </div>
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
                        <span className="font-medium">Invoice PDF</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance Due</span>
                        <span className="font-bold text-primary">{formatCurrency(balanceDue)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <p className="text-sm text-muted-foreground text-center">
                    Click &quot;Send Invoice&quot; to email the invoice to {customerName}
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
                Send Invoice
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
