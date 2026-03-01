'use client';

/**
 * Result Display
 * Side-by-side slider + thumbnails layout with streamlined flow
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BeforeAfterSlider } from './before-after-slider';
import { ConceptThumbnails } from './concept-thumbnails';
import { SaveVisualizationModal } from './save-visualization-modal';
import { EmailCaptureModal } from './email-capture-modal';
import { FadeInUp, ScaleIn } from '@/components/motion';
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
  MessageSquare,
  RefreshCw,
  Clock,
  Sparkles,
  Phone,
  Palette,
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
  const selectedImageUrl = refinedImages.get(selectedConceptIndex) || selectedConcept?.imageUrl || '';

  const handleConceptRefined = (index: number, newImageUrl: string) => {
    setRefinedImages(prev => new Map(prev).set(index, newImageUrl));
  };

  const formatTime = (ms: number): string => `${Math.round(ms / 1000)}s`;
  const formatStyle = (style: string): string => style.charAt(0).toUpperCase() + style.slice(1);
  const formatRoomType = (roomType: string): string => roomType.replace(/_/g, ' ');

  const hasMultipleConcepts = visualization.concepts.length > 1;

  return (
    <div className={cn('max-w-4xl mx-auto space-y-6', showStickyCTA && !leadSubmitted && 'pb-24', className)} data-testid="visualization-result">
      {/* Compact success header */}
      <ScaleIn className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
          <Sparkles className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-xl font-bold">Your Vision is Ready!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {visualization.concepts.length} {formatStyle(visualization.style)}{' '}
          {formatRoomType(visualization.roomType)} concepts
          <span className="inline-flex items-center gap-1 ml-2">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(visualization.generationTimeMs)}
          </span>
        </p>
      </ScaleIn>

      {/* Slider + thumbnails — side-by-side on desktop, stacked on mobile */}
      <FadeInUp>
        <div className={cn(
          hasMultipleConcepts && 'lg:grid lg:grid-cols-[1fr_180px] lg:gap-4',
        )}>
          {/* Before/After slider */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Drag to compare</p>
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
          </div>

          {/* Concept thumbnails — sidebar on desktop, grid row on mobile */}
          {hasMultipleConcepts && (
            <div className="mt-4 lg:mt-0">
              {/* Mobile: horizontal grid */}
              <div className="lg:hidden">
                <ConceptThumbnails
                  concepts={visualization.concepts}
                  selectedIndex={selectedConceptIndex}
                  onSelect={setSelectedConceptIndex}
                  favouritedIndices={favouritedIndices}
                  onToggleFavourite={onToggleFavourite}
                />
              </div>
              {/* Desktop: vertical sidebar */}
              <div className="hidden lg:block">
                <ConceptThumbnails
                  concepts={visualization.concepts}
                  selectedIndex={selectedConceptIndex}
                  onSelect={setSelectedConceptIndex}
                  favouritedIndices={favouritedIndices}
                  onToggleFavourite={onToggleFavourite}
                  variant="sidebar"
                />
              </div>
            </div>
          )}
        </div>
      </FadeInUp>

      {/* Concept description */}
      {selectedConcept?.description && (
        <FadeInUp>
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <p className="text-sm text-muted-foreground">{selectedConcept.description}</p>
          </div>
        </FadeInUp>
      )}

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

      {/* Compact action row — try another style + start over */}
      <FadeInUp className="flex items-center justify-center gap-3 pt-2">
        {onTryAnotherStyle && (
          <Button variant="ghost" size="sm" onClick={onTryAnotherStyle} className="text-muted-foreground">
            <Palette className="w-4 h-4 mr-1.5" />
            Try Another Style
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onStartOver} className="text-muted-foreground">
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Start Over
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

      {/* Email capture modal */}
      <EmailCaptureModal
        open={emailCaptureOpen}
        onOpenChange={setEmailCaptureOpen}
        visualizationId={visualization.id}
        onEmailSubmitted={() => setEmailCaptureOpen(false)}
        favouritedIndices={favouritedIndices}
      />

      {/* Sticky CTA bar — hidden after lead submitted */}
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
