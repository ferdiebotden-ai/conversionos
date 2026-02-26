/**
 * Single Assembly Template API
 * GET /api/admin/templates/[id] — Get template
 * PUT /api/admin/templates/[id] — Update template
 * DELETE /api/admin/templates/[id] — Delete template
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

const TemplateItemSchema = z.object({
  description: z.string().min(1).max(500),
  category: z.enum(['materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other']),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  unit_price: z.number().nonnegative(),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'general', 'other']).optional(),
  description: z.string().max(1000).optional().nullable(),
  items: z.array(TemplateItemSchema).min(1).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/templates/[id]
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'assembly_templates')) {
      return NextResponse.json(
        { error: 'Assembly templates require the Accelerate plan or higher' },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const supabase = createServiceClient();

    const { data, error } = await (supabase as any).from('assembly_templates')
      .select('*')
      .eq('id', id)
      .eq('site_id', getSiteId())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Template fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/templates/[id]
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'assembly_templates')) {
      return NextResponse.json(
        { error: 'Assembly templates require the Accelerate plan or higher' },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const validation = UpdateTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validation.data.name !== undefined) updates['name'] = validation.data.name;
    if (validation.data.category !== undefined) updates['category'] = validation.data.category;
    if (validation.data.description !== undefined) updates['description'] = validation.data.description;
    if (validation.data.items !== undefined) updates['items'] = JSON.stringify(validation.data.items);

    const supabase = createServiceClient();

    const { data, error } = await (supabase as any).from('assembly_templates')
      .update(updates)
      .eq('id', id)
      .eq('site_id', getSiteId())
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Template not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Template update error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/templates/[id]
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'assembly_templates')) {
      return NextResponse.json(
        { error: 'Assembly templates require the Accelerate plan or higher' },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const supabase = createServiceClient();

    const { error } = await (supabase as any).from('assembly_templates')
      .delete()
      .eq('id', id)
      .eq('site_id', getSiteId());

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Template delete error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
