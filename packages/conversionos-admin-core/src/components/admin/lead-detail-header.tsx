'use client';

/**
 * Lead Detail Header
 * Shows lead name, status dropdown, and action buttons
 * Enhanced with status transition validation and confirmation dialogs
 * [DEV-051, DEV-059]
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { Lead, LeadStatus } from '@/types/database';
import {
  ArrowLeft,
  Mail,
  Phone,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// Status badge styles
const STATUS_STYLES: Record<LeadStatus, { label: string; className: string; icon: React.ReactNode }> = {
  new: {
    label: 'New',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    icon: <Clock className="h-3 w-3" />,
  },
  draft_ready: {
    label: 'Draft Ready',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    icon: <Clock className="h-3 w-3" />,
  },
  needs_clarification: {
    label: 'Needs Info',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  sent: {
    label: 'Sent',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
    icon: <Mail className="h-3 w-3" />,
  },
  won: {
    label: 'Won',
    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  lost: {
    label: 'Lost',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    icon: <XCircle className="h-3 w-3" />,
  },
};

// Status workflow - what statuses can transition to what
const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ['draft_ready', 'needs_clarification', 'lost'],
  draft_ready: ['sent', 'needs_clarification', 'lost'],
  needs_clarification: ['draft_ready', 'lost'],
  sent: ['won', 'lost', 'needs_clarification'],
  won: [], // Terminal state
  lost: ['new'], // Allow reopening
};

// Status descriptions for confirmation dialogs
const STATUS_DESCRIPTIONS: Record<LeadStatus, string> = {
  new: 'Reset this lead to new status. The lead will need to go through the workflow again.',
  draft_ready: 'Mark this lead as having a draft quote ready for review.',
  needs_clarification: 'Mark this lead as needing more information from the customer.',
  sent: 'Mark this quote as sent to the customer. Use the Send Quote button to actually send the email.',
  won: 'Mark this lead as WON. This indicates the customer has accepted the quote.',
  lost: 'Mark this lead as LOST. This indicates the customer declined or the lead is no longer viable.',
};

// Statuses that require a quote before transitioning to
const REQUIRES_QUOTE: LeadStatus[] = ['sent'];

// Terminal statuses (cannot be changed from, except for reopening)
const TERMINAL_STATUSES: LeadStatus[] = ['won', 'lost'];

interface LeadDetailHeaderProps {
  lead: Lead;
  hasQuote?: boolean | undefined;
  quoteSentAt?: string | null | undefined;
}

export function LeadDetailHeader({ lead, hasQuote = false, quoteSentAt }: LeadDetailHeaderProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(lead.status);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  const isTerminalStatus = TERMINAL_STATUSES.includes(currentStatus);

  // Validate if a transition is allowed
  function validateTransition(newStatus: LeadStatus): { allowed: boolean; reason?: string } {
    // Check if quote is required
    if (REQUIRES_QUOTE.includes(newStatus) && !hasQuote) {
      return {
        allowed: false,
        reason: 'A quote must be created before marking this lead as sent. Please create and save a quote first.',
      };
    }

    // Special case: sent status requires an actual email to be sent
    if (newStatus === 'sent' && !quoteSentAt && currentStatus !== 'sent') {
      return {
        allowed: false,
        reason: 'Please use the "Send Quote" button in the Quote tab to send the quote email. This will automatically update the status.',
      };
    }

    return { allowed: true };
  }

  function handleStatusSelect(newStatus: LeadStatus) {
    if (newStatus === currentStatus) return;

    const validation = validateTransition(newStatus);
    if (!validation.allowed) {
      setBlockedReason(validation.reason || 'This transition is not allowed.');
      setShowBlockedDialog(true);
      return;
    }

    setPendingStatus(newStatus);
    setShowConfirmDialog(true);
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: pendingStatus,
          status_note: statusNote.trim() || undefined,
        }),
      });

      if (response.ok) {
        setCurrentStatus(pendingStatus);
        setShowConfirmDialog(false);
        setPendingStatus(null);
        setStatusNote('');
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }

  function cancelStatusChange() {
    setShowConfirmDialog(false);
    setPendingStatus(null);
    setStatusNote('');
    setError(null);
  }

  // Format date for display
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/admin/leads"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to leads
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{lead.name}</h1>
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge
                variant="secondary"
                className={cn('text-xs flex items-center gap-1', STATUS_STYLES[currentStatus].className)}
              >
                {STATUS_STYLES[currentStatus].icon}
                {STATUS_STYLES[currentStatus].label}
              </Badge>
            )}
          </div>

          {/* Last updated timestamp */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Last updated: {formatDate(lead.updated_at)}
            </span>
            {quoteSentAt && (
              <span className="flex items-center gap-1 text-green-600">
                <Mail className="h-3 w-3" />
                Quote sent: {formatDate(quoteSentAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status dropdown */}
          {allowedTransitions.length > 0 && (
            <Select
              value=""
              onValueChange={(value) => handleStatusSelect(value as LeadStatus)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                {allowedTransitions.map((status) => (
                  <SelectItem key={status} value={status}>
                    <span className="flex items-center gap-2">
                      {STATUS_STYLES[status].icon}
                      {STATUS_STYLES[status].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isTerminalStatus && currentStatus === 'won' && (
            <Badge className="bg-emerald-500 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Project Won!
            </Badge>
          )}

          {/* Quick actions */}
          {lead.email && (
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${lead.email}`}>
                <Mail className="h-4 w-4 mr-1" />
                Email
              </a>
            </Button>
          )}
          {lead.phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4 mr-1" />
                Call
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => !open && cancelStatusChange()}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Change Status to {pendingStatus && STATUS_STYLES[pendingStatus].label}
            </DialogTitle>
            <DialogDescription>
              {pendingStatus && STATUS_DESCRIPTIONS[pendingStatus]}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status change preview */}
            <div className="flex items-center justify-center gap-4">
              <Badge
                variant="secondary"
                className={cn('text-xs', STATUS_STYLES[currentStatus].className)}
              >
                {STATUS_STYLES[currentStatus].label}
              </Badge>
              <span className="text-muted-foreground">→</span>
              {pendingStatus && (
                <Badge
                  variant="secondary"
                  className={cn('text-xs', STATUS_STYLES[pendingStatus].className)}
                >
                  {STATUS_STYLES[pendingStatus].label}
                </Badge>
              )}
            </div>

            {/* Notes field */}
            <div className="space-y-2">
              <Label htmlFor="status-note">Add a note (optional)</Label>
              <Textarea
                id="status-note"
                placeholder="Reason for status change..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
              />
            </div>

            {/* Warning for terminal statuses */}
            {pendingStatus && TERMINAL_STATUSES.includes(pendingStatus) && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">This is a terminal status</p>
                  <p className="text-amber-700">
                    {pendingStatus === 'won'
                      ? 'Once marked as won, this lead cannot be changed further.'
                      : 'Once marked as lost, you can only reopen it to "New" status.'}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={cancelStatusChange} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={isUpdating}
              className={cn(
                pendingStatus === 'lost' && 'bg-gray-600 hover:bg-gray-700',
                pendingStatus === 'won' && 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Confirm Change'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked Transition Dialog */}
      <AlertDialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Action Required
            </AlertDialogTitle>
            <AlertDialogDescription>{blockedReason}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowBlockedDialog(false)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
