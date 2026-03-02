import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import { InvoiceSendSchema } from '@/lib/schemas/invoice';
import { InvoicePdfDocument } from '@/lib/pdf/invoice-template';
import { getBranding } from '@/lib/branding';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { Json } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/invoices/[id]/send
 * Send invoice email with PDF attachment
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
    const validation = InvoiceSendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { to_email, custom_message } = validation.data;
    const supabase = createServiceClient();
    const branding = await getBranding();

    // Fetch invoice
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('site_id', siteId)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .eq('site_id', siteId)
      .order('payment_date', { ascending: true });

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      InvoicePdfDocument({ invoice, payments: payments || [], branding })
    );

    // Send email via Resend
    const resendApiKey = process.env['RESEND_API_KEY'];
    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Email service not configured (RESEND_API_KEY missing)' },
        { status: 503 }
      );
    }

    const emailBody = [
      `Dear ${invoice.customer_name},`,
      '',
      `Please find attached Invoice #${invoice.invoice_number} for your renovation project.`,
      '',
      `Total: $${Number(invoice.total).toFixed(2)}`,
      `Balance Due: $${Number(invoice.balance_due).toFixed(2)}`,
      `Due Date: ${invoice.due_date}`,
      '',
      custom_message ? `Note from ${branding.name}: ${custom_message}\n` : '',
      `Payment can be made via E-Transfer to ${branding.paymentEmail}`,
      '',
      `Thank you for choosing ${branding.name}!`,
      '',
      branding.name,
      `${branding.address}, ${branding.city}, ${branding.province} ${branding.postal}`,
      `Tel: ${branding.phone}`,
    ].join('\n');

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${branding.name} <${branding.email}>`,
        to: [to_email],
        subject: `Invoice #${invoice.invoice_number} from ${branding.name}`,
        text: emailBody,
        attachments: [
          {
            filename: `${invoice.invoice_number}.pdf`,
            content: Buffer.from(pdfBuffer).toString('base64'),
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend error:', errorText);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update invoice status to sent
    await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)
      .eq('site_id', siteId);

    // Audit log
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: invoice.lead_id,
      action: 'invoice_sent',
      new_values: {
        invoice_id: id,
        sent_to: to_email,
      } as unknown as Json,
    }, siteId));

    return NextResponse.json({ success: true, message: 'Invoice sent' });
  } catch (error) {
    console.error('Invoice send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
