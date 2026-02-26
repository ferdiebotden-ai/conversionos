/**
 * Contractor Price List API
 * POST /api/admin/prices — Upload CSV (replaces all prices for tenant)
 * GET /api/admin/prices — List all uploaded prices
 * DELETE /api/admin/prices — Clear all prices
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Papa from 'papaparse';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId, withSiteId } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

const VALID_CATEGORIES = [
  'materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other',
] as const;

const CsvRowSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(200),
  category: z.enum(VALID_CATEGORIES, { message: 'Invalid category. Must be one of: materials, labor, contract, permit, equipment, allowances, other' }),
  unit: z.string().min(1).max(20).default('ea'),
  unit_price: z.coerce.number().positive('Unit price must be positive'),
  supplier: z.string().max(200).optional().nullable(),
});

/**
 * POST /api/admin/prices — Upload CSV
 */
export async function POST(request: NextRequest) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'csv_price_upload')) {
      return NextResponse.json(
        { error: 'CSV price upload requires the Accelerate plan or higher' },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('csv');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No CSV file provided. Upload a file with field name "csv".' },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 },
      );
    }

    const text = await file.text();
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse CSV', details: parsed.errors.map(e => e.message) },
        { status: 400 },
      );
    }

    const validRows: z.infer<typeof CsvRowSchema>[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < parsed.data.length; i++) {
      const result = CsvRowSchema.safeParse(parsed.data[i]);
      if (result.success) {
        validRows.push(result.data);
      } else {
        const messages = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
        errors.push({ row: i + 2, message: messages.join('; ') });
      }
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows found in CSV', errors },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const siteId = getSiteId();

    // Delete existing prices for this tenant
    await (supabase as any).from('contractor_prices')
      .delete()
      .eq('site_id', siteId);

    // Insert validated rows
    const insertData = validRows.map(row => withSiteId({
      item_name: row.item_name,
      category: row.category,
      unit: row.unit,
      unit_price: row.unit_price,
      supplier: row.supplier ?? null,
    }));

    const { error: insertError } = await (supabase as any).from('contractor_prices')
      .insert(insertData);

    if (insertError) {
      console.error('Error inserting contractor prices:', insertError);
      return NextResponse.json(
        { error: 'Failed to save prices' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      imported: validRows.length,
      errors,
    });
  } catch (error) {
    console.error('Price upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV upload' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/prices — List uploaded prices
 */
export async function GET() {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'csv_price_upload')) {
      return NextResponse.json(
        { error: 'CSV price upload requires the Accelerate plan or higher' },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await (supabase as any).from('contractor_prices')
      .select('*')
      .eq('site_id', getSiteId())
      .order('category')
      .order('item_name');

    if (error) {
      console.error('Error fetching contractor prices:', error);
      return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
    }

    const prices = data ?? [];
    const uploadedAt = prices.length > 0 ? prices[0].uploaded_at : null;

    return NextResponse.json({
      success: true,
      data: prices,
      count: prices.length,
      uploadedAt,
    });
  } catch (error) {
    console.error('Price list error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/prices — Clear all prices
 */
export async function DELETE() {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'csv_price_upload')) {
      return NextResponse.json(
        { error: 'CSV price upload requires the Accelerate plan or higher' },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    const { count, error } = await (supabase as any).from('contractor_prices')
      .delete({ count: 'exact' })
      .eq('site_id', getSiteId());

    if (error) {
      console.error('Error clearing contractor prices:', error);
      return NextResponse.json({ error: 'Failed to clear prices' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: count ?? 0,
    });
  } catch (error) {
    console.error('Price clear error:', error);
    return NextResponse.json({ error: 'Failed to clear prices' }, { status: 500 });
  }
}
