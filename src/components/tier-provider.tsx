'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { canAccess, type PlanTier, type Feature } from '@/lib/entitlements';
import type { QuoteAssistanceMode } from '@/lib/quote-assistance';

interface TierContextValue {
  tier: PlanTier;
  quoteMode: QuoteAssistanceMode;
  canAccess: (feature: Feature) => boolean;
}

const TierContext = createContext<TierContextValue>({
  tier: 'accelerate',
  quoteMode: 'range',
  canAccess: (feature) => canAccess('accelerate', feature),
});

export function useTier() {
  return useContext(TierContext);
}

export function TierProvider({
  children,
  tier,
  quoteMode = 'range',
}: {
  children: ReactNode;
  tier: PlanTier;
  quoteMode?: QuoteAssistanceMode;
}) {
  const check = useCallback(
    (feature: Feature) => canAccess(tier, feature),
    [tier]
  );

  return (
    <TierContext value={{ tier, quoteMode, canAccess: check }}>
      {children}
    </TierContext>
  );
}
