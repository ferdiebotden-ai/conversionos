/**
 * Visualization Share API Route
 * Records a share event when a customer emails starred concepts to themselves
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { z } from 'zod';

const shareSchema = z.object({
  email: z.string().email(),
  conceptIndices: z.array(z.number().int().min(0)),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = shareSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const siteId = getSiteId();

    // Verify visualization exists and belongs to this tenant
    const { data: viz, error: fetchError } = await supabase
      .from('visualizations')
      .select('id, generated_concepts')
      .eq('id', id)
      .eq('site_id', siteId)
      .single();

    if (fetchError || !viz) {
      return NextResponse.json(
        { error: 'Visualization not found' },
        { status: 404 }
      );
    }

    // Store the share event on the visualization record
    // (email sending would be added later with a mail provider)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- client_favourited_concepts not in generated types
    const { error: updateError } = await (supabase as any)
      .from('visualizations')
      .update({
        email: parseResult.data.email,
        shared: true,
        client_favourited_concepts: parseResult.data.conceptIndices,
      })
      .eq('id', id)
      .eq('site_id', siteId);

    if (updateError) {
      console.error('Share update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to record share event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      visualizationId: id,
      email: parseResult.data.email,
      conceptIndices: parseResult.data.conceptIndices,
    });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
