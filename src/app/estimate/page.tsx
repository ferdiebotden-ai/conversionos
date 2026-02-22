import { Suspense } from 'react';
import { EstimatePageClient } from './estimate-client';
import { getBranding } from '@/lib/branding';

export async function generateMetadata() {
  const branding = await getBranding();
  return {
    title: `Get an Instant Estimate | ${branding.name}`,
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

export default function EstimatePage() {
  return (
    <Suspense fallback={<EstimateLoading />}>
      <EstimatePageClient />
    </Suspense>
  );
}
