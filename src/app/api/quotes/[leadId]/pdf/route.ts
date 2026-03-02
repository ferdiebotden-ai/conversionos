/**
 * Quote PDF Generation API
 * GET /api/quotes/[leadId]/pdf - Generate and return PDF quote
 * [DEV-057]
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import { QuotePdfDocument } from '@/lib/pdf/quote-template';
import { formatQuoteNumber } from '@/lib/pdf/pdf-utils';
import { getBranding } from '@/lib/branding';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

type RouteContext = { params: Promise<{ leadId: string }> };

/**
 * GET /api/quotes/[leadId]/pdf
 * Generate a PDF quote for a lead
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'pdf_quotes')) {
      return NextResponse.json({ error: 'PDF quotes require the Accelerate plan or higher' }, { status: 403 });
    }

    const { leadId } = await context.params;

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const branding = await getBranding();

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('site_id', siteId)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Fetch the most recent quote draft
    const { data: quote, error: quoteError } = await supabase
      .from('quote_drafts')
      .select('*')
      .eq('lead_id', leadId)
      .eq('site_id', siteId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError);
      return NextResponse.json(
        { error: 'No quote found for this lead. Please create a quote first.' },
        { status: 404 }
      );
    }

    // Check if quote has line items
    const lineItems = quote.line_items;
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Quote has no line items. Please add items before generating PDF.' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      QuotePdfDocument({ lead, quote, branding })
    );

    // Create filename
    const quoteNumber = formatQuoteNumber(quote.created_at, lead.id);
    const filename = `${quoteNumber}-Quote-${lead.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;

    // Log the PDF generation
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: leadId,
      action: 'pdf_generated',
      new_values: {
        quote_id: quote.id,
        quote_version: quote.version,
        total: quote.total,
      },
    }, siteId));

    // Convert buffer to Uint8Array for Response
    const pdfArray = new Uint8Array(pdfBuffer);

    // Return PDF as binary response
    return new NextResponse(pdfArray, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfArray.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
