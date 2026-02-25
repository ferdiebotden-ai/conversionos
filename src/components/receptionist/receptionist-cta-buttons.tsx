'use client';

/**
 * Receptionist CTA Buttons
 * Parses [CTA:Label:/path] markers from message text and renders:
 * - HandoffCard for persona routes (/estimate, /visualizer)
 * - Regular link buttons for non-persona routes
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { HandoffCard } from '@/components/chat/handoff-card';
import { useTier } from '@/components/tier-provider';
import { useCopyContext } from '@/lib/copy/use-site-copy';
import { getEstimateCTA } from '@/lib/copy/site-copy';
import type { PersonaKey } from '@/lib/ai/personas/types';

const CTA_REGEX = /\[CTA:([^:]+):([^\]]+)\]/g;

/** Routes that trigger handoff cards (uses legacy PersonaKey for backward compat with serialized data) */
const HANDOFF_ROUTES: Record<string, PersonaKey> = {
  '/estimate': 'quote-specialist',
  '/visualizer': 'design-consultant',
};

interface CTAMatch {
  label: string;
  path: string;
}

/**
 * Extract CTA markers from text
 */
function extractCTAs(text: string): CTAMatch[] {
  const matches: CTAMatch[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  CTA_REGEX.lastIndex = 0;
  while ((match = CTA_REGEX.exec(text)) !== null) {
    if (match[1] && match[2]) {
      matches.push({ label: match[1], path: match[2] });
    }
  }
  return matches;
}

/**
 * Remove CTA markers from text, returning clean text for display
 */
export function stripCTAs(text: string): string {
  return text.replace(CTA_REGEX, '').trim();
}

/**
 * Render inline CTA buttons parsed from message text
 * Persona routes render as HandoffCard; other routes render as link buttons
 */
export function ReceptionistCTAButtons({
  text,
  messages,
}: {
  text: string;
  messages?: { role: 'user' | 'assistant'; content: string }[];
}) {
  const { canAccess } = useTier();
  const copyCtx = useCopyContext();
  const estimateCta = getEstimateCTA(copyCtx);
  const hasQuoteEngine = canAccess('ai_quote_engine');
  const ctas = extractCTAs(text);

  // Rewrite /estimate CTAs for tiers without quotes enabled
  if (!hasQuoteEngine || copyCtx.quoteMode === 'none') {
    for (const cta of ctas) {
      if (cta.path === '/estimate') {
        cta.path = estimateCta.href;
        cta.label = estimateCta.label;
      }
    }
  }

  // Fallback: detect natural language routing when no CTA markers found
  // Skip NLP fallback on the greeting message (first assistant message) to avoid
  // phantom CTAs from words like "transformation" matching the /transform/i regex
  const isGreeting = !messages || messages.filter(m => m.role === 'assistant').length <= 1;

  if (ctas.length === 0 && !isGreeting) {
    if (/estimate|cost|price|quote|budget|pricing/i.test(text)) {
      ctas.push({ label: estimateCta.label, path: estimateCta.href });
    }
    if (/visualiz|design|transform|see what|see your/i.test(text)) {
      ctas.push({ label: 'Try the Visualizer', path: '/visualizer' });
    }
    if (/contact|reach out|call|phone/i.test(text) && !/callback|call back/i.test(text)) {
      ctas.push({ label: 'Contact Us', path: '/contact' });
    }
    if (/services|what we offer|what we do/i.test(text)) {
      ctas.push({ label: 'View Services', path: '/services' });
    }
  }

  if (ctas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {ctas.map((cta, index) => {
        const toPersona = HANDOFF_ROUTES[cta.path];

        if (toPersona && messages) {
          return (
            <HandoffCard
              key={`${cta.path}-${index}`}
              fromPersona="receptionist"
              toPersona={toPersona}
              messages={messages}
            />
          );
        }

        // Regular link button for non-persona routes
        return (
          <Button
            key={`${cta.path}-${index}`}
            variant="outline"
            size="sm"
            className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
            asChild
          >
            <Link href={cta.path}>
              {cta.label}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
