import { Suspense } from 'react';
import Link from 'next/link';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import type { QuoteDraft } from '@/types/database';

export const dynamic = 'force-dynamic';

interface QuotesPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    limit?: string;
  }>;
}

type QuoteStatus = 'draft' | 'sent' | 'won' | 'lost';

interface QuoteWithLead extends QuoteDraft {
  leads: {
    id: string;
    name: string;
    email: string;
    project_type: string | null;
  } | null;
}

function getQuoteStatus(quote: QuoteDraft): QuoteStatus {
  if (quote.sent_at) {
    // Check if the associated lead is won or lost
    return 'sent';
  }
  return 'draft';
}

const STATUS_CONFIG: Record<QuoteStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Clock },
  sent: { label: 'Sent', variant: 'default', icon: Send },
  won: { label: 'Won', variant: 'outline', icon: CheckCircle2 },
  lost: { label: 'Lost', variant: 'destructive', icon: XCircle },
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  basement: 'Basement',
  flooring: 'Flooring',
  painting: 'Painting',
  exterior: 'Exterior',
  other: 'Other',
};

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

async function getQuotes(searchParams: QuotesPageProps['searchParams']) {
  const params = await searchParams;
  const supabase = createServiceClient();

  const page = parseInt(params.page || '1', 10);
  const limit = parseInt(params.limit || '20', 10);
  const offset = (page - 1) * limit;

  // Build query with lead join
  let query = supabase
    .from('quote_drafts')
    .select(`
      *,
      leads!inner (
        id,
        name,
        email,
        project_type,
        status
      )
    `, { count: 'exact' })
    .eq('site_id', getSiteId())
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by status if specified
  if (params.status === 'draft') {
    query = query.is('sent_at', null);
  } else if (params.status === 'sent') {
    query = query.not('sent_at', 'is', null);
  } else if (params.status === 'won') {
    query = query.eq('leads.status', 'won');
  } else if (params.status === 'lost') {
    query = query.eq('leads.status', 'lost');
  }

  const { data: quotes, count, error } = await query;

  if (error) {
    console.error('Error fetching quotes:', error);
    return {
      quotes: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  return {
    quotes: (quotes || []) as QuoteWithLead[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

function QuotesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuotesTable({ quotes, currentStatus }: { quotes: QuoteWithLead[]; currentStatus: string }) {
  if (quotes.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No quotes found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Quotes are generated when leads provide project details
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-4">
        <Select defaultValue={currentStatus || 'all'}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <Link href="/admin/quotes" className="block w-full">All Quotes</Link>
            </SelectItem>
            <SelectItem value="draft">
              <Link href="/admin/quotes?status=draft" className="block w-full">Drafts</Link>
            </SelectItem>
            <SelectItem value="sent">
              <Link href="/admin/quotes?status=sent" className="block w-full">Sent</Link>
            </SelectItem>
            <SelectItem value="won">
              <Link href="/admin/quotes?status=won" className="block w-full">Won</Link>
            </SelectItem>
            <SelectItem value="lost">
              <Link href="/admin/quotes?status=lost" className="block w-full">Lost</Link>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead Name</TableHead>
              <TableHead>Project Type</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => {
              const status = getQuoteStatus(quote);
              const config = STATUS_CONFIG[status];
              const StatusIcon = config.icon;

              return (
                <TableRow key={quote.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/admin/leads/${quote.lead_id}`} className="block">
                      {quote.leads?.name || 'Unknown'}
                      <p className="text-sm text-muted-foreground">
                        {quote.leads?.email}
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {quote.leads?.project_type
                      ? PROJECT_TYPE_LABELS[quote.leads.project_type] || quote.leads.project_type
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(quote.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {quote.sent_at ? formatDate(quote.sent_at) : formatDate(quote.created_at)}
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

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const { quotes } = await getQuotes(searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Quotes</h2>
        <p className="text-muted-foreground">
          Manage all your quote drafts and sent quotes.
        </p>
      </div>

      <Suspense fallback={<QuotesTableSkeleton />}>
        <QuotesTable quotes={quotes} currentStatus={params.status || ''} />
      </Suspense>
    </div>
  );
}
