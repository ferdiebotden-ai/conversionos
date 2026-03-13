'use client';

/**
 * Lead Project Card
 * Displays project details, AI confidence, and notes
 * [DEV-051]
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Lead, ProjectType, Timeline, BudgetBand, FinishLevel } from '@/types/database';
import { Hammer, Calendar, DollarSign, Sparkles, Brain } from 'lucide-react';

// Labels for enum values
const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  basement: 'Basement',
  flooring: 'Flooring',
  painting: 'Painting',
  exterior: 'Exterior',
  other: 'Other',
};

const TIMELINE_LABELS: Record<Timeline, string> = {
  asap: 'ASAP',
  '1_3_months': '1-3 months',
  '3_6_months': '3-6 months',
  '6_plus_months': '6+ months',
  just_exploring: 'Just exploring',
};

const BUDGET_LABELS: Record<BudgetBand, string> = {
  under_15k: 'Under $15K',
  '15k_25k': '$15K - $25K',
  '25k_40k': '$25K - $40K',
  '40k_60k': '$40K - $60K',
  '60k_plus': '$60K+',
  not_sure: 'Not sure',
};

const FINISH_LABELS: Record<FinishLevel, string> = {
  economy: 'Economy',
  standard: 'Standard',
  premium: 'Premium',
};

interface LeadProjectCardProps {
  lead: Lead;
}

export function LeadProjectCard({ lead }: LeadProjectCardProps) {
  // Calculate confidence display
  const confidencePercent = lead.confidence_score
    ? Math.round(lead.confidence_score * 100)
    : null;
  const confidenceColor =
    confidencePercent && confidencePercent >= 70
      ? 'text-green-600'
      : confidencePercent && confidencePercent >= 40
      ? 'text-amber-600'
      : 'text-red-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Project Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Type */}
        <div className="flex items-center gap-3">
          <Hammer className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Project Type</p>
            <p className="font-medium">
              {lead.project_type
                ? PROJECT_TYPE_LABELS[lead.project_type]
                : 'Not specified'}
            </p>
          </div>
          {lead.area_sqft && (
            <Badge variant="secondary">{lead.area_sqft} sq ft</Badge>
          )}
        </div>

        {/* Timeline */}
        {lead.timeline && (
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Timeline</p>
              <p className="font-medium">{TIMELINE_LABELS[lead.timeline]}</p>
            </div>
          </div>
        )}

        {/* Budget */}
        {lead.budget_band && (
          <div className="flex items-center gap-3">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="font-medium">{BUDGET_LABELS[lead.budget_band]}</p>
            </div>
          </div>
        )}

        {/* Finish Level */}
        {lead.finish_level && (
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Finish Level</p>
              <p className="font-medium">{FINISH_LABELS[lead.finish_level]}</p>
            </div>
          </div>
        )}

        {/* AI Confidence */}
        {confidencePercent !== null && (
          <div className="flex items-center gap-3">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">AI Confidence</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      confidencePercent >= 70
                        ? 'bg-green-500'
                        : confidencePercent >= 40
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
                <span className={`text-sm font-medium ${confidenceColor}`}>
                  {confidencePercent}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Goals Text */}
        {lead.goals_text && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">
              Customer&apos;s Goals
            </p>
            <p className="text-sm">{lead.goals_text}</p>
          </div>
        )}

        {/* AI Notes */}
        {lead.ai_notes && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">AI Notes</p>
            <p className="text-sm text-muted-foreground italic">
              {lead.ai_notes}
            </p>
          </div>
        )}

        {/* Source */}
        <div className="pt-2 border-t text-sm text-muted-foreground">
          <span>Source: </span>
          <span className="font-medium">{lead.source}</span>
          {lead.utm_campaign && (
            <span className="ml-2">({lead.utm_campaign})</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
