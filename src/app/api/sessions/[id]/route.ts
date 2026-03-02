import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';

/**
 * Get Session API
 * GET /api/sessions/[id]
 * Retrieves a chat session by ID for resuming
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const siteId = await getSiteIdAsync();
    const { id: sessionId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch session
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('site_id', siteId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Session has expired' },
        { status: 410 }
      );
    }

    // Check if session is already completed
    if (session.state === 'completed') {
      return NextResponse.json(
        { error: 'Session is already completed' },
        { status: 410 }
      );
    }

    // Update last accessed (touch the session)
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('site_id', siteId);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        messages: session.messages,
        extractedData: session.extracted_data,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
