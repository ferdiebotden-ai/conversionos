import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import { DrawingCreateSchema } from '@/lib/schemas/drawing';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { DrawingStatus } from '@/types/database';

/**
 * GET /api/drawings
 * List drawings with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'drawings')) {
      return NextResponse.json({ error: 'Drawings require the Accelerate plan or higher' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leadId = searchParams.get('lead_id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    let query = supabase
      .from('drawings')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status as DrawingStatus);
    }
    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data: drawings, count, error } = await query;

    if (error) {
      console.error('Error fetching drawings:', error);
      return NextResponse.json({ error: 'Failed to fetch drawings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: drawings || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Drawings list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/drawings
 * Create a new drawing
 */
export async function POST(request: NextRequest) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'drawings')) {
      return NextResponse.json({ error: 'Drawings require the Accelerate plan or higher' }, { status: 403 });
    }

    const body = await request.json();
    const validation = DrawingCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const drawingData = {
      name: validation.data.name,
      description: validation.data.description ?? null,
      lead_id: validation.data.lead_id ?? null,
    };

    const { data: drawing, error } = await supabase
      .from('drawings')
      .insert(withSiteId(drawingData, siteId))
      .select('*')
      .single();

    if (error) {
      console.error('Error creating drawing:', error);
      return NextResponse.json({ error: 'Failed to create drawing' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: drawing });
  } catch (error) {
    console.error('Drawing create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
