/**
 * Shared Visualization Page
 * Public page for viewing shared visualizations
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { Button } from '@/components/ui/button';
import { SharedVisualizationView } from './shared-view';
import { Sparkles, MessageSquare, ArrowLeft } from 'lucide-react';
import { getBranding } from '@/lib/branding';
import { getCopyContext } from '@/lib/copy/server';
import { getVisualizerShareCTA } from '@/lib/copy/site-copy';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedVisualizationPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createServiceClient();
  const [branding, copyCtx] = await Promise.all([getBranding(), getCopyContext()]);
  const shareCTA = getVisualizerShareCTA(copyCtx, branding);

  // Fetch the visualization by share token
  const { data: visualization, error } = await supabase
    .from('visualizations')
    .select('*')
    .eq('share_token', token)
    .eq('site_id', getSiteId())
    .single();

  if (error || !visualization) {
    notFound();
  }

  // Format room type for display
  const formatRoomType = (roomType: string): string => {
    return roomType.replace(/_/g, ' ');
  };

  // Format style for display
  const formatStyle = (style: string): string => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">{branding.name}</span>
            </Link>
            <Link href={shareCTA.headerCTA.href}>
              <Button>
                <MessageSquare className="w-4 h-4 mr-2" />
                {shareCTA.headerCTA.label}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back link */}
          <Link
            href="/visualizer"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Create your own visualization
          </Link>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">
              {formatStyle(visualization.style)}{' '}
              {formatRoomType(visualization.room_type)} Design
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-generated visualization by {branding.name}
            </p>
          </div>

          {/* Visualization viewer */}
          <SharedVisualizationView
            visualization={visualization}
          />

          {/* CTA section */}
          <div className="mt-12 text-center bg-muted/50 rounded-xl p-8 border border-border">
            <h2 className="text-2xl font-bold">{shareCTA.heading}</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {shareCTA.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <Link href={`${shareCTA.primaryCTA.href}${shareCTA.primaryCTA.href === '/estimate' ? `?visualization=${visualization.id}` : ''}`}>
                <Button size="lg" className="min-h-[52px]">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {shareCTA.primaryCTA.label}
                </Button>
              </Link>
              <Link href="/visualizer">
                <Button variant="outline" size="lg" className="min-h-[52px]">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Try With Your Own Photo
                </Button>
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-center text-muted-foreground mt-8">
            AI-generated visualization for concept purposes only. Actual
            renovations may vary based on site conditions and material
            availability. Created {new Date(visualization.created_at).toLocaleDateString()}.
          </p>
        </div>
      </main>
    </div>
  );
}
