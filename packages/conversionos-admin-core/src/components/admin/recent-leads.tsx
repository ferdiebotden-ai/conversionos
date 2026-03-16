'use client';

/**
 * Recent Leads
 * List of recent leads for the dashboard
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Lead, LeadStatus } from '@/types/database';
import { ArrowRight, User, Clock } from 'lucide-react';

interface RecentLeadsProps {
  leads?: Lead[];
  isLoading?: boolean;
}

// Status badge colors
const STATUS_STYLES: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  draft_ready: { label: 'Draft Ready', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
  needs_clarification: { label: 'Needs Info', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  sent: { label: 'Sent', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  won: { label: 'Won', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  lost: { label: 'Lost', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
};

// Format relative time
function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

// Format project type for display
function formatProjectType(type: string | null): string {
  if (!type) return 'Other';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function LeadRow({ lead }: { lead: Lead }) {
  const statusStyle = STATUS_STYLES[lead.status];

  return (
    <Link
      href={`/admin/leads/${lead.id}`}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      {/* Avatar/Icon */}
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <User className="h-5 w-5 text-primary" />
      </div>

      {/* Lead info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{lead.name}</p>
          <Badge variant="secondary" className={cn('text-xs', statusStyle.className)}>
            {statusStyle.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatProjectType(lead.project_type)}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(lead.created_at)}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

export function RecentLeads({ leads, isLoading }: RecentLeadsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Leads</CardTitle>
        <Link href="/admin/leads">
          <Button variant="ghost" size="sm">
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {leads && leads.length > 0 ? (
          <div className="space-y-1">
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No leads yet</p>
            <p className="text-sm">New leads will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
