'use client';

/**
 * Result Display
 * Complete visualization results with animated reveals
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BeforeAfterSlider } from './before-after-slider';
import { ConceptThumbnails } from './concept-thumbnails';
import { CostRangeIndicator } from './cost-range-indicator';
import { SaveVisualizationModal } from './save-visualization-modal';
import { DownloadButton } from './download-button';
import { EmailCaptureModal } from './email-capture-modal';
import { FadeInUp, ScaleIn, StaggerContainer, StaggerItem } from '@/components/motion';
import { useTier } from '@/components/tier-provider';
import { useBranding } from '@/components/branding-provider';
import { useCopyContext } from '@/lib/copy/use-site-copy';
import { getVisualizerResultCTA } from '@/lib/copy/site-copy';
import type { VisualizationResponse } from '@/lib/schemas/visualization';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  MessageSquare,
  RefreshCw,
  Clock,
  Sparkles,
  Phone,
  Palette,
  Mail,
} from 'lucide-react';

interface ResultDisplayProps {
  visualization: VisualizationResponse;
  originalImage: string;
  onStartOver: () => void;
  onGetQuote: () => void;
  onTryAnotherStyle?: () => void;
  className?: string;
}

export function ResultDisplay({
  visualization,
  originalImage,
  onStartOver,
  onGetQuote,
  onTryAnotherStyle,
  className,
}: ResultDisplayProps) {
  const { canAccess } = useTier();
  const branding = useBranding();
  const copyCtx = useCopyContext();
  const [selectedConceptIndex, setSelectedConceptIndex] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [emailCaptureOpen, setEmailCaptureOpen] = useState(false);
  const [hasProvidedEmail, setHasProvidedEmail] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // Tier + quoteMode aware CTA configuration
  const resultCTA = getVisualizerResultCTA(copyCtx, branding.name);
  const primaryCTA = {
    label: resultCTA.label,
    icon: resultCTA.icon === 'message' ? MessageSquare : Phone,
  };

  // Show sticky CTA after intro animation completes (~3s)
  useEffect(() => {
    const timer = setTimeout(() => setShowStickyCTA(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const selectedConcept = visualization.concepts[selectedConceptIndex];

  // Format generation time
  const formatTime = (ms: number): string => {
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  // Format style name for display
  const formatStyle = (style: string): string => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  // Format room type for display
  const formatRoomType = (roomType: string): string => {
    return roomType.replace(/_/g, ' ');
  };

  // Handle pre-download email capture
  const handleBeforeDownload = async (): Promise<boolean> => {
    // If user already provided email, allow download
    if (hasProvidedEmail) {
      return true;
    }

    // Show email capture modal
    setEmailCaptureOpen(true);
    return false;
  };

  // Handle email submission
  const handleEmailSubmitted = () => {
    setHasProvidedEmail(true);
    setEmailCaptureOpen(false);
  };

  return (
    <div className={cn('space-y-6', className)} data-testid="visualization-result">
      {/* Success header */}
      <ScaleIn className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <Sparkles className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Your Vision is Ready!</h2>
        <p className="text-muted-foreground mt-1">
          We&apos;ve reimagined your {formatRoomType(visualization.roomType)} in{' '}
          {visualization.concepts.length} stunning {formatStyle(visualization.style)}{' '}
          concepts
        </p>
        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Generated in {formatTime(visualization.generationTimeMs)}</span>
        </div>
      </ScaleIn>

      {/* Before/After comparison */}
      <FadeInUp className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Drag to compare before and after
        </h3>
        {selectedConcept && (
          <BeforeAfterSlider
            beforeImage={originalImage}
            afterImage={selectedConcept.imageUrl}
            beforeLabel="Current"
            afterLabel={`Concept ${selectedConceptIndex + 1}`}
          />
        )}
      </FadeInUp>

      {/* Concept thumbnails */}
      {visualization.concepts.length > 1 && (
        <FadeInUp className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Choose a concept
          </h3>
          <ConceptThumbnails
            concepts={visualization.concepts}
            selectedIndex={selectedConceptIndex}
            onSelect={setSelectedConceptIndex}
          />
        </FadeInUp>
      )}

      {/* Selected concept description */}
      {selectedConcept?.description && (
        <FadeInUp>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm">{selectedConcept.description}</p>
          </div>
        </FadeInUp>
      )}

      {/* Cost range indicator (tier + mode gated — hidden for Elevate or mode=none) */}
      <FadeInUp>
        <CostRangeIndicator
          roomType={visualization.roomType}
        />
      </FadeInUp>

      {/* Action buttons */}
      <StaggerContainer className="flex flex-col sm:flex-row gap-3">
        {/* Primary CTA — tier-aware */}
        <StaggerItem className="flex-1">
          <Button
            size="lg"
            className="w-full min-h-[52px]"
            onClick={onGetQuote}
          >
            <primaryCTA.icon className="w-5 h-5 mr-2" />
            {primaryCTA.label}
          </Button>
        </StaggerItem>

        {/* Secondary actions */}
        <StaggerItem>
          <div className="flex gap-2">
            {selectedConcept && (
              <DownloadButton
                imageUrl={selectedConcept.imageUrl}
                roomType={visualization.roomType}
                style={visualization.style}
                conceptIndex={selectedConceptIndex}
                visualizationId={visualization.id}
                showLabel={false}
                onBeforeDownload={handleBeforeDownload}
                className="min-h-[52px]"
              />
            )}

            <Button
              variant="outline"
              size="lg"
              className="min-h-[52px]"
              onClick={() => setShareModalOpen(true)}
            >
              <Share2 className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Email capture + Try another style / Start over */}
      <FadeInUp className="flex flex-col items-center gap-3 pt-4 border-t border-border">
        {!hasProvidedEmail && (
          <Button
            variant="outline"
            onClick={() => setEmailCaptureOpen(true)}
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            Email Me These Designs
          </Button>
        )}
        {onTryAnotherStyle && (
          <Button variant="outline" onClick={onTryAnotherStyle}>
            <Palette className="w-4 h-4 mr-2" />
            Try Another Style
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onStartOver} className="text-muted-foreground">
          <RefreshCw className="w-4 h-4 mr-2" />
          Start Over with a Different Photo
        </Button>
      </FadeInUp>

      {/* Attribution */}
      <p className="text-xs text-center text-muted-foreground">
        AI-generated visualization for concept purposes only. Actual renovations
        may vary based on site conditions and material availability.
      </p>

      {/* Share modal */}
      <SaveVisualizationModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        visualizationId={visualization.id}
      />

      {/* Email capture modal for download */}
      <EmailCaptureModal
        open={emailCaptureOpen}
        onOpenChange={setEmailCaptureOpen}
        visualizationId={visualization.id}
        onEmailSubmitted={handleEmailSubmitted}
      />

      {/* Sticky "Get a Quote" CTA bar */}
      <AnimatePresence>
        {showStickyCTA && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none"
          >
            <div className="max-w-[600px] mx-auto pointer-events-auto">
              <Button
                size="lg"
                className="w-full min-h-[56px] text-base font-semibold backdrop-blur-md shadow-xl shadow-primary/20 rounded-xl"
                onClick={onGetQuote}
              >
                <primaryCTA.icon className="w-5 h-5 mr-2" />
                {primaryCTA.label}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
