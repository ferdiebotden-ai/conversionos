/**
 * Assembly Templates API
 * GET /api/admin/templates — List all templates for tenant
 * POST /api/admin/templates — Create a new template
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

const TemplateItemSchema = z.object({
  description: z.string().min(1).max(500),
  category: z.enum(['materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other']),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  unit_price: z.number().nonnegative(),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  category: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'general', 'other']),
  description: z.string().max(1000).optional().nullable(),
  items: z.array(TemplateItemSchema).min(1, 'Template must have at least one item'),
  is_default: z.boolean().optional(),
});

/**
 * GET /api/admin/templates — List templates
 */
export async function GET(request: NextRequest) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'assembly_templates')) {
      return NextResponse.json(
        { error: 'Assembly templates require the Accelerate plan or higher' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const supabase = createServiceClient();
    let query = (supabase as any).from('assembly_templates')
      .select('*')
      .eq('site_id', siteId)
      .order('category')
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (error) {
    console.error('Templates list error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

/**
 * POST /api/admin/templates — Create template
 */
export async function POST(request: NextRequest) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'assembly_templates')) {
      return NextResponse.json(
        { error: 'Assembly templates require the Accelerate plan or higher' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = CreateTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { name, category, description, items, is_default } = validation.data;
    const supabase = createServiceClient();

    const { data, error } = await (supabase as any).from('assembly_templates')
      .insert(withSiteId({
        name,
        category,
        description: description ?? null,
        items: JSON.stringify(items),
        is_default: is_default ?? false,
      }, siteId))
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Template create error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
