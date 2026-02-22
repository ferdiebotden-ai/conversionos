import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId, withSiteId } from '@/lib/db/site';
import { InvoiceCreateSchema } from '@/lib/schemas/invoice';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { InvoiceStatus, Json } from '@/types/database';

const HST_PERCENT = 13;
const DEPOSIT_PERCENT = 50;

/**
 * GET /api/invoices
 * List invoices with optional status filter and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'invoicing')) {
      return NextResponse.json({ error: 'Invoicing requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('site_id', getSiteId())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status as InvoiceStatus);
    }

    const { data: invoices, count, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoices || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Invoice list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices
 * Create an invoice from an accepted quote
 */
export async function POST(request: NextRequest) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'invoicing')) {
      return NextResponse.json({ error: 'Invoicing requires the Accelerate plan or higher' }, { status: 403 });
    }

    const body = await request.json();
    const validation = InvoiceCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { lead_id, quote_draft_id, notes, due_date } = validation.data;
    const supabase = createServiceClient();

    // Fetch lead + quote data
    const [leadResult, quoteResult] = await Promise.all([
      supabase.from('leads').select('*').eq('id', lead_id).eq('site_id', getSiteId()).single(),
      supabase.from('quote_drafts').select('*').eq('id', quote_draft_id).eq('site_id', getSiteId()).single(),
    ]);

    if (leadResult.error || !leadResult.data) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (quoteResult.error || !quoteResult.data) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const lead = leadResult.data;
    const quote = quoteResult.data;

    // Generate sequential invoice number
    const { data: seqData, error: seqError } = await supabase
      .rpc('next_invoice_number' as never, { p_site_id: getSiteId() } as never);

    if (seqError) {
      console.error('Error generating invoice number:', seqError);
      return NextResponse.json(
        { error: 'Failed to generate invoice number' },
        { status: 500 }
      );
    }

    const invoiceNumber = seqData as unknown as string;

    // Calculate totals from quote
    const subtotal = Number(quote.subtotal) || 0;
    const contingencyPercent = Number(quote.contingency_percent) || 0;
    const contingencyAmount = Number(quote.contingency_amount) || 0;
    const subtotalWithContingency = subtotal + contingencyAmount;
    const hstAmount = Number(quote.hst_amount) || subtotalWithContingency * (HST_PERCENT / 100);
    const total = Number(quote.total) || subtotalWithContingency + hstAmount;
    const depositRequired = total * (DEPOSIT_PERCENT / 100);

    const invoiceData = {
      invoice_number: invoiceNumber,
      lead_id,
      quote_draft_id,
      status: 'draft' as const,
      line_items: quote.line_items as Json,
      subtotal,
      contingency_percent: contingencyPercent,
      contingency_amount: contingencyAmount,
      hst_amount: hstAmount,
      total,
      balance_due: total,
      deposit_required: depositRequired,
      customer_name: lead.name,
      customer_email: lead.email,
      customer_phone: lead.phone,
      customer_address: lead.address,
      customer_city: lead.city,
      customer_province: lead.province,
      customer_postal_code: lead.postal_code,
      ...(due_date ? { due_date } : {}),
      ...(notes ? { notes } : {}),
    };

    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert(withSiteId(invoiceData))
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating invoice:', insertError);
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      );
    }

    // Update lead status to 'won'
    await supabase
      .from('leads')
      .update({ status: 'won', updated_at: new Date().toISOString() })
      .eq('id', lead_id)
      .eq('site_id', getSiteId());

    // Audit log
    await supabase.from('audit_log').insert(withSiteId({
      lead_id,
      action: 'invoice_created',
      new_values: {
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        total,
      } as unknown as Json,
    }));

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Invoice create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
