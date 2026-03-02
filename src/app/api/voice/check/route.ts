/**
 * Voice Service Configuration Check
 * Returns whether ElevenLabs voice service is properly configured
 */

import { NextResponse, type NextRequest } from 'next/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;
  const isConfigured = !!process.env['ELEVENLABS_API_KEY']?.trim();

  if (isConfigured) {
    return NextResponse.json({ configured: true });
  }

  return NextResponse.json(
    { configured: false, message: 'Voice service not configured' },
    { status: 503 }
  );
}
