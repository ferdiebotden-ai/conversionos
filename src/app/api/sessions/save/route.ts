import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import { applyRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email/resend';
import { SessionResumeEmail } from '@/emails/session-resume';
import { getBranding } from '@/lib/branding';
import type { Json } from '@/types/database';

/**
 * Save Session API
 * POST /api/sessions/save
 * Saves chat session and sends magic link email
 */

const SaveSessionSchema = z.object({
  email: z.string().email(),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    images: z.array(z.string()).optional(),
  })),
  extractedData: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().uuid().optional(),
  deviceType: z.string().optional(),
  startedFrom: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();

    // Validate input
    const validationResult = SaveSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const siteId = await getSiteIdAsync();
    const supabase = createServiceClient();

    // Check if we're updating an existing session or creating new
    let sessionId = data.sessionId;

    if (sessionId) {
      // Update existing session
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          email: data.email,
          messages: data.messages as unknown as Json,
          extracted_data: (data.extractedData || null) as Json,
          state: 'active',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .eq('id', sessionId)
        .eq('site_id', siteId);

      if (updateError) {
        console.error('Error updating session:', updateError);
        return NextResponse.json(
          { error: 'Failed to update session' },
          { status: 500 }
        );
      }
    } else {
      // Create new session
      const { data: newSession, error: insertError } = await supabase
        .from('chat_sessions')
        .insert(withSiteId({
          email: data.email,
          messages: data.messages as unknown as Json,
          extracted_data: (data.extractedData || null) as Json,
          device_type: data.deviceType || null,
          started_from: data.startedFrom || null,
          state: 'active',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }, siteId))
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating session:', insertError);
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        );
      }

      sessionId = newSession.id;
    }

    // Generate resume URL
    const host = request.headers.get('host');
    const baseUrl = host ? `https://${host}` : (process.env['NEXT_PUBLIC_APP_URL'] || '');
    const resumeUrl = `${baseUrl}/estimate/resume?session=${sessionId}`;

    // Send magic link email
    const branding = await getBranding();
    const emailResult = await sendEmail({
      to: data.email,
      subject: `Continue Your Renovation Quote - ${branding.name}`,
      react: SessionResumeEmail({ resumeUrl, expiresInDays: 7, branding }),
    });

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      // Don't fail the request if email fails - session is already saved
    }

    return NextResponse.json({
      success: true,
      sessionId,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Save session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
