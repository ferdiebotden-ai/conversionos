import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import { PaymentRecordSchema } from '@/lib/schemas/invoice';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { Json } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/invoices/[id]/payments
 * List payments for an invoice
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'invoicing')) {
      return NextResponse.json({ error: 'Invoicing requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { id } = await context.params;
    const supabase = createServiceClient();

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .eq('site_id', siteId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: payments || [] });
  } catch (error) {
    console.error('Payments list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/invoices/[id]/payments
 * Record a new payment against an invoice
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'invoicing')) {
      return NextResponse.json({ error: 'Invoicing requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validation = PaymentRecordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify invoice exists and isn't cancelled
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, lead_id, status, balance_due')
      .eq('id', id)
      .eq('site_id', siteId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot record payment on a cancelled invoice' },
        { status: 400 }
      );
    }

    if (validation.data.amount > Number(invoice.balance_due)) {
      return NextResponse.json(
        { error: 'Payment amount exceeds balance due' },
        { status: 400 }
      );
    }

    const paymentData = {
      invoice_id: id,
      amount: validation.data.amount,
      payment_method: validation.data.payment_method,
      ...(validation.data.payment_date ? { payment_date: validation.data.payment_date } : {}),
      reference_number: validation.data.reference_number ?? null,
      notes: validation.data.notes ?? null,
    };

    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert(withSiteId(paymentData, siteId))
      .select('*')
      .single();

    if (insertError) {
      console.error('Error recording payment:', insertError);
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      );
    }

    // Audit log
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: invoice.lead_id,
      action: 'payment_recorded',
      new_values: {
        payment_id: payment.id,
        amount: validation.data.amount,
        method: validation.data.payment_method,
      } as unknown as Json,
    }, siteId));

    // Fetch updated invoice to return current state
    const { data: updatedInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('site_id', siteId)
      .single();

    return NextResponse.json({
      success: true,
      data: { payment, invoice: updatedInvoice },
    });
  } catch (error) {
    console.error('Payment record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
