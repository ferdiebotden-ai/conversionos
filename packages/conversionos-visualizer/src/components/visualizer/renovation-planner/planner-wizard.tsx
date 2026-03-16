'use client';

/**
 * Renovation Planner Wizard
 * 4-step wizard replacing the basic no-photo chat panel.
 * Captures room type, details, style + finish, then shows an instant estimate
 * with a contact form — all without requiring a photo upload.
 *
 * Step 1: Room Type (card grid)
 * Step 2: Room Details (size, condition, changelist)
 * Step 3: Style & Finish (style grid + finish level with $/sqft context)
 * Step 4: Instant Estimate + Contact Form
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { panelSpring } from '@/lib/animations';
import { ScaleIn } from '@/components/motion';
import { useBranding } from '@/components/branding-provider';
import { DEFAULT_SQFT } from '@/lib/ai/knowledge/pricing-data';
import type { FinishLevel } from '@/lib/ai/knowledge/pricing-data';

import {
  RoomTypeSelector,
  type RoomTypeSelection,
} from '@/components/visualizer/room-type-selector';

import {
  StepRoomDetails,
  type RoomDetailsData,
  type RoomSize,
} from './step-room-details';

import {
  StepStyleFinish,
  type StyleFinishData,
} from './step-style-finish';

import { StepInstantEstimate } from './step-instant-estimate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlannerWizardProps {
  onBackToPhoto: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = ['Room Type', 'Details', 'Style', 'Estimate'];

const SIZE_TO_SQFT: Record<RoomSize, number> = {
  small: 50,
  medium: 150,
  large: 300,
  custom: 150, // fallback, overridden by customSqft
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlannerWizard({ onBackToPhoto }: PlannerWizardProps) {
  const branding = useBranding();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 state
  const [roomType, setRoomType] = useState<RoomTypeSelection | null>(null);

  // Step 2 state
  const [roomDetails, setRoomDetails] = useState<RoomDetailsData>({
    size: 'medium',
    customSqft: null,
    condition: 'dated',
    changelist: [],
  });

  // Step 3 state
  const [styleFinish, setStyleFinish] = useState<StyleFinishData>({
    style: null,
    finishLevel: 'standard',
  });

  // Derived values
  const effectiveRoomType = roomType === 'other' ? 'living_room' : (roomType ?? 'kitchen');
  const effectiveSqft =
    roomDetails.size === 'custom' && roomDetails.customSqft
      ? roomDetails.customSqft
      : SIZE_TO_SQFT[roomDetails.size] || DEFAULT_SQFT[effectiveRoomType] || 150;

  // Step validation
  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return roomType !== null;
      case 1:
        return roomDetails.changelist.length > 0;
      case 2:
        return true; // Style is optional, finish level has a default
      default:
        return false;
    }
  };

  const goNext = () => {
    if (step < STEPS.length - 1 && canAdvance()) {
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={panelSpring as any}
        className="border border-border rounded-2xl bg-card p-6 text-center"
        data-testid="planner-success"
      >
        <ScaleIn>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
        </ScaleIn>
        <h3 className="text-lg font-semibold">You&apos;re all set!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {branding.name} has everything they need. They&apos;ll follow up within 24 hours
          with a detailed estimate.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={panelSpring as any}
      className="space-y-4"
    >
      {/* Back to photo link */}
      <button
        type="button"
        onClick={onBackToPhoto}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colours"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to photo upload
      </button>

      {/* Progress indicator */}
      <div className="flex items-center gap-1 px-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colours ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
            <p
              className={`text-[10px] mt-1 ${
                i === step
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="border border-border rounded-2xl bg-card p-4 min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <RoomTypeSelector
                value={roomType}
                onChange={setRoomType}
                allowCustom
              />
            )}

            {step === 1 && (
              <StepRoomDetails
                value={roomDetails}
                onChange={setRoomDetails}
              />
            )}

            {step === 2 && (
              <StepStyleFinish
                value={styleFinish}
                onChange={setStyleFinish}
                roomType={effectiveRoomType}
              />
            )}

            {step === 3 && (
              <StepInstantEstimate
                roomType={effectiveRoomType}
                sqft={effectiveSqft}
                finishLevel={styleFinish.finishLevel as FinishLevel}
                onSubmitted={() => setSubmitted(true)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons (hidden on Step 4 — it has its own submit) */}
      {step < 3 && (
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={step === 0}
            className="min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <Button
            onClick={goNext}
            disabled={!canAdvance()}
            className="min-h-[44px] flex-1 sm:flex-initial sm:min-w-[140px]"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
