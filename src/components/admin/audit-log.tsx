'use client';

/**
 * Audit Log Component
 * Displays change history for leads in the admin dashboard
 * [DEV-060]
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AuditLog, Json } from '@/types/database';
import {
  Clock,
  FileText,
  Send,
  Download,
  UserCheck,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// Action type configuration
interface ActionConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  quote_created: {
    label: 'Quote Created',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-800',
  },
  quote_updated: {
    label: 'Quote Updated',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800',
  },
  quote_sent: {
    label: 'Quote Sent',
    icon: <Send className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800',
  },
  pdf_generated: {
    label: 'PDF Generated',
    icon: <Download className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-800',
  },
  status_change: {
    label: 'Status Changed',
    icon: <UserCheck className="h-4 w-4" />,
    color: 'bg-amber-100 text-amber-800',
  },
  lead_created: {
    label: 'Lead Created',
    icon: <UserCheck className="h-4 w-4" />,
    color: 'bg-emerald-100 text-emerald-800',
  },
  lead_updated: {
    label: 'Lead Updated',
    icon: <UserCheck className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800',
  },
};

function getActionConfig(action: string): ActionConfig {
  return ACTION_CONFIG[action] || {
    label: action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    icon: <Clock className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-800',
  };
}

// Format date for display in Canadian timezone
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Toronto',
  });
}

// Format time only
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Toronto',
  });
}

// Group entries by date
function groupByDate(entries: AuditLog[]): Record<string, AuditLog[]> {
  const groups: Record<string, AuditLog[]> = {};

  entries.forEach((entry) => {
    const date = new Date(entry.created_at).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Toronto',
    });

    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
  });

  return groups;
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
}

// Render change details
function ChangeDetails({ values, type }: { values: Json | null; type: 'old' | 'new' }) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return null;
  }

  const entries = Object.entries(values as Record<string, Json>).filter(
    ([key, value]) => value !== null && value !== undefined
  );

  if (entries.length === 0) return null;

  return (
    <div className="text-xs space-y-1 mt-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="text-muted-foreground capitalize">
            {key.replace(/_/g, ' ')}:
          </span>
          <span className={type === 'old' ? 'text-red-600 line-through' : 'text-green-600'}>
            {typeof value === 'number' && key.includes('total')
              ? formatCurrency(value)
              : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Single audit entry component
function AuditEntry({ entry }: { entry: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const config = getActionConfig(entry.action);
  const hasDetails = entry.old_values || entry.new_values;

  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={`p-2 rounded-full ${config.color}`}>
          {config.icon}
        </div>
        <div className="w-px flex-1 bg-border mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={config.color}>
                {config.label}
              </Badge>
              {hasDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTime(entry.created_at)}
          </span>
        </div>

        {/* Quick summary based on action */}
        <div className="text-sm text-muted-foreground mt-1">
          {entry.action === 'quote_sent' && entry.new_values && (
            <span>
              Sent to{' '}
              <span className="font-medium text-foreground">
                {(entry.new_values as Record<string, string>)['sent_to']}
              </span>
            </span>
          )}
          {entry.action === 'quote_created' && entry.new_values && (
            <span>
              Total:{' '}
              <span className="font-medium text-foreground">
                {formatCurrency((entry.new_values as Record<string, number>)['total'] || 0)}
              </span>
              {' '}&bull;{' '}
              {(entry.new_values as Record<string, number>)['line_items_count'] || 0} items
            </span>
          )}
          {entry.action === 'quote_updated' && entry.new_values && (
            <span>
              Total:{' '}
              <span className="font-medium text-foreground">
                {formatCurrency((entry.new_values as Record<string, number>)['total'] || 0)}
              </span>
            </span>
          )}
          {entry.action === 'pdf_generated' && (
            <span>PDF downloaded</span>
          )}
          {entry.action === 'status_change' && entry.new_values && (
            <span>
              {(entry.old_values as Record<string, string>)?.['status'] && (
                <>
                  <span className="line-through">
                    {(entry.old_values as Record<string, string>)['status']}
                  </span>
                  {' → '}
                </>
              )}
              <span className="font-medium text-foreground">
                {(entry.new_values as Record<string, string>)['status']}
              </span>
            </span>
          )}
        </div>

        {/* Expanded details */}
        {expanded && hasDetails && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
            {entry.old_values && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Previous:</span>
                <ChangeDetails values={entry.old_values} type="old" />
              </div>
            )}
            {entry.new_values && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">New:</span>
                <ChangeDetails values={entry.new_values} type="new" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AuditLogProps {
  leadId: string;
}

export function AuditLogView({ leadId }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const limit = 20;

  async function fetchEntries(loadMore = false) {
    const currentOffset = loadMore ? offset : 0;

    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch(
        `/api/leads/${leadId}/audit?limit=${limit}&offset=${currentOffset}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit log');
      }

      const data = await response.json();

      if (loadMore) {
        setEntries((prev) => [...prev, ...data.data]);
      } else {
        setEntries(data.data);
      }

      setHasMore(data.pagination.hasMore);
      setOffset(currentOffset + limit);
    } catch (err) {
      console.error('Error fetching audit log:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchEntries();
  }, [leadId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchEntries()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedEntries = groupByDate(entries);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[600px] pr-4">
          {Object.entries(groupedEntries).map(([date, dateEntries]) => (
            <div key={date} className="mb-6 last:mb-0">
              <div className="sticky top-0 bg-background py-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {date}
                </span>
              </div>
              <div>
                {dateEntries.map((entry) => (
                  <AuditEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchEntries(true)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
