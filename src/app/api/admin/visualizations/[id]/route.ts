/**
 * Admin API: Update visualization assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

const updateSchema = z.object({
  admin_notes: z.string().nullable().optional(),
  selected_concept_index: z.number().int().min(0).max(3).nullable().optional(),
  contractor_feasibility_score: z.number().int().min(1).max(5).nullable().optional(),
  estimated_cost_impact: z.string().nullable().optional(),
  technical_concerns: z.array(z.string()).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'admin_dashboard')) {
      return NextResponse.json({ error: 'Admin dashboard requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { id: visualizationId } = await params;
    const body = await request.json();

    // Validate request body
    const parseResult = updateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const updates = parseResult.data;
    const supabase = createServiceClient();

    // Update the visualization
    const { data, error } = await supabase
      .from('visualizations')
      .update({
        admin_notes: updates.admin_notes,
        selected_concept_index: updates.selected_concept_index,
        contractor_feasibility_score: updates.contractor_feasibility_score,
        estimated_cost_impact: updates.estimated_cost_impact,
        technical_concerns: updates.technical_concerns,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visualizationId)
      .eq('site_id', siteId)
      .select()
      .single();

    if (error) {
      console.error('Error updating visualization:', error);
      return NextResponse.json(
        { error: 'Failed to update visualization' },
        { status: 500 }
      );
    }

    return NextResponse.json({ visualization: data });
  } catch (error) {
    console.error('Update visualization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'admin_dashboard')) {
      return NextResponse.json({ error: 'Admin dashboard requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { id: visualizationId } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('visualizations')
      .select('*')
      .eq('id', visualizationId)
      .eq('site_id', siteId)
      .single();

    if (error) {
      console.error('Error fetching visualization:', error);
      return NextResponse.json(
        { error: 'Visualization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ visualization: data });
  } catch (error) {
    console.error('Fetch visualization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
