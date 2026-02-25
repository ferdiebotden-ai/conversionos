'use client';

/**
 * Client hook — builds CopyContext from TierProvider.
 */

import { useTier } from '@/components/tier-provider';
import type { CopyContext } from './site-copy';

export function useCopyContext(): CopyContext {
  const { tier, quoteMode } = useTier();
  return { tier, quoteMode };
}
