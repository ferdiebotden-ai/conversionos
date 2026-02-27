import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { EstimatePageClient } from './estimate-client';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

export async function generateMetadata() {
  return {
    title: 'Get an Instant Estimate',
    description: 'Chat with our AI assistant to get a preliminary renovation estimate in minutes. Upload photos of your space and describe your project.',
  };
}

function EstimateLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default async function EstimatePage() {
  const tier = await getTier();
  if (!canAccess(tier, 'ai_quote_engine')) {
    redirect('/contact?from=estimate');
  }

  return (
    <Suspense fallback={<EstimateLoading />}>
      <EstimatePageClient />
    </Suspense>
  );
}
