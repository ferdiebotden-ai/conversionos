'use client';

/**
 * No Photo Chat Panel
 * Alternative path for homeowners who skip photo upload.
 * Embeds full-width Emma chat (ReceptionistChat) + inline lead capture form.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Check } from 'lucide-react';
import { ReceptionistChat } from '@/components/receptionist/receptionist-chat';
import { NoPhotoLeadForm } from './no-photo-lead-form';
import { motion } from 'framer-motion';
import { panelSpring } from '@/lib/animations';
import { ScaleIn } from '@/components/motion';
import { useBranding } from '@/components/branding-provider';
import { useTier } from '@/components/tier-provider';

interface NoPhotoChatPanelProps {
  onBackToPhoto: () => void;
}

export function NoPhotoChatPanel({ onBackToPhoto }: NoPhotoChatPanelProps) {
  const branding = useBranding();
  const { canAccess } = useTier();
  const [showForm, setShowForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const ctaLabel = canAccess('ai_quote_engine')
    ? 'Get My Estimate'
    : 'Get in Touch';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={panelSpring as any}
      className="space-y-4"
    >
      {/* Back link */}
      <button
        type="button"
        onClick={onBackToPhoto}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to photo upload
      </button>

      {/* Header */}
      <div className="text-center pb-2">
        <div className="mx-auto inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-3">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Tell Us About Your Project</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Chat with Emma or fill in the form below — either way, we&apos;ll get back to you.
        </p>
      </div>

      {/* Emma chat — embedded at full width */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-primary text-primary-foreground rounded-t-2xl">
          <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <MessageCircle className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Emma</p>
            <p className="text-xs opacity-80">{branding.name}</p>
          </div>
        </div>
        <div className="h-[380px]">
          <ReceptionistChat />
        </div>
      </div>

      {/* CTA to reveal lead form */}
      {!showForm && !leadSubmitted && (
        <div className="text-center pt-2">
          <Button
            size="lg"
            className="min-h-[48px] w-full sm:w-auto sm:px-8"
            onClick={() => setShowForm(true)}
          >
            {ctaLabel}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Or keep chatting — Emma can answer your questions first.
          </p>
        </div>
      )}

      {/* Inline lead form */}
      {showForm && !leadSubmitted && (
        <NoPhotoLeadForm onSubmitted={() => setLeadSubmitted(true)} />
      )}

      {/* Success state */}
      {leadSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={panelSpring as any}
          className="border border-border rounded-2xl bg-card p-6 text-center"
          data-testid="no-photo-lead-success"
        >
          <ScaleIn>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
          </ScaleIn>
          <h3 className="text-lg font-semibold">You&apos;re all set!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {branding.name} has everything they need. They&apos;ll follow up within 24 hours.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
