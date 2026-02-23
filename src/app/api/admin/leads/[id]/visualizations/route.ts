/**
 * Admin API: Get visualizations for a lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const supabase = createServiceClient();

    // Try junction table first (if it exists after migration)
    // Using raw query to handle table not existing
    try {
      const { data: linkedViz, error: linkError } = await supabase
        .from('lead_visualizations' as 'visualizations') // Type assertion for unmigrated schema
        .select(`
          is_primary,
          admin_selected,
          visualization:visualizations (
            id,
            original_photo_url,
            room_type,
            style,
            constraints,
            generated_concepts,
            generation_time_ms,
            photo_analysis,
            conversation_context,
            concept_pricing,
            admin_notes,
            selected_concept_index,
            contractor_feasibility_score,
            estimated_cost_impact,
            technical_concerns,
            created_at
          )
        `)
        .eq('lead_id', leadId)
        .eq('site_id', getSiteId())
        .order('is_primary', { ascending: false });

      if (!linkError && linkedViz && linkedViz.length > 0) {
        // Return visualizations from junction table
        type LinkedVizRow = {
          is_primary: boolean;
          admin_selected: boolean;
          visualization: Record<string, unknown>;
        };
        const visualizations = (linkedViz as unknown as LinkedVizRow[]).map((lv) => ({
          ...lv.visualization,
          is_primary: lv.is_primary,
          admin_selected: lv.admin_selected,
        }));

        return NextResponse.json({ visualizations });
      }
    } catch (junctionError) {
      // Junction table doesn't exist yet, fall through to direct query
      console.log('Junction table not available, using direct query');
    }

    // Fallback: Get visualizations directly linked to lead (current schema)
    const { data: directViz, error: directError } = await supabase
      .from('visualizations')
      .select('*')
      .eq('lead_id', leadId)
      .eq('site_id', getSiteId())
      .order('created_at', { ascending: false });

    if (directError) {
      console.error('Error fetching visualizations:', directError);
      return NextResponse.json(
        { error: 'Failed to fetch visualizations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ visualizations: directViz || [] });
  } catch (error) {
    console.error('Visualization fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Link a visualization to this lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { visualizationId, isPrimary, adminSelected } = body;

    if (!visualizationId) {
      return NextResponse.json(
        { error: 'visualizationId is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // For now, just update the visualization directly with lead_id
    // Junction table support will be added when migration is applied
    const { error: updateError } = await supabase
      .from('visualizations')
      .update({ lead_id: leadId })
      .eq('id', visualizationId)
      .eq('site_id', getSiteId());

    if (updateError) {
      console.error('Error linking visualization:', updateError);
      return NextResponse.json(
        { error: 'Failed to link visualization' },
        { status: 500 }
      );
    }

    return NextResponse.json({ linked: true, visualizationId, leadId });
  } catch (error) {
    console.error('Link visualization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
