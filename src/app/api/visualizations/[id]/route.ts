/**
 * Individual Visualization API Route
 * Get, update, delete operations for a single visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { z } from 'zod';

// Schema for updating a visualization
const updateVisualizationSchema = z.object({
  email: z.string().email().nullish(),
  shared: z.boolean().optional(),
  downloaded: z.boolean().optional(),
  lead_id: z.string().uuid().nullish(),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET: Get a single visualization by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('visualizations')
    .select('*')
    .eq('id', id)
    .eq('site_id', getSiteId())
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Visualization not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}

// PATCH: Update a visualization
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = updateVisualizationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Transform data to match Supabase's nullable types
    const updateData: Record<string, unknown> = {};
    if (parseResult.data.email !== undefined) {
      updateData['email'] = parseResult.data.email ?? null;
    }
    if (parseResult.data.shared !== undefined) {
      updateData['shared'] = parseResult.data.shared;
    }
    if (parseResult.data.downloaded !== undefined) {
      updateData['downloaded'] = parseResult.data.downloaded;
    }
    if (parseResult.data.lead_id !== undefined) {
      updateData['lead_id'] = parseResult.data.lead_id ?? null;
    }

    const { data, error } = await supabase
      .from('visualizations')
      .update(updateData)
      .eq('id', id)
      .eq('site_id', getSiteId())
      .select()
      .single();

    if (error) {
      console.error('Update visualization error:', error);
      return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Update visualization error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

// POST: Increment download count
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // First get the current count
    const { data: current, error: fetchError } = await supabase
      .from('visualizations')
      .select('download_count')
      .eq('id', id)
      .eq('site_id', getSiteId())
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Visualization not found' },
        { status: 404 }
      );
    }

    // Increment the download count
    const { data, error } = await supabase
      .from('visualizations')
      .update({
        downloaded: true,
        download_count: (current.download_count || 0) + 1,
      })
      .eq('id', id)
      .eq('site_id', getSiteId())
      .select()
      .single();

    if (error) {
      console.error('Download tracking error:', error);
      return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, download_count: data.download_count });
  } catch (error) {
    console.error('Download tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track download' },
      { status: 500 }
    );
  }
}
