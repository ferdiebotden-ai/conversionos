import Link from 'next/link';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { MetricsCards } from '@/components/admin/metrics-cards';
import { RecentLeads } from '@/components/admin/recent-leads';
import { VisualizationMetricsWidget } from '@/components/admin/visualization-metrics-widget';
import { InvoiceMetricsWidget } from '@/components/admin/invoice-metrics-widget';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  const supabase = createServiceClient();

  // Get today's date boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  // Fetch leads counts
  const siteId = getSiteId();

  const [
    { count: _todayCount },
    { count: weekCount },
    { count: monthCount },
    { count: newStatusCount },
    { data: recentLeads },
    { count: totalLeads },
    { count: sentQuotes },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('created_at', today.toISOString()),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('created_at', weekAgo.toISOString()),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('created_at', monthAgo.toISOString()),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'new'),
    supabase
      .from('leads')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'sent'),
  ]);

  // Calculate conversion rate
  const conversionRate = totalLeads && sentQuotes
    ? Math.round((sentQuotes / totalLeads) * 100)
    : 0;

  // Get average quote value from quote_drafts
  const { data: quoteData } = await supabase
    .from('quote_drafts')
    .select('total')
    .eq('site_id', siteId)
    .not('total', 'is', null)
    .gte('created_at', monthAgo.toISOString());

  const avgQuoteValue = quoteData && quoteData.length > 0
    ? Math.round(
        quoteData.reduce((sum, q) => sum + (Number(q.total) || 0), 0) / quoteData.length
      )
    : 0;

  return {
    metrics: {
      newLeads: {
        today: newStatusCount || 0,
        week: weekCount || 0,
        month: monthCount || 0,
        trend: 0, // TODO: Calculate week-over-week trend
      },
      conversionRate,
      averageQuoteValue: avgQuoteValue,
      avgResponseTime: '< 2h', // TODO: Calculate actual response time
    },
    recentLeads: recentLeads || [],
  };
}

export default async function AdminDashboardPage() {
  const { metrics, recentLeads } = await getDashboardData();

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h2 className="text-2xl font-bold">Welcome back!</h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your leads today.
        </p>
      </div>

      {/* Metrics */}
      <MetricsCards data={metrics} />

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent leads */}
        <RecentLeads leads={recentLeads} />

        {/* Visualization metrics widget */}
        <VisualizationMetricsWidget />
      </div>

      {/* Quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/admin/leads?status=new"
              className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <p className="font-medium">Review new leads</p>
              <p className="text-sm text-muted-foreground">
                {metrics.newLeads.today} leads need attention
              </p>
            </Link>
            <Link
              href="/admin/leads?status=draft_ready"
              className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <p className="font-medium">Send pending quotes</p>
              <p className="text-sm text-muted-foreground">
                Quotes ready to be sent to customers
              </p>
            </Link>
            <a
              href="/estimate"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <p className="font-medium">Test AI Quote Assistant</p>
              <p className="text-sm text-muted-foreground">
                Try the customer-facing chat experience
              </p>
            </a>
          </div>
        </div>

        {/* Invoice metrics */}
        <InvoiceMetricsWidget />
      </div>
    </div>
  );
}
