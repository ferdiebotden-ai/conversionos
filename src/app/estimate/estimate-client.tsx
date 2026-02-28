'use client';

/**
 * Estimate Page Client Component
 * Loads visualization context from DB (survives tab/refresh)
 * with sessionStorage fallback for same-tab handoffs.
 */

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { buildHandoffFromVisualization, readHandoffContext, type HandoffContext } from '@/lib/chat/handoff';

export function EstimatePageClient() {
  const searchParams = useSearchParams();
  const visualizationId = searchParams.get('visualization');
  const [handoffContext, setHandoffContext] = useState<HandoffContext | null>(null);
  const [visualizationContext, setVisualizationContext] = useState<VisualizationContext | null>(null);
  const [isLoading, setIsLoading] = useState(!!visualizationId);

  useEffect(() => {
    if (!visualizationId) {
      setIsLoading(false);
      return;
    }

    async function loadContext(id: string) {
      try {
        const response = await fetch(`/api/visualizations/${id}`);
        if (response.ok) {
          const data = await response.json() as Record<string, unknown>;

          // Build rich handoff from DB record
          const dbHandoff = buildHandoffFromVisualization(data);

          // Merge client-side data from sessionStorage that the DB doesn't have
          // (e.g. clientFavouritedConcepts — starring is client-side only)
          const ssContext = readHandoffContext();
          if (ssContext?.clientFavouritedConcepts?.length && !dbHandoff.clientFavouritedConcepts?.length) {
            dbHandoff.clientFavouritedConcepts = ssContext.clientFavouritedConcepts;
          }

          setHandoffContext(dbHandoff);

          // Also set legacy visualization context for backward compat
          setVisualizationContext({
            id: data['id'] as string,
            roomType: data['room_type'] as string,
            style: data['style'] as string,
            originalPhotoUrl: data['original_photo_url'] as string,
            constraints: (data['constraints'] as string) || undefined,
          });
        }
      } catch (err) {
        console.error('Failed to fetch visualization:', err);
        // Fall back to sessionStorage
        const ssContext = readHandoffContext();
        if (ssContext) setHandoffContext(ssContext);
      } finally {
        setIsLoading(false);
      }
    }

    loadContext(visualizationId);
  }, [visualizationId]);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your design...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="sr-only">Get an Instant Renovation Estimate</h1>
      <ChatInterface
        visualizationContext={visualizationContext ?? undefined}
        handoffContext={handoffContext ?? undefined}
      />
    </>
  );
}

export interface VisualizationContext {
  id: string;
  roomType: string;
  style: string;
  originalPhotoUrl: string;
  constraints?: string | undefined;
}
