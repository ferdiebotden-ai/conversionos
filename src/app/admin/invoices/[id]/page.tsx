'use client';

/**
 * Invoice Detail Page
 * Shows invoice summary, line items, payment history, and actions
 * [DEV-083 to DEV-088]
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Download,
  Send,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  DollarSign,
  FileText,
} from 'lucide-react';
import type { Invoice, Payment, InvoiceStatus, QuoteLineItem, PaymentMethod } from '@/types/database';
import { InvoiceSendWizard } from '@/components/admin/invoice-send-wizard';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
  sent: { label: 'Sent', variant: 'default', icon: Send },
  partially_paid: { label: 'Partially Paid', variant: 'outline', icon: AlertCircle },
  paid: { label: 'Paid', variant: 'outline', icon: CheckCircle2 },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '\u2014';
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  etransfer: 'E-Transfer',
  credit_card: 'Credit Card',
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params['id'] as string;

  const [invoice, setInvoice] = useState<(Invoice & { payments: Payment[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [sendWizardOpen, setSendWizardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('etransfer');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const fetchInvoice = useCallback(async () => {
    const res = await fetch(`/api/invoices/${id}`);
    if (res.ok) {
      const data = await res.json();
      setInvoice(data.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetchInvoice(); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch
  }, [fetchInvoice]);

  const handleRecordPayment = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/invoices/${id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(payAmount),
        payment_method: payMethod,
        reference_number: payRef || undefined,
        notes: payNotes || undefined,
      }),
    });

    if (res.ok) {
      setPaymentOpen(false);
      setPayAmount('');
      setPayRef('');
      setPayNotes('');
      await fetchInvoice();
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  const config = STATUS_CONFIG[invoice.status];
  const StatusIcon = config.icon;
  const lineItems = (invoice.line_items as unknown as QuoteLineItem[]) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{invoice.invoice_number}</h2>
              <Badge variant={config.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {invoice.customer_name} &bull; {formatDate(invoice.issue_date)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-1" />
              PDF
            </a>
          </Button>

          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setSendWizardOpen(true)}>
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
              <InvoiceSendWizard
                open={sendWizardOpen}
                onOpenChange={setSendWizardOpen}
                invoiceId={id}
                invoiceNumber={invoice.invoice_number}
                customerName={invoice.customer_name}
                customerEmail={invoice.customer_email || ''}
                total={Number(invoice.total)}
                balanceDue={Number(invoice.balance_due)}
                lineItemCount={lineItems.length}
                onSendComplete={fetchInvoice}
              />

              <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Balance due: {formatCurrency(Number(invoice.balance_due))}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="pay-amount">Amount</Label>
                      <Input
                        id="pay-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={Number(invoice.balance_due)}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pay-method">Payment Method</Label>
                      <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                        <SelectTrigger id="pay-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="etransfer">E-Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pay-ref">Reference # (optional)</Label>
                      <Input
                        id="pay-ref"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="e.g. cheque number, e-transfer ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pay-notes">Notes (optional)</Label>
                      <Textarea
                        id="pay-notes"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                    <Button onClick={handleRecordPayment} disabled={submitting || !payAmount || parseFloat(payAmount) <= 0}>
                      {submitting ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Line items + payments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{item.category}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payments recorded yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>{PAYMENT_METHOD_LABELS[payment.payment_method]}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.reference_number || '\u2014'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          +{formatCurrency(Number(payment.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.contingency_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contingency ({invoice.contingency_percent}%)</span>
                  <span>{formatCurrency(Number(invoice.contingency_amount))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">HST (13%)</span>
                <span>{formatCurrency(Number(invoice.hst_amount))}</span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-3 border-t">
                <span>Total</span>
                <span>{formatCurrency(Number(invoice.total))}</span>
              </div>
              {Number(invoice.amount_paid) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Amount Paid</span>
                  <span>-{formatCurrency(Number(invoice.amount_paid))}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-3 border-t border-primary/30">
                <span className="text-primary">Balance Due</span>
                <span className={Number(invoice.balance_due) > 0 ? 'text-primary' : 'text-green-600'}>
                  {formatCurrency(Number(invoice.balance_due))}
                </span>
              </div>
              {!invoice.deposit_received && Number(invoice.deposit_required) > 0 && (
                <div className="text-sm text-muted-foreground pt-2">
                  Deposit required: {formatCurrency(Number(invoice.deposit_required))} (15%)
                </div>
              )}
              {invoice.deposit_received && (
                <div className="flex items-center gap-1 text-sm text-green-600 pt-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Deposit received
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{invoice.customer_name}</p>
              <p className="text-muted-foreground">{invoice.customer_email}</p>
              {invoice.customer_phone && (
                <p className="text-muted-foreground">{invoice.customer_phone}</p>
              )}
              {invoice.customer_address && (
                <p className="text-muted-foreground">
                  {invoice.customer_address}<br />
                  {invoice.customer_city}, {invoice.customer_province} {invoice.customer_postal_code}
                </p>
              )}
              {invoice.lead_id && (
                <Button asChild variant="link" size="sm" className="p-0 h-auto">
                  <Link href={`/admin/leads/${invoice.lead_id}`}>
                    View Lead &rarr;
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date</span>
                <span>{formatDate(invoice.issue_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span>{formatDate(invoice.due_date)}</span>
              </div>
              {invoice.sent_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{formatDate(invoice.sent_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
