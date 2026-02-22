import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { DrawingUpdateSchema } from '@/lib/schemas/drawing';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { Json } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/drawings/[id]
 * Get drawing detail
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'drawings')) {
      return NextResponse.json({ error: 'Drawings require the Accelerate plan or higher' }, { status: 403 });
    }

    const { id } = await context.params;
    const supabase = createServiceClient();

    const { data: drawing, error } = await supabase
      .from('drawings')
      .select('*')
      .eq('id', id)
      .eq('site_id', getSiteId())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
      }
      console.error('Error fetching drawing:', error);
      return NextResponse.json({ error: 'Failed to fetch drawing' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: drawing });
  } catch (error) {
    console.error('Drawing detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/drawings/[id]
 * Update drawing (metadata or CAD state)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'drawings')) {
      return NextResponse.json({ error: 'Drawings require the Accelerate plan or higher' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validation = DrawingUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const updateData: Record<string, unknown> = {};
    const input = validation.data;
    if (input['name'] !== undefined) updateData['name'] = input['name'];
    if (input['description'] !== undefined) updateData['description'] = input['description'];
    if (input['lead_id'] !== undefined) updateData['lead_id'] = input['lead_id'];
    if (input['drawing_data'] !== undefined) updateData['drawing_data'] = input['drawing_data'] as Json;
    if (input['status'] !== undefined) updateData['status'] = input['status'];
    if (input['permit_number'] !== undefined) updateData['permit_number'] = input['permit_number'];

    const { data: drawing, error } = await supabase
      .from('drawings')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Drawing not found' }, { status: 404 });
      }
      console.error('Error updating drawing:', error);
      return NextResponse.json({ error: 'Failed to update drawing' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: drawing });
  } catch (error) {
    console.error('Drawing update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/drawings/[id]
 * Delete a drawing
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'drawings')) {
      return NextResponse.json({ error: 'Drawings require the Accelerate plan or higher' }, { status: 403 });
    }

    const { id } = await context.params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('drawings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting drawing:', error);
      return NextResponse.json({ error: 'Failed to delete drawing' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Drawing delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
