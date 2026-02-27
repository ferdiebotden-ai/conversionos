import { Suspense } from 'react';
import Link from 'next/link';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Plus, FileText, Clock, CheckCircle2, XCircle, Send } from 'lucide-react';
import CreateDrawingButton from '@/components/cad/create-drawing-button';
import type { Drawing, DrawingStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

const STATUS_CONFIG: Record<DrawingStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'default' },
  approved: { label: 'Approved', variant: 'outline' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '\u2014';
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

async function getDrawings() {
  const supabase = createServiceClient();

  const { data: drawings, error } = await supabase
    .from('drawings')
    .select('*')
    .eq('site_id', getSiteId())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching drawings:', error);
    return [];
  }

  return (drawings || []) as Drawing[];
}

function DrawingsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  );
}

function DrawingsGrid({ drawings }: { drawings: Drawing[] }) {
  if (drawings.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
        <Pencil className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No drawings yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create a drawing to start designing permit-ready plans
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {drawings.map((drawing) => {
        const config = STATUS_CONFIG[drawing.status];
        return (
          <Card key={drawing.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base line-clamp-1">{drawing.name}</CardTitle>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              {drawing.thumbnail_url ? (
                <div className="aspect-video bg-muted rounded-md overflow-hidden">
                  <img
                    src={drawing.thumbnail_url}
                    alt={drawing.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {drawing.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {drawing.description}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{formatDate(drawing.created_at)}</span>
              <Button asChild variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8">
                <Link href={`/admin/drawings/${drawing.id}`}>
                  Open
                </Link>
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

export default async function DrawingsPage() {
  const drawings = await getDrawings();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Drawings</h2>
          <p className="text-muted-foreground">
            Architecture drawings and permit plans.
          </p>
        </div>
        <CreateDrawingButton />
      </div>

      <Suspense fallback={<DrawingsGridSkeleton />}>
        <DrawingsGrid drawings={drawings} />
      </Suspense>
    </div>
  );
}
