'use client';

/**
 * Handoff Card
 * Rich inline card for feature navigation with context passing
 * Renders within chat message flow as a visual CTA
 */

import { useCallback } from 'react';
import { ArrowRight, Calculator, Palette } from 'lucide-react';
import { serializeHandoffContext } from '@/lib/chat/handoff';
import type { PersonaKey } from '@/lib/ai/personas/types';

interface HandoffCardProps {
  /** Current persona (source) — kept for backward compat with serialized data */
  fromPersona: PersonaKey;
  /** Target persona — kept for backward compat with serialized data */
  toPersona: PersonaKey;
  /** Recent messages for context serialization */
  messages: { role: 'user' | 'assistant'; content: string }[];
  /** Extracted data to pass along */
  extractedData?: Record<string, unknown>;
}

/** Action-oriented route info — no persona names displayed */
const ROUTE_INFO: Record<PersonaKey, {
  label: string;
  description: string;
  path: string;
  icon: typeof Calculator;
  color: string;
}> = {
  receptionist: {
    label: 'Back to Home',
    description: 'Return to the main page',
    path: '/',
    icon: ArrowRight,
    color: 'bg-primary',
  },
  'quote-specialist': {
    label: 'Get an Estimate',
    description: 'Get a detailed cost breakdown',
    path: '/estimate',
    icon: Calculator,
    color: 'bg-blue-600',
  },
  'design-consultant': {
    label: 'Try the Visualizer',
    description: 'See your space transformed with AI',
    path: '/visualizer',
    icon: Palette,
    color: 'bg-primary',
  },
};

export function HandoffCard({
  fromPersona,
  toPersona,
  messages,
  extractedData,
}: HandoffCardProps) {
  const target = ROUTE_INFO[toPersona];
  const Icon = target.icon;

  const handleClick = useCallback(() => {
    // Serialize context to sessionStorage before navigating (uses legacy PersonaKey for compat)
    serializeHandoffContext(fromPersona, toPersona, messages, extractedData);
    // Full page navigation to reliably exit the widget overlay context
    window.location.href = `${target.path}?handoff=${fromPersona}`;
  }, [fromPersona, toPersona, messages, extractedData, target.path]);

  return (
    <div className="my-2 mx-1">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left group"
      >
        <div className={`h-10 w-10 rounded-full ${target.color} text-white flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{target.label}</p>
          <p className="text-xs text-muted-foreground">{target.description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      </button>
    </div>
  );
}
