/**
 * Lead Audit Log API
 * GET /api/leads/[id]/audit - Get audit entries for a lead
 * [DEV-060]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/leads/[id]/audit
 * Get audit log entries for a specific lead
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const siteId = await getSiteIdAsync();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', id)
      .eq('site_id', siteId)
      .single();

    if (leadError) {
      if (leadError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching lead:', leadError);
      return NextResponse.json(
        { error: 'Failed to fetch lead' },
        { status: 500 }
      );
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch audit log entries for this lead
    const { data: entries, error: auditError, count } = await supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('lead_id', id)
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      console.error('Error fetching audit log:', auditError);
      return NextResponse.json(
        { error: 'Failed to fetch audit log' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entries || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Audit log fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
