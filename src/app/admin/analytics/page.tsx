import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import { redirect } from 'next/navigation';
import { AnalyticsDashboard } from './analytics-dashboard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const tier = await getTier();
  if (!canAccess(tier, 'analytics_dashboard')) {
    redirect('/admin');
  }
  return <AnalyticsDashboard />;
}
