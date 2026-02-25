'use client';

/**
 * Progress Indicator
 * Visual indicator showing conversation progress (e.g., "Step 3 of 6")
 * PRD: QA-008 - Display progress indicator showing conversation stage
 */

import { Check, Circle, Image as ImageIcon, ListChecks, DollarSign, User, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProgressStep =
  | 'welcome'
  | 'photo'
  | 'project_type'
  | 'details'
  | 'scope'
  | 'estimate'
  | 'contact';

interface Step {
  id: ProgressStep;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  { id: 'welcome', label: 'Welcome', shortLabel: 'Start', icon: MessageSquare },
  { id: 'photo', label: 'Photo Upload', shortLabel: 'Photo', icon: ImageIcon },
  { id: 'project_type', label: 'Project Type', shortLabel: 'Type', icon: ListChecks },
  { id: 'details', label: 'Project Details', shortLabel: 'Details', icon: ListChecks },
  { id: 'scope', label: 'Scope Summary', shortLabel: 'Scope', icon: ListChecks },
  { id: 'estimate', label: 'Estimate', shortLabel: 'Quote', icon: DollarSign },
  { id: 'contact', label: 'Contact Info', shortLabel: 'Contact', icon: User },
];

interface ProgressIndicatorProps {
  currentStep: ProgressStep;
  hasPhoto?: boolean;
  className?: string;
}

/**
 * Get numeric index for a step
 */
function getStepIndex(step: ProgressStep): number {
  return STEPS.findIndex(s => s.id === step);
}

/**
 * Detect current step from conversation messages
 * Analyzes message content to determine conversation stage
 * Photo step is only shown if user uploaded a photo or AI explicitly asked for one
 */
export function detectProgressStep(messages: { role: string; content: string }[]): ProgressStep {
  // Get all message contents joined for analysis
  const allContent = messages.map(m => m.content.toLowerCase()).join(' ');
  const lastAssistantMessage = [...messages]
    .reverse()
    .find(m => m.role === 'assistant')?.content.toLowerCase() || '';

  // Check for completion indicators (most specific first)
  if (
    allContent.includes('thank you for providing your contact') ||
    allContent.includes("we'll be in touch") ||
    allContent.includes('your information has been saved') ||
    /submitted|received your request/.test(allContent)
  ) {
    return 'contact';
  }

  // Check for contact capture stage
  if (
    lastAssistantMessage.includes('name and email') ||
    lastAssistantMessage.includes('contact information') ||
    lastAssistantMessage.includes('phone number') ||
    lastAssistantMessage.includes('get in touch') ||
    lastAssistantMessage.includes('reach you')
  ) {
    return 'contact';
  }

  // Check for estimate display
  if (
    allContent.includes('estimate') &&
    (allContent.includes('$') || /\$[\d,]+/.test(allContent))
  ) {
    return 'estimate';
  }

  // Check for scope summary
  if (
    lastAssistantMessage.includes('to summarize') ||
    lastAssistantMessage.includes("here's what") ||
    lastAssistantMessage.includes('summary of your project') ||
    lastAssistantMessage.includes('based on what you')
  ) {
    return 'scope';
  }

  // Check for project-specific questions (details stage)
  const detailKeywords = [
    'cabinet', 'countertop', 'appliance', 'tile', 'fixture',
    'finish level', 'quality', 'timeline', 'square feet', 'sq ft',
    'layout', 'tub', 'shower', 'egress', 'moisture', 'flooring type',
    'rooms will need', 'subfloor', 'what type of'
  ];
  if (detailKeywords.some(kw => lastAssistantMessage.includes(kw))) {
    return 'details';
  }

  // Check for project type selection
  if (
    lastAssistantMessage.includes('what type of project') ||
    lastAssistantMessage.includes('what kind of renovation') ||
    lastAssistantMessage.includes('kitchen, bathroom, basement') ||
    messages.some(m => m.role === 'user' &&
      /kitchen|bathroom|basement|flooring/i.test(m.content) &&
      m.content.length < 50) // Short responses indicating selection
  ) {
    // If user already selected a type, move to details
    const hasTypeSelection = messages.some(m =>
      m.role === 'user' &&
      /^(kitchen|bathroom|basement|flooring)$/i.test(m.content.trim())
    );
    if (hasTypeSelection && !lastAssistantMessage.includes('what type of project')) {
      return 'details';
    }
    return 'project_type';
  }

  // Check for photo analysis - only if photo was actually uploaded
  // Photo indicators: "[user uploaded" marker or AI acknowledging seeing an image
  const hasUploadedPhoto = allContent.includes('[user uploaded');
  const aiAcknowledgedPhoto = allContent.includes('i can see') && messages.length > 2;

  if (hasUploadedPhoto || aiAcknowledgedPhoto) {
    return 'photo';
  }

  // Default to welcome - skip photo step entirely if no photo interaction
  return 'welcome';
}

export function ProgressIndicator({ currentStep, hasPhoto = false, className }: ProgressIndicatorProps) {
  // Filter out photo step if no photo has been uploaded
  const displaySteps = hasPhoto || currentStep === 'photo'
    ? STEPS
    : STEPS.filter(s => s.id !== 'photo');

  const currentIndex = displaySteps.findIndex(s => s.id === currentStep);

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: Compact horizontal progress */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
          <span className="text-xs text-muted-foreground">
            Step {Math.max(1, currentIndex + 1)} of {displaySteps.length}
          </span>
          <span className="text-xs font-medium">
            {displaySteps[currentIndex]?.label || 'Getting Started'}
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / displaySteps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: Step indicators with icons */}
      <div className="hidden sm:flex items-center justify-center gap-2">
        {displaySteps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                    isComplete && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                    !isComplete && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1 whitespace-nowrap',
                    isCurrent && 'font-semibold text-primary',
                    isComplete && 'font-medium text-foreground',
                    !isCurrent && !isComplete && 'text-muted-foreground'
                  )}
                >
                  {step.shortLabel}
                </span>
              </div>

              {/* Connector line */}
              {index < displaySteps.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-[3px] mx-1 mt-[-16px] rounded-full',
                    index < currentIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
