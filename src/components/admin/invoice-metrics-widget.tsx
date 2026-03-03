import Link from 'next/link';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import { DollarSign, AlertCircle } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

async function getInvoiceMetrics() {
  const supabase = createServiceClient();

  const siteId = await getSiteIdAsync();

  const [
    { count: totalInvoices },
    { count: unpaidCount },
    { data: revenueData },
    { data: outstandingData },
  ] = await Promise.all([
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('site_id', siteId).neq('status', 'cancelled'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('site_id', siteId).in('status', ['sent', 'partially_paid', 'overdue']),
    supabase.from('invoices').select('amount_paid').eq('site_id', siteId).in('status', ['paid', 'partially_paid']),
    supabase.from('invoices').select('balance_due').eq('site_id', siteId).in('status', ['sent', 'partially_paid', 'overdue']),
  ]);

  const totalRevenue = revenueData?.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0) || 0;
  const totalOutstanding = outstandingData?.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0) || 0;

  return {
    totalInvoices: totalInvoices || 0,
    unpaidCount: unpaidCount || 0,
    totalRevenue,
    totalOutstanding,
  };
}

export async function InvoiceMetricsWidget() {
  const metrics = await getInvoiceMetrics();

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Invoice Overview
        </h3>
        <Link href="/admin/invoices" className="text-sm text-primary hover:underline">
          View all &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-2xl font-bold">{metrics.totalInvoices}</p>
          <p className="text-xs text-muted-foreground">Total Invoices</p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold flex items-center gap-1">
            {metrics.unpaidCount > 0 && <AlertCircle className="h-4 w-4 text-amber-500" />}
            {metrics.unpaidCount}
          </p>
          <p className="text-xs text-muted-foreground">Awaiting Payment</p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">Revenue Collected</p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(metrics.totalOutstanding)}</p>
          <p className="text-xs text-muted-foreground">Outstanding</p>
        </div>
      </div>
    </div>
  );
}
