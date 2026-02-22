'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { canAccess, type PlanTier, type Feature } from '@/lib/entitlements';

interface TierContextValue {
  tier: PlanTier;
  canAccess: (feature: Feature) => boolean;
}

const TierContext = createContext<TierContextValue>({
  tier: 'accelerate',
  canAccess: (feature) => canAccess('accelerate', feature),
});

export function useTier() {
  return useContext(TierContext);
}

export function TierProvider({
  children,
  tier,
}: {
  children: ReactNode;
  tier: PlanTier;
}) {
  const check = useCallback(
    (feature: Feature) => canAccess(tier, feature),
    [tier]
  );

  return (
    <TierContext value={{ tier, canAccess: check }}>
      {children}
    </TierContext>
  );
}
