'use client';

/**
 * Visualizer Form
 * Streamlined single-page form for AI design visualization
 * Flow: Upload Photo → Emma Welcome → Room Type → Style (or Chat) → Preferences → Generate → Results
 *
 * Two paths to generation:
 * 1. Style picker: select up to 2 styles → 4 concepts (2 per style, or 4 of one)
 * 2. Conversational: "Don't Have a Style?" → Emma chat → AI picks styles from conversation
 */

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { panelSpring } from '@/lib/animations';
import { PhotoUpload } from './photo-upload';
import { RoomTypeSelector, type RoomTypeSelection } from './room-type-selector';
import { StyleSelector, type DesignStyleSelection } from './style-selector';
import { PreferencesSection } from './preferences-section';
import { FloatingGenerateButton } from './floating-generate-button';
import { PhotoSummaryBar } from './photo-summary-bar';
import { ResultDisplay } from './result-display';
import { GenerationLoading } from './generation-loading';
import { EmmaWelcomeCard } from './emma-welcome-card';
import { useVisualizationStream } from '@/hooks/use-visualization-stream';
import { mergeDesignIntent, type DesignPreferences } from '@/lib/schemas/design-preferences';
import type {
  VisualizationResponse,
  VisualizationError,
} from '@/lib/schemas/visualization';
import type { RoomAnalysis } from '@/lib/ai/photo-analyzer';
import { useTier } from '@/components/tier-provider';
import { useBranding } from '@/components/branding-provider';
import { NoPhotoChatPanel } from './no-photo-chat-panel';
import { useCopyContext } from '@/lib/copy/use-site-copy';
import { getSkipPhotoText } from '@/lib/copy/site-copy';
import {
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

type Step = 'photo' | 'form' | 'transitioning' | 'generating' | 'result' | 'error' | 'no_photo_chat';

interface FormData {
  photo: string | null;
  photoFile: File | null;
  roomType: RoomTypeSelection | null;
  customRoomType: string;
  /** Multi-style selection: 0 to 2 styles */
  styles: DesignStyleSelection[];
  customStyle: string;
  textPreferences: string;
  photoAnalysis?: RoomAnalysis;
  /** Pre-generation conversation messages (from "Don't Have a Style" path) */
  preGenMessages: { role: 'user' | 'assistant'; content: string }[];
  /** Whether the user opted for conversational style discovery */
  showPreGenChat: boolean;
}

/** Build a concise summary from photo analysis for the summary bar */
function buildAnalysisSummary(analysis: RoomAnalysis): string {
  const parts: string[] = [];
  if (analysis.estimatedDimensions) parts.push(analysis.estimatedDimensions);
  if (analysis.estimatedCeilingHeight) parts.push(`${analysis.estimatedCeilingHeight} ceilings`);
  if (analysis.currentCondition) parts.push(analysis.currentCondition);
  return parts.join(', ') || '';
}

/** Format style label for display */
function formatStyleLabel(style: DesignStyleSelection, customStyle?: string): string {
  if (style === 'other') return customStyle || 'Custom';
  return style.replace(/_/g, ' ');
}

const TRANSITION_MESSAGES = [
  'Analysing your space...',
  'Finding the perfect design...',
  'Bringing your vision to life...',
];

function TransitionScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => Math.min(prev + 1, TRANSITION_MESSAGES.length - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm w-full"
      >
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-base font-medium text-foreground"
            >
              {TRANSITION_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:200ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:400ms]" />
        </div>
      </motion.div>
    </div>
  );
}

function VisualizerFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccess } = useTier();
  const copyCtx = useCopyContext();
  const branding = useBranding();

  // Auto-skip to chat if ?mode=chat is present (from homepage CTA)
  const initialStep: Step = searchParams.get('mode') === 'chat' ? 'no_photo_chat' : 'photo';
  const [currentStep, setCurrentStep] = useState<Step>(initialStep);
  const [formData, setFormData] = useState<FormData>({
    photo: null,
    photoFile: null,
    roomType: null,
    customRoomType: '',
    styles: [],
    customStyle: '',
    textPreferences: '',
    preGenMessages: [],
    showPreGenChat: false,
  });
  const [visualization, setVisualization] = useState<VisualizationResponse | null>(null);
  const [error, setError] = useState<VisualizationError | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [favouritedIndices, setFavouritedIndices] = useState<Set<number>>(new Set());

  // SSE streaming hook for real-time generation progress
  const stream = useVisualizationStream();

  // Refs for auto-scroll behavior
  const styleSectionRef = useRef<HTMLDivElement>(null);
  const preferencesSectionRef = useRef<HTMLDivElement>(null);
  const preGenChatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll with offset
  const scrollToWithOffset = useCallback((el: HTMLElement | null, offset?: number) => {
    if (!el) return;
    const effectiveOffset = offset ?? (window.innerWidth < 768 ? 80 : 120);
    const top = el.getBoundingClientRect().top + window.scrollY - effectiveOffset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  // Select a concept as the active one (single selection)
  const toggleFavourite = useCallback((index: number) => {
    setFavouritedIndices(new Set([index]));
  }, []);

  // Auto-scroll: room → style
  const handleRoomTypeChange = useCallback((value: RoomTypeSelection) => {
    setFormData(prev => ({ ...prev, roomType: value }));
    setTimeout(() => scrollToWithOffset(styleSectionRef.current), 150);
  }, [scrollToWithOffset]);

  // Multi-style change handler
  const handleStylesChange = useCallback((styles: DesignStyleSelection[]) => {
    setFormData(prev => ({ ...prev, styles }));
  }, []);

  // "Don't Have a Style in Mind?" handler
  const handleSkipStyle = useCallback(() => {
    setFormData(prev => ({ ...prev, showPreGenChat: true, styles: [] }));
    setTimeout(() => scrollToWithOffset(preGenChatRef.current), 150);
  }, [scrollToWithOffset]);

  // Back to style picker from chat
  const handleBackToStyles = useCallback(() => {
    setFormData(prev => ({ ...prev, showPreGenChat: false }));
    setTimeout(() => scrollToWithOffset(styleSectionRef.current), 150);
  }, [scrollToWithOffset]);

  // Run photo analysis async after upload
  const runPhotoAnalysis = useCallback(async (imageBase64: string) => {
    setIsAnalyzingPhoto(true);
    try {
      const res = await fetch('/api/ai/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setFormData(prev => ({
            ...prev,
            photoAnalysis: data.analysis,
            ...(prev.roomType === null && data.analysis.roomType
              ? { roomType: data.analysis.roomType }
              : {}),
          }));
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }, []);

  const handlePhotoUpload = useCallback((photo: string | null, file: File | null) => {
    setFormData(prev => ({ ...prev, photo, photoFile: file }));
    if (photo) {
      if (typeof window !== 'undefined') {
        try { sessionStorage.removeItem('demo_handoff_context'); } catch { /* noop */ }
      }
      setCurrentStep('form');
      runPhotoAnalysis(photo);
    }
  }, [runPhotoAnalysis]);

  const handleChangePhoto = useCallback(() => {
    setFormData(prev => {
      const { photoAnalysis: _pa, ...rest } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
      return { ...rest, photo: null, photoFile: null };
    });
    setCurrentStep('photo');
  }, []);

  // Start SSE generation
  const startStreamGeneration = useCallback(() => {
    if (!formData.photo || !formData.roomType) return;

    // Need either styles selected or pre-gen conversation
    const hasStyles = formData.styles.length > 0;
    const hasConversation = formData.preGenMessages.length >= 2;
    if (!hasStyles && !hasConversation) return;

    const primaryStyle = formData.styles[0] || 'modern';

    const prefs: DesignPreferences = {
      roomType: formData.roomType,
      customRoomType: formData.roomType === 'other' ? formData.customRoomType : undefined,
      style: primaryStyle,
      customStyle: primaryStyle === 'other' ? formData.customStyle : undefined,
      textPreferences: formData.textPreferences,
      photoAnalysis: formData.photoAnalysis as Record<string, unknown> | undefined,
    };

    const designIntent = mergeDesignIntent(prefs);

    stream.startGeneration({
      image: formData.photo,
      roomType: formData.roomType,
      style: primaryStyle,
      styles: formData.styles.length > 0 ? formData.styles : undefined,
      customRoomType: formData.customRoomType || undefined,
      customStyle: formData.customStyle || undefined,
      constraints: formData.textPreferences || undefined,
      count: 4,
      mode: 'streamlined',
      designIntent,
      photoAnalysis: formData.photoAnalysis as Record<string, unknown> | undefined,
      // Pass pre-gen conversation for conversational style discovery
      conversationContext: formData.preGenMessages.length > 0
        ? { preGenerationMessages: formData.preGenMessages }
        : undefined,
    });
  }, [formData, stream]);

  // Show transition before generating
  const handleGenerate = useCallback(async () => {
    if (!formData.photo || !formData.roomType) return;
    const hasStyles = formData.styles.length > 0;
    const hasConversation = formData.preGenMessages.length >= 2;
    if (!hasStyles && !hasConversation) return;

    setError(null);
    setCurrentStep('transitioning');
  }, [formData]);

  // Scroll to top when entering transition/generation
  useEffect(() => {
    if (currentStep === 'transitioning' || currentStep === 'generating') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Auto-advance from transition to generating after 3.5s
  useEffect(() => {
    if (currentStep !== 'transitioning') return;
    const timer = setTimeout(() => {
      setCurrentStep('generating');
      startStreamGeneration();
    }, 3500);
    return () => clearTimeout(timer);
  }, [currentStep, startStreamGeneration]);

  // Watch stream status
  useEffect(() => {
    if (stream.status === 'complete' && stream.visualization) {
      setVisualization(stream.visualization);
      setTimeout(() => setCurrentStep('result'), 500);
    } else if (stream.status === 'error') {
      setError({
        error: stream.error || 'Generation failed',
        code: 'UNKNOWN',
        details: stream.error || 'An unexpected error occurred.',
      });
      setCurrentStep('error');
    }
  }, [stream.status, stream.visualization, stream.error]);

  const handleStartOver = useCallback(() => {
    setFormData({
      photo: null,
      photoFile: null,
      roomType: null,
      customRoomType: '',
      styles: [],
      customStyle: '',
      textPreferences: '',
      preGenMessages: [],
      showPreGenChat: false,
    });
    setVisualization(null);
    setError(null);
    setFavouritedIndices(new Set());
    setCurrentStep('photo');
  }, []);

  const handleTryAnotherStyle = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      styles: [],
      customStyle: '',
      textPreferences: '',
      preGenMessages: [],
      showPreGenChat: false,
    }));
    setVisualization(null);
    setFavouritedIndices(new Set());
    setCurrentStep('form');
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGetQuote = useCallback(() => {
    if (!canAccess('ai_quote_engine')) {
      const params = new URLSearchParams();
      params.set('from', 'visualizer');
      if (visualization?.id) params.set('visualization', visualization.id);
      router.push(`/contact?${params.toString()}`);
      return;
    }

    const roomLabel = formData.roomType === 'other'
      ? formData.customRoomType
      : formData.roomType?.replace(/_/g, ' ') || '';
    const styleLabels = formData.styles.map(s => formatStyleLabel(s, formData.customStyle));
    const styleLabel = styleLabels.join(', ') || 'AI-selected';

    // Get starred concept image URL
    const starredIndex = favouritedIndices.size > 0 ? Array.from(favouritedIndices)[0]! : 0;
    const starredConceptImageUrl = visualization?.concepts[starredIndex]?.imageUrl;

    if (typeof window !== 'undefined') {
      try {
        const photoAnalysisHandoff = formData.photoAnalysis ? {
          roomType: formData.photoAnalysis.roomType,
          layoutType: formData.photoAnalysis.layoutType,
          currentCondition: formData.photoAnalysis.currentCondition,
          structuralElements: formData.photoAnalysis.structuralElements,
          identifiedFixtures: formData.photoAnalysis.identifiedFixtures,
          estimatedDimensions: formData.photoAnalysis.estimatedDimensions,
          estimatedCeilingHeight: formData.photoAnalysis.estimatedCeilingHeight,
          wallCount: formData.photoAnalysis.wallCount,
          wallDimensions: formData.photoAnalysis.wallDimensions,
          spatialZones: formData.photoAnalysis.spatialZones,
        } : undefined;

        const handoffData = {
          fromPersona: 'design-consultant' as const,
          toPersona: 'quote-specialist' as const,
          summary: `User designed a ${roomLabel} renovation in ${styleLabel} style.`,
          recentMessages: [] as { role: 'user' | 'assistant'; content: string }[],
          designPreferences: {
            roomType: formData.roomType || '',
            customRoomType: formData.customRoomType,
            style: formData.styles[0] || '',
            styles: formData.styles,
            customStyle: formData.customStyle,
            textPreferences: formData.textPreferences,
          },
          visualizationData: visualization ? {
            id: visualization.id,
            concepts: visualization.concepts,
            originalImageUrl: visualization.originalImageUrl,
            roomType: visualization.roomType,
            style: visualization.style,
            styles: visualization.styles,
          } : undefined,
          clientFavouritedConcepts: favouritedIndices.size > 0
            ? Array.from(favouritedIndices)
            : undefined,
          starredConceptImageUrl,
          photoAnalysis: photoAnalysisHandoff,
          // Pre-generation conversation (for conversational path)
          preGenerationConversation: formData.preGenMessages.length > 0
            ? formData.preGenMessages.slice(-10)
            : undefined,
          timestamp: Date.now(),
        };
        sessionStorage.setItem('demo_handoff_context', JSON.stringify(handoffData));
      } catch {
        // sessionStorage might be unavailable
      }
    }

    const params = new URLSearchParams();
    if (visualization?.id) params.set('visualization', visualization.id);
    router.push(`/estimate?${params.toString()}`);
  }, [formData, visualization, router, canAccess, favouritedIndices]);

  const handleRetry = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Can generate: need room type + (styles OR conversation)
  const canGenerate = !!formData.roomType && (
    formData.styles.length > 0 ||
    formData.preGenMessages.length >= 2
  );

  // Effective labels for display
  const effectiveRoomType = formData.roomType === 'other'
    ? formData.customRoomType || 'Custom'
    : formData.roomType?.replace(/_/g, ' ');
  const effectiveStyleLabels = formData.styles.map(s => formatStyleLabel(s, formData.customStyle));
  const effectiveStyleDisplay = effectiveStyleLabels.length > 0
    ? effectiveStyleLabels.join(', ')
    : formData.preGenMessages.length >= 2 ? 'Emma\'s picks' : '';

  // Transitioning state
  if (currentStep === 'transitioning') {
    return <TransitionScreen />;
  }

  // Error state
  if (currentStep === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-center">Generation Failed</h2>
        <p className="text-muted-foreground mt-2 text-center">
          {error?.error || 'Something went wrong while generating your visualization.'}
        </p>
        {error?.details && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {error.details}
          </p>
        )}
        <div className="flex gap-4 mt-8">
          <Button variant="outline" onClick={() => setCurrentStep('form')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button onClick={handleRetry}>
            <Sparkles className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Generating state
  if (currentStep === 'generating') {
    return (
      <div data-testid="generation-loading">
        <GenerationLoading
          style={effectiveStyleDisplay || 'modern'}
          roomType={effectiveRoomType || 'kitchen'}
          progress={stream.progress}
          stage={stream.stage}
          concepts={stream.concepts}
          originalImage={formData.photo || undefined}
          onCancel={() => { stream.cancel(); handleStartOver(); }}
        />
      </div>
    );
  }

  // Result state
  if (currentStep === 'result' && visualization && formData.photo) {
    return (
      <ResultDisplay
        visualization={visualization}
        originalImage={formData.photo}
        onStartOver={handleStartOver}
        onTryAnotherStyle={handleTryAnotherStyle}
        favouritedIndices={favouritedIndices}
        onToggleFavourite={toggleFavourite}
        photoAnalysis={formData.photoAnalysis}
      />
    );
  }

  // No-photo chat path
  if (currentStep === 'no_photo_chat') {
    return (
      <div className="max-w-2xl mx-auto">
        <NoPhotoChatPanel onBackToPhoto={() => setCurrentStep('photo')} />
      </div>
    );
  }

  // Photo upload state
  if (currentStep === 'photo') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 text-center">
          <button
            type="button"
            onClick={() => setCurrentStep('no_photo_chat')}
            className="inline-flex items-center rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {getSkipPhotoText(copyCtx)}
          </button>
        </div>
        <PhotoUpload
          value={formData.photo}
          onChange={handlePhotoUpload}
        />
      </div>
    );
  }

  // Main form state — single scrollable page with all sections
  return (
    <div className="max-w-2xl mx-auto relative">
      {/* Sticky photo header */}
      <PhotoSummaryBar
        photoSrc={formData.photo!}
        detectedRoomType={formData.photoAnalysis?.roomType}
        analysisText={formData.photoAnalysis ? buildAnalysisSummary(formData.photoAnalysis) : undefined}
        isAnalyzing={isAnalyzingPhoto}
        onChangePhoto={handleChangePhoto}
      />

      {/* Emma Welcome Card — appears after photo analysis completes */}
      <AnimatePresence>
        {formData.photoAnalysis && (
          <section className="py-4">
            <EmmaWelcomeCard
              companyName={branding.name}
              photoAnalysis={formData.photoAnalysis}
            />
          </section>
        )}
      </AnimatePresence>

      {/* Room Type Section */}
      <section className="py-6">
        <RoomTypeSelector
          value={formData.roomType}
          onChange={handleRoomTypeChange}
          allowCustom
          customValue={formData.customRoomType}
          onCustomChange={(v) => setFormData(prev => ({ ...prev, customRoomType: v }))}
        />
      </section>

      {/* Style Section — hidden when pre-gen chat is active */}
      {!formData.showPreGenChat && (
        <section ref={styleSectionRef} className="py-6 border-t border-border">
          <StyleSelector
            selectedStyles={formData.styles}
            onChange={handleStylesChange}
            allowCustom
            customValue={formData.customStyle}
            onCustomChange={(v) => setFormData(prev => ({ ...prev, customStyle: v }))}
            onSkipStyle={handleSkipStyle}
          />
        </section>
      )}

      {/* Pre-generation chat — shown when user clicks "Don't Have a Style in Mind?" */}
      {formData.showPreGenChat && (
        <section ref={preGenChatRef} className="py-6 border-t border-border">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Tell Emma What You Want</h3>
                <p className="text-sm text-muted-foreground">
                  Describe your vision and Emma will pick the perfect styles
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackToStyles}
                className="shrink-0 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Pick styles instead
              </button>
            </div>

            {/* Simple inline text input for preferences (pre-gen chat MVP) */}
            <PreferencesSection
              textValue={formData.textPreferences}
              onTextChange={(v) => setFormData(prev => ({ ...prev, textPreferences: v }))}
            />

            {/* Generate button for chat path */}
            {formData.textPreferences.length >= 10 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-2"
              >
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    // Convert text preferences into conversation messages for the pipeline
                    setFormData(prev => ({
                      ...prev,
                      preGenMessages: [
                        { role: 'user' as const, content: prev.textPreferences },
                        { role: 'assistant' as const, content: 'I understand your vision. Let me create some concepts that match.' },
                      ],
                    }));
                    handleGenerate();
                  }}
                  disabled={!formData.roomType}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Let Emma Surprise You
                </Button>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* Preferences Section — animates in after style selection (style picker path only) */}
      <AnimatePresence>
        {!formData.showPreGenChat && formData.styles.length > 0 && (
          <motion.section
            ref={preferencesSectionRef}
            className="py-6 border-t border-border"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={panelSpring as any}
          >
            <PreferencesSection
              textValue={formData.textPreferences}
              onTextChange={(v) => setFormData(prev => ({ ...prev, textPreferences: v }))}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Selection Summary */}
      {canGenerate && !formData.showPreGenChat && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border mb-24">
          <h4 className="font-medium text-sm mb-2">Your Selection</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Room:</span>{' '}
              <span className="font-medium capitalize">{effectiveRoomType}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Style:</span>{' '}
              <span className="font-medium capitalize">{effectiveStyleDisplay}</span>
            </div>
          </div>
          {formData.textPreferences && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              &ldquo;{formData.textPreferences}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Floating Generate Button (style picker path) */}
      {!formData.showPreGenChat && (
        <FloatingGenerateButton
          visible={canGenerate}
          onClick={handleGenerate}
          disabled={!canGenerate}
        />
      )}
    </div>
  );
}

/**
 * VisualizerForm — wraps inner component with Suspense for searchParams
 */
export function VisualizerForm() {
  return (
    <Suspense fallback={null}>
      <VisualizerFormInner />
    </Suspense>
  );
}
