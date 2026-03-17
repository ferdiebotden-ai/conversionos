/**
 * Admin Feedback API
 * POST /api/admin/feedback — receives contractor feedback and emails it to the owner
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import { sendEmail, getOwnerEmail } from '@/lib/email/resend';
import { ContractorFeedbackEmail } from '@/emails/contractor-feedback';

const feedbackSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'bot']),
      content: z.string(),
    })
  ),
  category: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const siteId = await getSiteIdAsync();

    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { messages, category } = parsed.data;

    // Fetch company name from admin_settings
    const supabase = createServiceClient();
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('site_id', siteId)
      .eq('key', 'business_info')
      .single();

    const businessInfo = settings?.value as Record<string, unknown> | null;
    const companyName = (businessInfo?.['name'] as string) || siteId;

    // Format timestamp
    const timestamp = new Date().toLocaleString('en-CA', {
      timeZone: 'America/Toronto',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Send email to owner
    const ownerEmail = process.env['OWNER_EMAIL'] || getOwnerEmail();
    const result = await sendEmail({
      to: ownerEmail,
      subject: `[Feedback] ${companyName} — ${category}`,
      react: ContractorFeedbackEmail({
        companyName,
        category,
        messages,
        timestamp,
        siteId,
      }),
    });

    if (!result.success) {
      console.error('Feedback email failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send feedback email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
