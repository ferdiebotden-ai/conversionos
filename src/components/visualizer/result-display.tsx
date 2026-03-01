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
import { useBranding } from '@/components/branding-provider';
import { useCopyContext } from '@/lib/copy/use-site-copy';
import { getVisualizerResultCTA } from '@/lib/copy/site-copy';
import type { VisualizationResponse } from '@/lib/schemas/visualization';
import type { RoomAnalysis } from '@/lib/ai/photo-analyzer';
import type { QuoteAssistanceMode } from '@/lib/quote-assistance';
import { DesignStudioChat } from './design-studio-chat';
import { LeadCaptureForm } from './lead-capture-form';
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
  Star,
} from 'lucide-react';

interface ResultDisplayProps {
  visualization: VisualizationResponse;
  originalImage: string;
  onStartOver: () => void;
  onTryAnotherStyle?: () => void;
  favouritedIndices: Set<number>;
  onToggleFavourite: (index: number) => void;
  photoAnalysis?: RoomAnalysis | null | undefined;
  quoteAssistanceMode?: QuoteAssistanceMode | undefined;
  className?: string;
}

export function ResultDisplay({
  visualization,
  originalImage,
  onStartOver,
  onTryAnotherStyle,
  favouritedIndices,
  onToggleFavourite,
  photoAnalysis,
  quoteAssistanceMode = 'range',
  className,
}: ResultDisplayProps) {
  const branding = useBranding();
  const copyCtx = useCopyContext();
  const [selectedConceptIndex, setSelectedConceptIndex] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [emailCaptureOpen, setEmailCaptureOpen] = useState(false);
  const [hasProvidedEmail, setHasProvidedEmail] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [refinedImages, setRefinedImages] = useState<Map<number, string>>(new Map());
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

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
  // Use refined image if available for the selected concept
  const selectedImageUrl = refinedImages.get(selectedConceptIndex) || selectedConcept?.imageUrl || '';

  // Handle concept refinement from Design Studio Chat
  const handleConceptRefined = (index: number, newImageUrl: string) => {
    setRefinedImages(prev => new Map(prev).set(index, newImageUrl));
  };

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

  // Handle email submission
  const handleEmailSubmitted = () => {
    setHasProvidedEmail(true);
    setEmailCaptureOpen(false);
  };

  return (
    <div className={cn('space-y-6', showStickyCTA && !leadSubmitted && 'pb-24', className)} data-testid="visualization-result">
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
          <div className="transition-opacity duration-500">
            <BeforeAfterSlider
              key={selectedImageUrl}
              beforeImage={originalImage}
              afterImage={selectedImageUrl}
              beforeLabel="Current"
              afterLabel={`Concept ${selectedConceptIndex + 1}`}
            />
          </div>
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
            favouritedIndices={favouritedIndices}
            onToggleFavourite={onToggleFavourite}
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

      {/* Action buttons — email + try another style side by side */}
      <StaggerContainer className="flex flex-col sm:flex-row gap-3">
        <StaggerItem className="flex-1">
          {!hasProvidedEmail ? (
            <Button
              variant="outline"
              size="lg"
              className="w-full min-h-[52px]"
              onClick={() => setEmailCaptureOpen(true)}
            >
              {favouritedIndices.size > 0 ? (
                <>
                  <Star className="w-4 h-4 mr-2 text-yellow-400 fill-yellow-400" />
                  Email My Favourites ({favouritedIndices.size})
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Email My Designs
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              {selectedConcept && (
                <DownloadButton
                  imageUrl={selectedConcept.imageUrl}
                  roomType={visualization.roomType}
                  style={visualization.style}
                  conceptIndex={selectedConceptIndex}
                  visualizationId={visualization.id}
                  showLabel
                  className="min-h-[52px] flex-1"
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
          )}
        </StaggerItem>

        {onTryAnotherStyle && (
          <StaggerItem>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-h-[52px]"
              onClick={onTryAnotherStyle}
            >
              <Palette className="w-4 h-4 mr-2" />
              Try Another Style
            </Button>
          </StaggerItem>
        )}
      </StaggerContainer>

      {/* Design Studio Chat — inline refinement + guidance */}
      <FadeInUp>
        <DesignStudioChat
          visualizationId={visualization.id}
          concepts={visualization.concepts}
          starredIndex={favouritedIndices.size > 0 ? Array.from(favouritedIndices)[0]! : selectedConceptIndex}
          photoAnalysis={photoAnalysis ?? null}
          roomType={visualization.roomType}
          style={visualization.style}
          companyName={branding.name}
          tier={copyCtx.tier}
          quoteAssistanceMode={quoteAssistanceMode}
          onConceptRefined={handleConceptRefined}
          onRequestEstimate={() => setShowLeadCapture(true)}
          onEmailDesigns={() => setEmailCaptureOpen(true)}
        />
      </FadeInUp>

      {/* Inline lead capture form */}
      <AnimatePresence>
        {showLeadCapture && (
          <FadeInUp>
            <LeadCaptureForm
              visualizationId={visualization.id}
              roomType={visualization.roomType}
              originalPhotoUrl={originalImage}
              onSubmitted={() => {
                setLeadSubmitted(true);
                setShowStickyCTA(false);
              }}
            />
          </FadeInUp>
        )}
      </AnimatePresence>

      {/* Start over link */}
      <FadeInUp className="flex justify-center pt-2">
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
        favouritedIndices={favouritedIndices}
      />

      {/* Sticky "Get a Quote" CTA bar — hidden after lead submitted */}
      <AnimatePresence>
        {showStickyCTA && !leadSubmitted && (
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
                onClick={() => setShowLeadCapture(true)}
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
