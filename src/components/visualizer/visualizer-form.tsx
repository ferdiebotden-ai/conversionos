'use client';

/**
 * Visualizer Form
 * Streamlined single-page form for AI design visualization
 * Flow: Upload Photo → Room Type → Style → Preferences (text + voice) → Generate → Results
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
import { VoiceProvider, useVoice } from '@/components/voice/voice-provider';
import { useVisualizationStream } from '@/hooks/use-visualization-stream';
import { mergeDesignIntent, type DesignPreferences, type VoiceExtractedPreferences } from '@/lib/schemas/design-preferences';
import type {
  VisualizationResponse,
  VisualizationError,
} from '@/lib/schemas/visualization';
import type { RoomAnalysis } from '@/lib/ai/photo-analyzer';
import type { VoiceTranscriptEntry } from '@/lib/voice/config';
import { useTier } from '@/components/tier-provider';
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
  style: DesignStyleSelection | null;
  customStyle: string;
  textPreferences: string;
  voiceTranscript: VoiceTranscriptEntry[];
  voicePreferencesSummary?: string;
  voiceExtractedPreferences?: VoiceExtractedPreferences;
  photoAnalysis?: RoomAnalysis;
}

/** Build a concise summary from photo analysis for the summary bar */
function buildAnalysisSummary(analysis: RoomAnalysis): string {
  const parts: string[] = [];
  if (analysis.estimatedDimensions) parts.push(analysis.estimatedDimensions);
  if (analysis.estimatedCeilingHeight) parts.push(`${analysis.estimatedCeilingHeight} ceilings`);
  if (analysis.currentCondition) parts.push(analysis.currentCondition);
  return parts.join(', ') || '';
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

  // Auto-skip to chat if ?mode=chat is present (from homepage CTA)
  const initialStep: Step = searchParams.get('mode') === 'chat' ? 'no_photo_chat' : 'photo';
  const [currentStep, setCurrentStep] = useState<Step>(initialStep);
  const [formData, setFormData] = useState<FormData>({
    photo: null,
    photoFile: null,
    roomType: null,
    customRoomType: '',
    style: null,
    customStyle: '',
    textPreferences: '',
    voiceTranscript: [],
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

  // Sync voice transcript from VoiceProvider
  const { transcript: voiceTranscript, endVoice, status: voiceStatus } = useVoice();
  useEffect(() => {
    if (voiceTranscript.length > 0) {
      setFormData(prev => ({ ...prev, voiceTranscript }));
    }
  }, [voiceTranscript]);

  // Auto-scroll with offset — keeps the selected item visible above the fold
  // Smaller offset on mobile where header is shorter
  const scrollToWithOffset = useCallback((el: HTMLElement | null, offset?: number) => {
    if (!el) return;
    const effectiveOffset = offset ?? (window.innerWidth < 768 ? 80 : 120);
    const top = el.getBoundingClientRect().top + window.scrollY - effectiveOffset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  // Select a concept as the active one (single selection — replaces toggle)
  const toggleFavourite = useCallback((index: number) => {
    setFavouritedIndices(new Set([index]));
  }, []);

  // Auto-scroll: room → style, style → preferences
  const handleRoomTypeChange = useCallback((value: RoomTypeSelection) => {
    setFormData(prev => ({ ...prev, roomType: value }));
    setTimeout(() => scrollToWithOffset(styleSectionRef.current), 150);
  }, [scrollToWithOffset]);

  const handleStyleChange = useCallback((value: DesignStyleSelection) => {
    setFormData(prev => ({ ...prev, style: value }));
    setTimeout(() => scrollToWithOffset(preferencesSectionRef.current), 150);
  }, [scrollToWithOffset]);

  // Run photo analysis async after upload — pre-detects room type
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
            // Pre-fill room type if user hasn't selected one yet
            ...(prev.roomType === null && data.analysis.roomType
              ? { roomType: data.analysis.roomType }
              : {}),
          }));
        }
      }
    } catch {
      // Non-fatal — analysis will run again server-side during generation
    } finally {
      setIsAnalyzingPhoto(false);
    }
  }, []);

  const handlePhotoUpload = useCallback((photo: string | null, file: File | null) => {
    setFormData(prev => ({ ...prev, photo, photoFile: file }));
    if (photo) {
      // Clear stale handoff context from previous sessions
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

  // Voice summary callback
  const handleVoiceSummaryReady = useCallback((summary: string, extracted: VoiceExtractedPreferences) => {
    setFormData(prev => ({
      ...prev,
      voicePreferencesSummary: summary,
      voiceExtractedPreferences: extracted,
    }));
  }, []);

  // Start SSE generation (called after transition delay)
  const startStreamGeneration = useCallback(() => {
    if (!formData.photo || !formData.roomType || !formData.style) return;

    const prefs: DesignPreferences = {
      roomType: formData.roomType,
      customRoomType: formData.roomType === 'other' ? formData.customRoomType : undefined,
      style: formData.style,
      customStyle: formData.style === 'other' ? formData.customStyle : undefined,
      textPreferences: formData.textPreferences,
      voiceTranscript: formData.voiceTranscript.map(t => ({
        role: t.role,
        content: t.content,
        timestamp: t.timestamp,
      })),
      voicePreferencesSummary: formData.voicePreferencesSummary,
      voiceExtractedPreferences: formData.voiceExtractedPreferences,
      photoAnalysis: formData.photoAnalysis as Record<string, unknown> | undefined,
    };

    const designIntent = mergeDesignIntent(prefs);

    stream.startGeneration({
      image: formData.photo,
      roomType: formData.roomType,
      style: formData.style,
      customRoomType: formData.customRoomType || undefined,
      customStyle: formData.customStyle || undefined,
      constraints: formData.textPreferences || undefined,
      count: 4,
      mode: 'streamlined',
      designIntent,
      voicePreferencesSummary: formData.voicePreferencesSummary,
      voiceTranscript: formData.voiceTranscript.length > 0
        ? formData.voiceTranscript.map(t => ({
            role: t.role,
            content: t.content,
            timestamp: t.timestamp,
          }))
        : undefined,
      photoAnalysis: formData.photoAnalysis as Record<string, unknown> | undefined,
    });
  }, [formData, stream]);

  // Build design preferences and show transition before generating
  const handleGenerate = useCallback(async () => {
    if (!formData.photo || !formData.roomType || !formData.style) return;

    if (voiceStatus === 'connected' || voiceStatus === 'connecting') {
      await endVoice();
    }

    setError(null);
    setCurrentStep('transitioning');
  }, [formData, endVoice, voiceStatus]);

  // Scroll to top when entering transition/generation — prevents viewport showing footer
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

  // Watch stream status and transition steps accordingly
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
      style: null,
      customStyle: '',
      textPreferences: '',
      voiceTranscript: [],
    });
    setVisualization(null);
    setError(null);
    setFavouritedIndices(new Set());
    setCurrentStep('photo');
  }, []);

  // Try another style — keeps photo + room type, resets style and preferences
  const handleTryAnotherStyle = useCallback(() => {
    setFormData(prev => {
      const {
        voicePreferencesSummary: _vs, // eslint-disable-line @typescript-eslint/no-unused-vars
        voiceExtractedPreferences: _ve, // eslint-disable-line @typescript-eslint/no-unused-vars
        ...rest
      } = prev;
      return {
        ...rest,
        style: null,
        customStyle: '',
        textPreferences: '',
        voiceTranscript: [],
      };
    });
    setVisualization(null);
    setFavouritedIndices(new Set());
    setCurrentStep('form');
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGetQuote = useCallback(() => {
    // Elevate tier: redirect to contact page (no estimate handoff)
    if (!canAccess('ai_quote_engine')) {
      const params = new URLSearchParams();
      params.set('from', 'visualizer');
      if (visualization?.id) {
        params.set('visualization', visualization.id);
      }
      router.push(`/contact?${params.toString()}`);
      return;
    }

    // Accelerate+: Serialize full context for estimate handoff — include ALL captured data
    const messages = formData.voiceTranscript.map(t => ({
      role: t.role as 'user' | 'assistant',
      content: t.content,
    }));

    const roomLabel = formData.roomType === 'other'
      ? formData.customRoomType
      : formData.roomType?.replace(/_/g, ' ') || '';
    const styleLabel = formData.style === 'other'
      ? formData.customStyle
      : formData.style || '';

    // Store rich handoff context in sessionStorage
    if (typeof window !== 'undefined') {
      try {
        // Build photo analysis subset for handoff (avoid serializing full blob)
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

        // Build voice-extracted structured preferences
        const voiceExtracted = formData.voiceExtractedPreferences ? {
          desiredChanges: formData.voiceExtractedPreferences.desiredChanges,
          materialPreferences: formData.voiceExtractedPreferences.materialPreferences,
          preservationNotes: formData.voiceExtractedPreferences.preservationNotes,
        } : undefined;

        const handoffData = {
          fromPersona: 'design-consultant' as const,
          toPersona: 'quote-specialist' as const,
          summary: `User designed a ${roomLabel} renovation in ${styleLabel} style.`,
          recentMessages: messages.slice(-6),
          designPreferences: {
            roomType: formData.roomType || '',
            customRoomType: formData.customRoomType,
            style: formData.style || '',
            customStyle: formData.customStyle,
            textPreferences: formData.textPreferences,
            voicePreferencesSummary: formData.voicePreferencesSummary,
          },
          visualizationData: visualization ? {
            id: visualization.id,
            concepts: visualization.concepts,
            originalImageUrl: visualization.originalImageUrl,
            roomType: visualization.roomType,
            style: visualization.style,
          } : undefined,
          clientFavouritedConcepts: favouritedIndices.size > 0
            ? Array.from(favouritedIndices)
            : undefined,
          photoAnalysis: photoAnalysisHandoff,
          voiceExtractedPreferences: voiceExtracted,
          // quoteAssistanceMode and costSignals will be injected server-side
          // by the estimate page API based on tenant config
          timestamp: Date.now(),
        };
        sessionStorage.setItem('demo_handoff_context', JSON.stringify(handoffData));
      } catch {
        // sessionStorage might be unavailable
      }
    }

    const params = new URLSearchParams();
    if (visualization?.id) {
      params.set('visualization', visualization.id);
    }
    router.push(`/estimate?${params.toString()}`);
  }, [formData, visualization, router, canAccess, favouritedIndices]);

  const handleRetry = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Determine if generate button should be visible
  const canGenerate = !!formData.roomType && !!formData.style;

  // Get effective room/style for display
  const effectiveRoomType = formData.roomType === 'other'
    ? formData.customRoomType || 'Custom'
    : formData.roomType?.replace(/_/g, ' ');
  const effectiveStyle = formData.style === 'other'
    ? formData.customStyle || 'Custom'
    : formData.style;

  // Transitioning state — fun rotating messages before generation
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
          style={effectiveStyle || 'modern'}
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

  // No-photo chat path — skip visualizer, go straight to Emma chat + lead form
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
            className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
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

      {/* Style Section */}
      <section ref={styleSectionRef} className="py-6 border-t border-border">
        <StyleSelector
          value={formData.style}
          onChange={handleStyleChange}
          allowCustom
          customValue={formData.customStyle}
          onCustomChange={(v) => setFormData(prev => ({ ...prev, customStyle: v }))}
        />
      </section>

      {/* Preferences Section (text + voice) — animates in after style selection */}
      <AnimatePresence>
        {formData.style && (
          <motion.section
            ref={preferencesSectionRef}
            className="py-6 border-t border-border"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={panelSpring}
          >
            <PreferencesSection
              textValue={formData.textPreferences}
              onTextChange={(v) => setFormData(prev => ({ ...prev, textPreferences: v }))}
              voiceTranscript={formData.voiceTranscript}
              voiceSummary={formData.voicePreferencesSummary}
              onVoiceSummaryReady={handleVoiceSummaryReady}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Selection Summary */}
      {canGenerate && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border mb-24">
          <h4 className="font-medium text-sm mb-2">Your Selection</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Room:</span>{' '}
              <span className="font-medium capitalize">{effectiveRoomType}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Style:</span>{' '}
              <span className="font-medium capitalize">{effectiveStyle}</span>
            </div>
          </div>
          {formData.textPreferences && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              &ldquo;{formData.textPreferences}&rdquo;
            </p>
          )}
          {formData.voicePreferencesSummary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              Voice: &ldquo;{formData.voicePreferencesSummary}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Floating Generate Button */}
      <FloatingGenerateButton
        visible={canGenerate}
        onClick={handleGenerate}
        disabled={!canGenerate}
      />
    </div>
  );
}

/**
 * VisualizerForm — wraps inner component with VoiceProvider
 */
export function VisualizerForm() {
  return (
    <Suspense fallback={null}>
      <VoiceProvider>
        <VisualizerFormInner />
      </VoiceProvider>
    </Suspense>
  );
}
