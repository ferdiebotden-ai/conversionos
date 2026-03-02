/**
 * Admin API: Visualization Metrics Summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

export async function GET(request: NextRequest) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'admin_dashboard')) {
      return NextResponse.json({ error: 'Admin dashboard requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const supabase = createServiceClient();

    // Get summary metrics - function may not exist before migration
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- rpc name not in generated types
    const { data: summary, error: summaryError } = await (supabase.rpc as Function)(
      'get_visualization_summary',
      { p_site_id: siteId, p_days: days }
    );

    if (summaryError) {
      // If function doesn't exist, fall back to direct query
      console.warn('Summary function not available, using fallback query');

      const { data: metrics, error: metricsError } = await supabase
        .from('visualization_metrics' as 'visualizations')
        .select('*')
        .eq('site_id', siteId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()) as { data: Array<{
          generation_time_ms: number;
          structure_validation_score: number | null;
          proceeded_to_quote: boolean;
          admin_selected: boolean;
          mode: string;
          retry_count: number;
          estimated_cost_usd: number;
        }> | null; error: Error | null };

      if (metricsError) {
        return NextResponse.json(
          { error: 'Failed to fetch metrics' },
          { status: 500 }
        );
      }

      // Calculate summary manually
      const total = metrics?.length || 0;
      const avgGenTime = total > 0
        ? metrics!.reduce((sum, m) => sum + (m.generation_time_ms || 0), 0) / total
        : 0;
      const avgValidation = metrics?.filter(m => m.structure_validation_score).length
        ? metrics!.reduce((sum, m) => sum + (m.structure_validation_score || 0), 0) /
          metrics!.filter(m => m.structure_validation_score).length
        : null;
      const quoteConversions = metrics?.filter(m => m.proceeded_to_quote).length || 0;
      const adminSelections = metrics?.filter(m => m.admin_selected).length || 0;
      const conversationModeCount = metrics?.filter(m => m.mode === 'conversation').length || 0;
      const totalCost = metrics?.reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0) || 0;

      const retrySum = metrics?.reduce((sum, m) => sum + (m.retry_count || 0), 0) ?? 0;

      return NextResponse.json({
        summary: {
          total_visualizations: total,
          avg_generation_time_ms: Math.round(avgGenTime),
          avg_validation_score: avgValidation,
          retry_rate: retrySum / Math.max(total, 1),
          quote_conversion_rate: total > 0 ? (quoteConversions / total) * 100 : 0,
          admin_selection_rate: total > 0 ? (adminSelections / total) * 100 : 0,
          conversation_mode_rate: total > 0 ? (conversationModeCount / total) * 100 : 0,
          total_cost_usd: totalCost,
          avg_cost_per_visualization: total > 0 ? totalCost / total : 0,
        },
        feasibilityDistribution: {},
        days,
      });
    }

    return NextResponse.json({
      summary: summary?.[0] || {},
      feasibilityDistribution: {},
      days,
    });
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
