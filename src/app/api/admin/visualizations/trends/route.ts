/**
 * Admin API: Visualization Trends
 * Returns daily aggregated visualization data for the analytics dashboard.
 * Dominate tier only (analytics_dashboard entitlement).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

export async function GET(request: NextRequest) {
  const tier = await getTier();
  if (!canAccess(tier, 'analytics_dashboard')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const siteId = await getSiteIdAsync();
    const { searchParams } = new URL(request.url);
    const rawDays = parseInt(searchParams.get('days') || '30', 10);
    const days = Math.max(1, Math.min(365, isNaN(rawDays) ? 30 : rawDays));

    const supabase = createServiceClient();
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Query visualizations for the period
    const { data: visualizations, error } = await (supabase
      .from('visualizations') as ReturnType<typeof supabase.from>)
      .select('id, created_at, room_type, generation_time_ms, source, generated_concepts')
      .eq('site_id', siteId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true }) as {
        data: Array<{
          id: string;
          created_at: string;
          room_type: string;
          generation_time_ms: number | null;
          source: string | null;
          generated_concepts: unknown[] | null;
        }> | null;
        error: { message: string } | null;
      };

    if (error) {
      console.error('Trends query error:', error);
      return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
    }

    // Also get total leads for conversion calculation
    const { count: leadCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('created_at', since.toISOString());

    // Chat-only leads (no photo/visualizer)
    const { count: chatOnlyLeadCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('source', 'chat_no_photo')
      .gte('created_at', since.toISOString());

    // Also get previous period data for delta calculation
    const previousSince = new Date(since);
    previousSince.setDate(previousSince.getDate() - days);

    const { data: previousVisualizations } = await (supabase
      .from('visualizations') as ReturnType<typeof supabase.from>)
      .select('id, generation_time_ms, generated_concepts')
      .eq('site_id', siteId)
      .gte('created_at', previousSince.toISOString())
      .lt('created_at', since.toISOString()) as {
        data: Array<{
          id: string;
          generation_time_ms: number | null;
          generated_concepts: unknown[] | null;
        }> | null;
      };

    const { count: previousLeadCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .gte('created_at', previousSince.toISOString())
      .lt('created_at', since.toISOString());

    const { count: prevChatOnlyLeadCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('source', 'chat_no_photo')
      .gte('created_at', previousSince.toISOString())
      .lt('created_at', since.toISOString());

    // Aggregate daily metrics
    const dailyMap = new Map<string, { count: number; totalTime: number }>();
    const roomTypeCounts: Record<string, number> = {};
    const modeCounts: Record<string, number> = {};
    let totalGenTime = 0;
    let totalConcepts = 0;
    let conceptsWithData = 0;

    for (const v of visualizations || []) {
      const day = v.created_at.split('T')[0] ?? v.created_at;
      const existing = dailyMap.get(day) || { count: 0, totalTime: 0 };
      existing.count++;
      existing.totalTime += v.generation_time_ms || 0;
      dailyMap.set(day, existing);

      totalGenTime += v.generation_time_ms || 0;

      if (v.room_type) {
        roomTypeCounts[v.room_type] = (roomTypeCounts[v.room_type] || 0) + 1;
      }

      const mode = v.source?.includes('conversation') ? 'conversation' : 'quick';
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;

      const conceptCount = Array.isArray(v.generated_concepts) ? v.generated_concepts.length : 0;
      if (conceptCount > 0) {
        totalConcepts += conceptCount;
        conceptsWithData++;
      }
    }

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      visualizations: data.count,
      avgGenerationTime: data.count > 0 ? Math.round(data.totalTime / data.count / 1000) : 0,
    }));

    // Current period totals
    const totalViz = visualizations?.length || 0;
    const avgGenTimeSec = totalViz > 0 ? Math.round(totalGenTime / totalViz / 1000) : 0;
    const conversionRate = totalViz > 0 ? Math.round(((leadCount || 0) / totalViz) * 100) : 0;
    const avgConcepts = conceptsWithData > 0 ? Math.round((totalConcepts / conceptsWithData) * 10) / 10 : 0;

    // Previous period totals for deltas
    const prevTotalViz = previousVisualizations?.length || 0;
    const prevTotalGenTime = previousVisualizations?.reduce((sum, v) => sum + (v.generation_time_ms || 0), 0) || 0;
    const prevAvgGenTimeSec = prevTotalViz > 0 ? Math.round(prevTotalGenTime / prevTotalViz / 1000) : 0;
    const prevConversionRate = prevTotalViz > 0 ? Math.round(((previousLeadCount || 0) / prevTotalViz) * 100) : 0;

    return NextResponse.json({
      daily,
      byRoomType: roomTypeCounts,
      byMode: modeCounts,
      totalVisualizations: totalViz,
      totalLeads: leadCount || 0,
      chatOnlyLeads: chatOnlyLeadCount || 0,
      avgGenerationTime: avgGenTimeSec,
      conversionRate,
      avgConcepts,
      period: days,
      deltas: {
        visualizations: prevTotalViz > 0 ? Math.round(((totalViz - prevTotalViz) / prevTotalViz) * 100) : null,
        avgGenerationTime: prevAvgGenTimeSec > 0 ? Math.round(((avgGenTimeSec - prevAvgGenTimeSec) / prevAvgGenTimeSec) * 100) : null,
        conversionRate: prevConversionRate > 0 ? conversionRate - prevConversionRate : null,
        leads: (previousLeadCount || 0) > 0 ? Math.round((((leadCount || 0) - (previousLeadCount || 0)) / (previousLeadCount || 0)) * 100) : null,
        chatOnlyLeads: (prevChatOnlyLeadCount || 0) > 0 ? Math.round((((chatOnlyLeadCount || 0) - (prevChatOnlyLeadCount || 0)) / (prevChatOnlyLeadCount || 0)) * 100) : null,
      },
    });
  } catch (error) {
    console.error('Trends fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
