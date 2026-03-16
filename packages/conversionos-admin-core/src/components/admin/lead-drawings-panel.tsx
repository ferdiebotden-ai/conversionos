'use client';

/**
 * Lead Drawings Panel
 * Shows drawings linked to a specific lead
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, FileText, ExternalLink } from 'lucide-react';
import type { Drawing, DrawingStatus } from '@/types/database';

const STATUS_CONFIG: Record<DrawingStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'default' },
  approved: { label: 'Approved', variant: 'outline' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

interface LeadDrawingsPanelProps {
  leadId: string;
}

export function LeadDrawingsPanel({ leadId }: LeadDrawingsPanelProps) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrawings = useCallback(async () => {
    const res = await fetch(`/api/drawings?lead_id=${leadId}`);
    if (res.ok) {
      const data = await res.json();
      setDrawings(data.data || []);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (drawings.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
        <Pencil className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No drawings linked to this lead</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create a drawing from the Drawings page and link it to this lead
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/drawings">Go to Drawings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {drawings.map((drawing) => {
        const config = STATUS_CONFIG[drawing.status];
        return (
          <Card key={drawing.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base line-clamp-1">{drawing.name}</CardTitle>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                {drawing.thumbnail_url ? (
                  <img
                    src={drawing.thumbnail_url}
                    alt={drawing.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{formatDate(drawing.created_at)}</span>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/drawings/${drawing.id}`}>
                  <ExternalLink className="h-4 w-4 mr-1" />
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
