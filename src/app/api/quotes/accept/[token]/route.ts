/**
 * Quote Acceptance API
 * GET  /api/quotes/accept/[token] — Fetch quote summary for acceptance page
 * POST /api/quotes/accept/[token] — Accept a quote with typed name
 *
 * Public route — no site_id filter, no auth required.
 * Token uniqueness enforces access control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';

type RouteContext = { params: Promise<{ token: string }> };

/**
 * GET /api/quotes/accept/[token]
 * Returns quote summary + branding for the public acceptance page.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch quote by acceptance token (public — no site_id filter)
    const { data: quote, error: quoteError } = await supabase
      .from('quote_drafts')
      .select('*')
      .eq('acceptance_token', token)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Check if already accepted
    if ((quote as Record<string, unknown>)['acceptance_status'] === 'accepted') {
      return NextResponse.json({
        status: 'accepted',
        acceptedAt: (quote as Record<string, unknown>)['accepted_at'],
        acceptedByName: (quote as Record<string, unknown>)['accepted_by_name'],
      });
    }

    // Check expiry
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      // Fetch branding for expired message
      const { data: brandingRows } = await supabase
        .from('admin_settings')
        .select('key, value')
        .eq('site_id', quote.site_id)
        .in('key', ['business_info', 'branding']);

      const brandMap = Object.fromEntries(
        (brandingRows || []).map((r) => [r.key, r.value])
      );
      const info = (brandMap['business_info'] ?? {}) as Record<string, unknown>;
      const brand = (brandMap['branding'] ?? {}) as Record<string, unknown>;
      const colors = (brand['colors'] as Record<string, string>) || {};

      return NextResponse.json({
        status: 'expired',
        branding: {
          name: (info['name'] as string) || 'Contractor',
          primaryColor: colors['primary_hex'] || '#0D9488',
          phone: (info['phone'] as string) || '',
          email: (info['email'] as string) || '',
        },
      });
    }

    // Fetch lead info for customer context
    const { data: lead } = await supabase
      .from('leads')
      .select('name, project_type')
      .eq('id', quote.lead_id)
      .single();

    // Fetch branding from admin_settings using the quote's site_id
    const { data: brandingRows } = await supabase
      .from('admin_settings')
      .select('key, value')
      .eq('site_id', quote.site_id)
      .in('key', ['business_info', 'branding', 'company_profile']);

    const brandMap = Object.fromEntries(
      (brandingRows || []).map((r) => [r.key, r.value])
    );
    const info = (brandMap['business_info'] ?? {}) as Record<string, unknown>;
    const brand = (brandMap['branding'] ?? {}) as Record<string, unknown>;
    const profile = (brandMap['company_profile'] ?? {}) as Record<string, unknown>;
    const colors = (brand['colors'] as Record<string, string>) || {};

    const lineItemCount = Array.isArray(quote.line_items) ? quote.line_items.length : 0;

    return NextResponse.json({
      status: 'pending',
      quote: {
        projectType: lead?.project_type || 'other',
        total: quote.total,
        deposit: quote.deposit_required,
        lineItemCount,
        validity: quote.expires_at,
        contractorName: (info['name'] as string) || 'Contractor',
      },
      branding: {
        name: (info['name'] as string) || 'Contractor',
        primaryColor: colors['primary_hex'] || '#0D9488',
        logoUrl: (profile?.['logoUrl'] as string) || (brand?.['logoUrl'] as string) || null,
        phone: (info['phone'] as string) || '',
        email: (info['email'] as string) || '',
      },
    });
  } catch (error) {
    console.error('Acceptance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/quotes/accept/[token]
 * Accept a quote — records name, IP, timestamp.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { token } = await context.params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Parse body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { name, confirm } = body as { name?: string; confirm?: boolean };

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required (minimum 2 characters)' }, { status: 400 });
    }

    if (confirm !== true) {
      return NextResponse.json({ error: 'Confirmation is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch quote by token
    const { data: quote, error: quoteError } = await supabase
      .from('quote_drafts')
      .select('*')
      .eq('acceptance_token', token)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Re-validate not already accepted
    if ((quote as Record<string, unknown>)['acceptance_status'] === 'accepted') {
      return NextResponse.json({ error: 'This quote has already been accepted' }, { status: 409 });
    }

    // Re-validate not expired
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This quote has expired' }, { status: 410 });
    }

    // Extract IP from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

    const now = new Date().toISOString();

    // Update quote with acceptance
    const { error: updateError } = await supabase
      .from('quote_drafts')
      .update({
        acceptance_status: 'accepted',
        accepted_at: now,
        accepted_by_name: name.trim(),
        accepted_by_ip: clientIp,
        updated_at: now,
      } as Record<string, unknown>)
      .eq('id', quote.id);

    if (updateError) {
      console.error('Acceptance update error:', updateError);
      return NextResponse.json({ error: 'Failed to record acceptance' }, { status: 500 });
    }

    // Update lead status to 'won'
    await supabase
      .from('leads')
      .update({
        status: 'won',
        updated_at: now,
      })
      .eq('id', quote.lead_id);

    // Log to audit_log
    await supabase.from('audit_log').insert({
      site_id: quote.site_id,
      lead_id: quote.lead_id,
      action: 'quote_accepted',
      new_values: {
        quote_id: quote.id,
        quote_version: quote.version,
        accepted_by_name: name.trim(),
        accepted_by_ip: clientIp,
        total: quote.total,
      },
      ip_address: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: 'Quote accepted successfully',
      acceptedAt: now,
    });
  } catch (error) {
    console.error('Acceptance POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
