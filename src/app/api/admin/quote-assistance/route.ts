/**
 * GET /api/admin/quote-assistance
 * Returns the quote assistance config for the current tenant.
 * Public endpoint — no auth required (config is not sensitive).
 * Used by CostRangeIndicator component on the client.
 */

import { NextResponse } from 'next/server';
import { getTier } from '@/lib/entitlements.server';
import { getQuoteAssistanceConfig } from '@/lib/quote-assistance';

export async function GET() {
  try {
    const tier = await getTier();
    const config = await getQuoteAssistanceConfig(tier);

    return NextResponse.json({ config });
  } catch {
    return NextResponse.json(
      { config: { mode: 'none', rangeBand: 10000 } },
      { status: 200 },
    );
  }
}
