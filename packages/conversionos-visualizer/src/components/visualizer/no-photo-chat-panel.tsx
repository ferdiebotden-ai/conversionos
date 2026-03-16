'use client';

/**
 * No Photo Chat Panel
 * Alternative path for homeowners who skip photo upload.
 * Primary content: Renovation Planner Wizard (4-step guided flow with instant estimate).
 * Fallback: Emma chat widget remains available via the global receptionist widget.
 */

import { PlannerWizard } from './renovation-planner/planner-wizard';

interface NoPhotoChatPanelProps {
  onBackToPhoto: () => void;
}

export function NoPhotoChatPanel({ onBackToPhoto }: NoPhotoChatPanelProps) {
  return <PlannerWizard onBackToPhoto={onBackToPhoto} />;
}
