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

/**
 * Generate a cryptographically random acceptance token (24 alphanumeric chars).
 */
function generateAcceptanceToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  for (let i = 0; i < 24; i++) {
    token += chars[array[i]! % chars.length];
  }
  return token;
}

// Request schema
const SendQuoteSchema = z.object({
  customMessage: z.string().max(500).optional(),
  recipientEmail: z.string().email().optional(), // Override recipient if needed
  emailSubject: z.string().max(200).optional(), // Custom email subject
  emailBody: z.string().max(5000).optional(), // Custom email body
  useCustomEmail: z.boolean().optional(), // Whether to use custom email content
});

/**
 * Build tenant-aware email addresses from branding data.
 * Falls back to env vars, then to generic defaults.
 */
function getEmailConfig(branding: { name: string; email: string; website: string }) {
  const domain = branding.website?.replace(/^(https?:\/\/)?(www\.)?/, '') || 'conversionos.com';
  const fromEmail = process.env['FROM_EMAIL'] || `${branding.name} <noreply@${domain}>`;
  const replyToEmail = process.env['REPLY_TO_EMAIL'] || branding.email || `admin@${domain}`;
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || `https://${domain}`;
  return { fromEmail, replyToEmail, appUrl };
}

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

    // Create filename (reuse shared formatter)
    const { formatQuoteNumber } = await import('@/lib/pdf/pdf-utils');
    const quoteNumber = formatQuoteNumber(quote.created_at, String(lead.id));
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

    // Generate acceptance token and URL before sending email
    const acceptanceToken = generateAcceptanceToken();
    const emailConfig = getEmailConfig(branding);
    const acceptanceUrl = `${emailConfig.appUrl}/quote/accept/${acceptanceToken}`;

    // Send email with Resend
    const resend = getResend();

    // Use custom email body if provided
    let emailResult;
    if (useCustomEmail && emailBody) {
      // Send with custom plain text body (Resend will handle it)
      emailResult = await resend.emails.send({
        from: emailConfig.fromEmail,
        to: [toEmail],
        replyTo: emailConfig.replyToEmail,
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
        from: emailConfig.fromEmail,
        to: [toEmail],
        replyTo: emailConfig.replyToEmail,
        subject: finalSubject,
        react: QuoteEmailTemplate({ lead, quote, customMessage, branding, acceptanceUrl }),
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
        { error: 'An unexpected error occurred. Please try again.' },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    // Update current quote row with sent info + acceptance token
    await supabase
      .from('quote_drafts')
      .update({
        sent_at: now,
        sent_to_email: toEmail,
        acceptance_token: acceptanceToken,
        acceptance_status: 'pending',
        updated_at: now,
      })
      .eq('id', quote.id)
      .eq('site_id', getSiteId());

    // Create a new draft row (version snapshot) — the new row becomes the editable draft
    const nextVersion = (quote.version || 1) + 1;
    await (supabase.from('quote_drafts') as ReturnType<typeof supabase.from>).insert({
      site_id: quote.site_id,
      lead_id: quote.lead_id,
      version: nextVersion,
      line_items: quote.line_items,
      ai_draft_json: quote.ai_draft_json,
      assumptions: quote.assumptions,
      exclusions: quote.exclusions,
      special_notes: quote.special_notes,
      recommended_next_step: quote.recommended_next_step,
      subtotal: quote.subtotal,
      contingency_percent: quote.contingency_percent,
      contingency_amount: quote.contingency_amount,
      hst_percent: quote.hst_percent,
      hst_amount: quote.hst_amount,
      total: quote.total,
      deposit_percent: quote.deposit_percent,
      deposit_required: quote.deposit_required,
      validity_days: quote.validity_days,
      expires_at: quote.expires_at,
      // New draft: clear sent/acceptance fields
      sent_at: null,
      sent_to_email: null,
      pdf_url: null,
    });

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
        acceptance_url: acceptanceUrl,
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
        acceptanceUrl,
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
