/**
 * Send Quote Email API
 * POST /api/quotes/[leadId]/send - Send quote email with PDF attachment
 * [DEV-058]
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { renderToBuffer } from '@react-pdf/renderer';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId, withSiteId } from '@/lib/db/site';
import { QuotePdfDocument } from '@/lib/pdf/quote-template';
import { QuoteEmailTemplate } from '@/lib/email/quote-email';
import { getResend } from '@/lib/email/resend';
import { getBranding } from '@/lib/branding';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

type RouteContext = { params: Promise<{ leadId: string }> };

// Request schema
const SendQuoteSchema = z.object({
  customMessage: z.string().max(500).optional(),
  recipientEmail: z.string().email().optional(), // Override recipient if needed
  emailSubject: z.string().max(200).optional(), // Custom email subject
  emailBody: z.string().max(5000).optional(), // Custom email body
  useCustomEmail: z.boolean().optional(), // Whether to use custom email content
});

// Email configuration
const FROM_EMAIL = process.env['FROM_EMAIL'] || 'ConversionOS <noreply@conversionos.com>';
const REPLY_TO_EMAIL = process.env['REPLY_TO_EMAIL'] || 'admin@conversionos.com';

/**
 * POST /api/quotes/[leadId]/send
 * Send a quote email to the customer with PDF attachment
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'pdf_quotes')) {
      return NextResponse.json({ error: 'Quote sending requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { leadId } = await context.params;

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const validationResult = SendQuoteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { customMessage, recipientEmail, emailSubject, emailBody, useCustomEmail } = validationResult.data;

    const supabase = createServiceClient();
    const branding = await getBranding();

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('site_id', getSiteId())
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Determine recipient email
    const toEmail = recipientEmail || lead.email;
    if (!toEmail) {
      return NextResponse.json(
        { error: 'No email address available for this lead' },
        { status: 400 }
      );
    }

    // Fetch the most recent quote draft
    const { data: quote, error: quoteError } = await supabase
      .from('quote_drafts')
      .select('*')
      .eq('lead_id', leadId)
      .eq('site_id', getSiteId())
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
        { error: 'Quote has no line items. Please add items before sending.' },
        { status: 400 }
      );
    }

    // Check for Resend API key
    if (!process.env['RESEND_API_KEY']) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Generate PDF for attachment
    const pdfBuffer = await renderToBuffer(
      QuotePdfDocument({ lead, quote, branding })
    );

    // Create filename
    const quoteDate = new Date(quote.created_at);
    const quoteNumber = `DEMO-${quoteDate.getFullYear()}-${String(lead.id).slice(0, 8).toUpperCase()}`;
    const filename = `${quoteNumber}-Quote-${lead.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;

    // Get project type for subject
    const projectTypeLabels: Record<string, string> = {
      kitchen: 'Kitchen',
      bathroom: 'Bathroom',
      basement: 'Basement',
      flooring: 'Flooring',
      painting: 'Painting',
      exterior: 'Exterior',
      other: 'Renovation',
    };
    const projectType = projectTypeLabels[lead.project_type || 'other'] || 'Renovation';

    // Determine email subject
    const finalSubject = emailSubject || `Your ${projectType} Quote from ${branding.name} - ${quoteNumber}`;

    // Send email with Resend
    const resend = getResend();

    // Use custom email body if provided
    let emailResult;
    if (useCustomEmail && emailBody) {
      // Send with custom plain text body (Resend will handle it)
      emailResult = await resend.emails.send({
        from: FROM_EMAIL,
        to: [toEmail],
        replyTo: REPLY_TO_EMAIL,
        subject: finalSubject,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 3px solid ${branding.primaryColor}; padding-bottom: 20px; margin-bottom: 20px;">
    <h1 style="color: ${branding.primaryColor}; margin: 0; font-size: 24px;">${branding.name}</h1>
    <p style="color: #666; margin: 4px 0 0 0; font-size: 14px;">${branding.tagline}</p>
  </div>

  ${emailBody.split('\n').map(line => line.trim() ? `<p style="margin-bottom: 16px; color: #333;">${line}</p>` : '<br/>').join('\n')}

  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666;">
    <p style="margin: 0;"><strong style="color: ${branding.primaryColor};">${branding.name}</strong></p>
    <p style="margin: 4px 0;">${branding.address}, ${branding.city}, ${branding.province} ${branding.postal}</p>
    <p style="margin: 4px 0;">Tel: ${branding.phone}</p>
    <p style="margin: 4px 0;"><a href="https://${branding.website}" style="color: ${branding.primaryColor};">${branding.website}</a></p>
  </div>
</body>
</html>
        `,
        attachments: [
          {
            filename,
            content: pdfBuffer,
          },
        ],
      });
    } else {
      // Use the React template
      emailResult = await resend.emails.send({
        from: FROM_EMAIL,
        to: [toEmail],
        replyTo: REPLY_TO_EMAIL,
        subject: finalSubject,
        react: QuoteEmailTemplate({ lead, quote, customMessage, branding }),
        attachments: [
          {
            filename,
            content: pdfBuffer,
          },
        ],
      });
    }

    if (emailResult.error) {
      console.error('Email send error:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: emailResult.error.message },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    // Update quote_drafts with sent info
    await supabase
      .from('quote_drafts')
      .update({
        sent_at: now,
        sent_to_email: toEmail,
        updated_at: now,
      })
      .eq('id', quote.id)
      .eq('site_id', getSiteId());

    // Update lead status to 'sent'
    await supabase
      .from('leads')
      .update({
        status: 'sent',
        updated_at: now,
        last_contacted_at: now,
      })
      .eq('id', leadId)
      .eq('site_id', getSiteId());

    // Log the send action
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: leadId,
      action: 'quote_sent',
      new_values: {
        quote_id: quote.id,
        quote_version: quote.version,
        sent_to: toEmail,
        total: quote.total,
        email_id: emailResult.data?.id,
        custom_message: customMessage || null,
      },
    }));

    return NextResponse.json({
      success: true,
      message: 'Quote sent successfully',
      data: {
        emailId: emailResult.data?.id,
        sentTo: toEmail,
        sentAt: now,
        quoteNumber,
      },
    });
  } catch (error) {
    console.error('Send quote error:', error);
    return NextResponse.json(
      { error: 'Failed to send quote' },
      { status: 500 }
    );
  }
}
