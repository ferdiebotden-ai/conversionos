/**
 * Quote Versions API
 * GET /api/quotes/[leadId]/versions — List all quote versions for a lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

type RouteContext = { params: Promise<{ leadId: string }> };

export interface VersionSummary {
  version: number;
  status: 'draft' | 'sent';
  updatedAt: string;
  sentAt?: string | undefined;
  total: number | null;
  acceptanceStatus?: string | undefined;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const siteId = await getSiteIdAsync();
    const tier = await getTier();
    if (!canAccess(tier, 'pdf_quotes')) {
      return NextResponse.json({ error: 'Requires Accelerate plan or higher' }, { status: 403 });
    }

    const { leadId } = await context.params;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: drafts, error } = await supabase
      .from('quote_drafts')
      .select('version, updated_at, sent_at, total, acceptance_status, accepted_at, accepted_by_name')
      .eq('lead_id', leadId)
      .eq('site_id', siteId)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }

    const versions: VersionSummary[] = (drafts || []).map((d) => {
      const row = d as Record<string, unknown>;
      return {
        version: row['version'] as number,
        status: row['sent_at'] ? 'sent' as const : 'draft' as const,
        updatedAt: row['updated_at'] as string,
        sentAt: (row['sent_at'] as string) || undefined,
        total: row['total'] as number | null,
        acceptanceStatus: (row['acceptance_status'] as string) || undefined,
      };
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Versions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
