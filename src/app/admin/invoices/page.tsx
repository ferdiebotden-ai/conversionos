import { Suspense } from 'react';
import Link from 'next/link';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
} from 'lucide-react';
import type { Invoice, InvoiceStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

interface InvoicesPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
  sent: { label: 'Sent', variant: 'default', icon: Send },
  partially_paid: { label: 'Partial', variant: 'outline', icon: AlertCircle },
  paid: { label: 'Paid', variant: 'outline', icon: CheckCircle2 },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: XCircle },
};

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '\u2014';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

async function getInvoices(searchParams: InvoicesPageProps['searchParams']) {
  const params = await searchParams;
  const supabase = createServiceClient();
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('site_id', await getSiteIdAsync())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status as InvoiceStatus);
  }

  const { data: invoices, count, error } = await query;

  if (error) {
    console.error('Error fetching invoices:', error);
    return { invoices: [], total: 0 };
  }

  return { invoices: (invoices || []) as Invoice[], total: count || 0 };
}

function InvoicesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusFilter({ current }: { current: string }) {
  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'partially_paid', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {statuses.map((s) => (
        <Button
          key={s.value}
          asChild
          variant={current === s.value || (!current && s.value === 'all') ? 'default' : 'outline'}
          size="sm"
        >
          <Link href={s.value === 'all' ? '/admin/invoices' : `/admin/invoices?status=${s.value}`}>
            {s.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}

function InvoicesTable({ invoices, currentStatus }: { invoices: Invoice[]; currentStatus: string }) {
  if (invoices.length === 0) {
    return (
      <div className="space-y-4">
        <StatusFilter current={currentStatus} />
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No invoices found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create an invoice from a won quote to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatusFilter current={currentStatus} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => {
              const config = STATUS_CONFIG[invoice.status];
              const StatusIcon = config.icon;

              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    {invoice.customer_name}
                    <p className="text-sm text-muted-foreground">
                      {invoice.customer_email}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={Number(invoice.balance_due) > 0 ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                      {formatCurrency(invoice.balance_due)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.issue_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/invoices/${invoice.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const { invoices } = await getInvoices(searchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-muted-foreground">
            Manage invoices, track payments, and export to Sage.
          </p>
        </div>
      </div>

      <Suspense fallback={<InvoicesTableSkeleton />}>
        <InvoicesTable invoices={invoices} currentStatus={params.status || ''} />
      </Suspense>
    </div>
  );
}
