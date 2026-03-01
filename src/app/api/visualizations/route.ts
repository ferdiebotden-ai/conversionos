/**
 * Visualizations API Route
 * CRUD operations for saved visualizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { z } from 'zod';

// Schema for updating a visualization (save with email)
const saveVisualizationSchema = z.object({
  visualizationId: z.string().uuid(),
  email: z.string().email(),
  share: z.boolean().optional(),
});

// GET: List visualizations (requires auth in production)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shareToken = searchParams.get('token');

  const supabase = createServiceClient();

  if (shareToken) {
    // Get shared visualization by token
    const { data, error } = await supabase
      .from('visualizations')
      .select('*')
      .eq('share_token', shareToken)
      .eq('site_id', getSiteId())
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Visualization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  }

  // List all (would require admin auth in production)
  const { data, error } = await supabase
    .from('visualizations')
    .select('*')
    .eq('site_id', getSiteId())
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Visualizations fetch error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Save visualization with email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = saveVisualizationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { visualizationId, email, share } = parseResult.data;
    const supabase = createServiceClient();

    // Update visualization with email
    const { data, error } = await supabase
      .from('visualizations')
      .update({
        email,
        shared: share ?? false,
      })
      .eq('id', visualizationId)
      .eq('site_id', getSiteId())
      .select()
      .single();

    if (error) {
      console.error('Save visualization error:', error);
      return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
    }

    // Generate share URL
    const shareUrl = data.share_token
      ? `https://${request.headers.get('host') || ''}/visualizer/share/${data.share_token}`
      : null;

    return NextResponse.json({
      success: true,
      visualization: data,
      shareUrl,
    });
  } catch (error) {
    console.error('Save visualization error:', error);
    return NextResponse.json(
      { error: 'Failed to save visualization' },
      { status: 500 }
    );
  }
}
