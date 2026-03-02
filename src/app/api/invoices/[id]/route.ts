import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId, withSiteId } from '@/lib/db/site';
import { InvoiceUpdateSchema } from '@/lib/schemas/invoice';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { InvoiceUpdate, Json } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/invoices/[id]
 * Get invoice detail with payments
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'invoicing')) {
      return NextResponse.json({ error: 'Invoicing requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { id } = await context.params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('site_id', getSiteId())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      console.error('Error fetching invoice:', error);
      return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
    }

    // Fetch payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .eq('site_id', getSiteId())
      .order('payment_date', { ascending: false });

    return NextResponse.json({
      success: true,
      data: { ...invoice, payments: payments || [] },
    });
  } catch (error) {
    console.error('Invoice detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/invoices/[id]
 * Update invoice metadata (status, notes, due date)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'invoicing')) {
      return NextResponse.json({ error: 'Invoicing requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { id } = await context.params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 });
    }

    const body = await request.json();
    const validation = InvoiceUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Build update object explicitly for strict optional types
    const updatePayload: InvoiceUpdate = {};
    const d = validation.data;
    if (d.status !== undefined) updatePayload.status = d.status;
    if (d.notes !== undefined) updatePayload.notes = d.notes;
    if (d.internal_notes !== undefined) updatePayload.internal_notes = d.internal_notes;
    if (d.due_date !== undefined) updatePayload.due_date = d.due_date;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', id)
      .eq('site_id', getSiteId())
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      console.error('Error updating invoice:', error);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: invoice.lead_id,
      action: 'invoice_updated',
      new_values: validation.data as unknown as Json,
    }));

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/invoices/[id]
 * Cancel an invoice (soft delete via status change)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'invoicing')) {
      return NextResponse.json({ error: 'Invoicing requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { id } = await context.params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID format' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('site_id', getSiteId())
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      console.error('Error cancelling invoice:', error);
      return NextResponse.json({ error: 'Failed to cancel invoice' }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: invoice.lead_id,
      action: 'invoice_cancelled',
      new_values: { invoice_id: id } as unknown as Json,
    }));

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Invoice cancel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
