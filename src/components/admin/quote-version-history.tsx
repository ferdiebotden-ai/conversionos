'use client';

/**
 * Quote Version History
 * Horizontal chip bar showing all versions of a quote with sent/acceptance status.
 */

import { Check, Clock, FileText, Send } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface VersionSummary {
  version: number;
  status: 'draft' | 'sent';
  updatedAt: string;
  sentAt?: string | undefined;
  total: number | null;
  acceptanceStatus?: string | undefined;
}

interface QuoteVersionHistoryProps {
  versions: VersionSummary[];
  activeVersion: number;
  onSelectVersion: (version: number) => void;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function QuoteVersionHistory({
  versions,
  activeVersion,
  onSelectVersion,
}: QuoteVersionHistoryProps) {
  if (versions.length <= 1) return null;

  const latestVersion = versions[0]?.version ?? 1;
  const isViewingOldVersion = activeVersion !== latestVersion;

  return (
    <TooltipProvider>
    <div className="space-y-2">
      {/* Version chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Versions:</span>
        {versions.map((v) => {
          const isActive = v.version === activeVersion;
          const isSent = v.status === 'sent';
          const isAccepted = v.acceptanceStatus === 'accepted';
          const isPending = v.acceptanceStatus === 'pending';

          return (
            <Tooltip key={v.version}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelectVersion(v.version)}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    transition-colors shrink-0 cursor-pointer border
                    ${isActive
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border'
                    }
                  `}
                >
                  {isSent ? (
                    <Send className="h-3 w-3" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                  <span>v{v.version}</span>
                  {isSent && v.sentAt && (
                    <span className="text-[10px] opacity-70">{formatShortDate(v.sentAt)}</span>
                  )}
                  {isAccepted && (
                    <Check className="h-3 w-3 text-green-600" />
                  )}
                  {isPending && (
                    <Clock className="h-3 w-3 text-amber-500" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {v.total != null ? formatCurrency(v.total) : 'No total'}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Read-only banner when viewing old version */}
      {isViewingOldVersion && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Viewing version {activeVersion}
            {versions.find((v) => v.version === activeVersion)?.sentAt && (
              <> (sent {formatShortDate(versions.find((v) => v.version === activeVersion)!.sentAt!)})</>
            )}
            . This version is read-only.
          </span>
          <button
            onClick={() => onSelectVersion(latestVersion)}
            className="ml-auto text-xs font-medium text-amber-700 hover:text-amber-900 underline shrink-0"
          >
            Back to latest
          </button>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
