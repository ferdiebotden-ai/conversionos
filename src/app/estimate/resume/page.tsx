import { Suspense } from 'react';
import { ResumeChat } from './resume-chat';
import { getBranding } from '@/lib/branding';

export async function generateMetadata() {
  const branding = await getBranding();
  return {
    title: `Continue Your Quote | ${branding.name}`,
    description: 'Pick up where you left off on your renovation estimate.',
  };
}

export default function ResumePage() {
  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your session...</p>
            </div>
          </div>
        }
      >
        <ResumeChat />
      </Suspense>
    </main>
  );
}
