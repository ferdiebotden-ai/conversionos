/**
 * Server-side helper — fetches tier + quoteMode from DB.
 */

import { getTier } from '@/lib/entitlements.server';
import { getQuoteAssistanceConfig } from '@/lib/quote-assistance';
import type { CopyContext } from './site-copy';

export async function getCopyContext(): Promise<CopyContext> {
  const [tier, qaConfig] = await Promise.all([
    getTier(),
    getQuoteAssistanceConfig(),
  ]);
  const quoteMode = tier === 'elevate' ? 'none' : qaConfig.mode;
  return { tier, quoteMode };
}
