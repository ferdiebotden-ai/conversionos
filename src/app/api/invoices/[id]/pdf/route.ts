import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { InvoicePdfDocument } from '@/lib/pdf/invoice-template';
import { getBranding } from '@/lib/branding';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/invoices/[id]/pdf
 * Generate and return invoice PDF
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = createServiceClient();
    const branding = await getBranding();

    // Fetch invoice with payments
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('site_id', getSiteId())
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .eq('site_id', getSiteId())
      .order('payment_date', { ascending: true });

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      InvoicePdfDocument({ invoice, payments: payments || [], branding })
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Invoice PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
