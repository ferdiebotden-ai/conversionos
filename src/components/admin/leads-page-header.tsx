'use client';

/**
 * Leads Page Header
 * Shows page description and optional "+ New Lead" button for contractor intake.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContractorIntakeDialog } from './contractor-intake-dialog';
import { Plus } from 'lucide-react';

interface LeadsPageHeaderProps {
  showIntakeButton: boolean;
}

export function LeadsPageHeader({ showIntakeButton }: LeadsPageHeaderProps) {
  const [intakeOpen, setIntakeOpen] = useState(false);
  const router = useRouter();

  const handleLeadCreated = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_leadId: string) => {
      router.refresh();
    },
    [router],
  );

  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground">
        Manage and track all your renovation leads.
      </p>
      {showIntakeButton && (
        <>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground/70 hidden sm:inline">
              Phone calls, walk-ins &amp; referrals
            </span>
            <Button onClick={() => setIntakeOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New Lead
            </Button>
          </div>
          <ContractorIntakeDialog
            open={intakeOpen}
            onOpenChange={setIntakeOpen}
            onLeadCreated={handleLeadCreated}
          />
        </>
      )}
    </div>
  );
}
