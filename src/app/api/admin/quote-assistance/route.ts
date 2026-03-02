/**
 * GET /api/admin/quote-assistance
 * Returns the quote assistance config for the current tenant.
 * Public endpoint — no auth required (config is not sensitive).
 * Used by CostRangeIndicator component on the client.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getTier } from '@/lib/entitlements.server';
import { getQuoteAssistanceConfig } from '@/lib/quote-assistance';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;
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
