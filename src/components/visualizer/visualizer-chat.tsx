'use client';

/**
 * Visualizer Chat Component
 * Conversational design intent gathering for enhanced AI visualizations
 * Uses useChat hook (same pattern as receptionist-chat.tsx)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Send,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Lightbulb,
  ScanSearch,
  Blocks,
  Sun,
  Package,
  CircleCheck,
} from 'lucide-react';
import { VoiceProvider } from '@/components/voice/voice-provider';
import { TalkButton } from '@/components/voice/talk-button';
import { VoiceIndicator } from '@/components/voice/voice-indicator';
import { VoiceTranscriptMessage } from '@/components/voice/voice-transcript-message';
import { useVoice } from '@/components/voice/voice-provider';
import type { DesignStyle, RoomType } from '@/lib/schemas/visualization';
import type { RoomAnalysis } from '@/lib/ai/photo-analyzer';

function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

interface ExtractedData {
  desiredChanges: string[];
  constraintsToPreserve: string[];
  stylePreference?: DesignStyle;
  materialPreferences: string[];
  roomType?: RoomType;
  confidenceScore: number;
}

interface VisualizerChatProps {
  imageBase64: string;
  onGenerate: (config: {
    roomType: RoomType;
    style: DesignStyle;
    constraints?: string;
    photoAnalysis?: RoomAnalysis;
    designIntent?: {
      desiredChanges: string[];
      constraintsToPreserve: string[];
      materialPreferences?: string[];
    };
  }) => void | Promise<void>;
  onBack: () => void;
  className?: string;
}

export function VisualizerChat(props: VisualizerChatProps) {
  return (
    <VoiceProvider>
      <VisualizerChatInner {...props} />
    </VoiceProvider>
  );
}

function VisualizerChatInner({
  imageBase64,
  onGenerate,
  onBack,
  className,
}: VisualizerChatProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [photoAnalysis, setPhotoAnalysis] = useState<RoomAnalysis | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    desiredChanges: [],
    constraintsToPreserve: [],
    materialPreferences: [],
    confidenceScore: 0,
  });
  const [isReady, setIsReady] = useState(false);
  const [conversationContext, setConversationContext] = useState<Record<string, unknown> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial greeting (will be replaced once photo analysis completes)
  const [initialGreeting, setInitialGreeting] = useState<string | null>(null);

  // useChat transport for streaming — recreated when context changes
  const transport = useMemo(() => {
    const opts: { api: string; body?: object } = { api: '/api/ai/visualizer-chat' };
    if (conversationContext) {
      opts.body = { data: { context: conversationContext } };
    }
    return new DefaultChatTransport(opts);
  }, [conversationContext]);

  const initialMessages = useMemo<UIMessage[]>(() => {
    if (!initialGreeting) return [];
    return [{
      id: 'emma-greeting',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: initialGreeting }],
    }];
  }, [initialGreeting]);

  const { messages, sendMessage, status: chatStatus } = useChat({
    transport,
    messages: initialMessages,
  });

  const isLoading = chatStatus === 'streaming' || chatStatus === 'submitted';

  // Initialize conversation with photo analysis
  useEffect(() => {
    const initializeConversation = async () => {
      setIsAnalyzing(true);

      try {
        const response = await fetch('/api/ai/visualizer-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'analyze',
            imageBase64,
            isInitial: true,
          }),
        });

        if (!response.ok) throw new Error('Failed to analyze photo');

        const data = await response.json();

        if (data.photoAnalysis) {
          setPhotoAnalysis(data.photoAnalysis);
          setExtractedData((prev) => ({
            ...prev,
            roomType: data.photoAnalysis.roomType,
            constraintsToPreserve: data.photoAnalysis.preservationConstraints || [],
          }));
        }

        if (data.context) {
          setConversationContext(data.context);
        }

        setInitialGreeting(
          data.message ||
          "I've received your photo! What kind of changes would you like to see in this space?"
        );
      } catch (error) {
        console.error('Photo analysis failed:', error);
        setInitialGreeting(
          "I've received your photo! What kind of changes would you like to see in this space? Tell me about your dream renovation - the style you love, specific materials you want, or anything you'd like to keep or change."
        );
      } finally {
        setIsAnalyzing(false);
      }
    };

    initializeConversation();
  }, [imageBase64]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, isLoading]);

  // Focus input after analysis
  useEffect(() => {
    if (!isAnalyzing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAnalyzing]);

  // Check readiness when extracted data changes
  useEffect(() => {
    const hasStyle = !!extractedData.stylePreference;
    const hasChanges = extractedData.desiredChanges.length > 0;
    const hasEnoughTurns = messages.filter((m) => m.role === 'user').length >= 2;

    setIsReady(hasStyle && (hasChanges || hasEnoughTurns));
  }, [extractedData, messages]);

  // Extract design intent from assistant messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') return;

    const content = getMessageContent(lastMsg).toLowerCase();

    // Extract style from user messages
    const styles: Record<string, DesignStyle> = {
      modern: 'modern',
      traditional: 'traditional',
      farmhouse: 'farmhouse',
      industrial: 'industrial',
      minimalist: 'minimalist',
      contemporary: 'contemporary',
    };
    for (const [keyword, style] of Object.entries(styles)) {
      if (content.includes(keyword)) {
        setExtractedData((prev) => ({
          ...prev,
          stylePreference: prev.stylePreference || style,
        }));
        break;
      }
    }

    // Extract materials
    const materials = ['marble', 'granite', 'quartz', 'wood', 'tile', 'brass', 'stainless steel', 'subway tile'];
    for (const mat of materials) {
      if (content.includes(mat)) {
        setExtractedData((prev) => ({
          ...prev,
          materialPreferences: [...new Set([...prev.materialPreferences, mat])],
        }));
      }
    }

    // Extract desired changes (simple heuristic)
    const changePatterns = [
      /(?:want|like|love)\s+(?:to\s+)?(?:have\s+)?(?:new\s+)?(.+?)(?:\.|,|$)/gi,
      /(?:update|replace|change|add)\s+(?:the\s+)?(.+?)(?:\.|,|$)/gi,
    ];
    for (const pattern of changePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const change = match[1]?.trim();
        if (change && change.length > 3 && change.length < 100) {
          setExtractedData((prev) => ({
            ...prev,
            desiredChanges: [...new Set([...prev.desiredChanges, change])],
          }));
        }
      }
    }
  }, [messages]);

  const [inputValue, setInputValue] = useState('');

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || isAnalyzing) return;
    const text = inputValue.trim();
    setInputValue('');
    await sendMessage({ text });
  }, [inputValue, isLoading, isAnalyzing, sendMessage]);

  const handleGenerate = () => {
    const style: DesignStyle = extractedData.stylePreference || 'modern';
    const roomType: RoomType = extractedData.roomType || photoAnalysis?.roomType as RoomType || 'kitchen';

    const constraintParts: string[] = [];
    if (extractedData.desiredChanges.length > 0) {
      constraintParts.push(`Changes: ${extractedData.desiredChanges.join(', ')}`);
    }
    if (extractedData.constraintsToPreserve.length > 0) {
      constraintParts.push(`Preserve: ${extractedData.constraintsToPreserve.join(', ')}`);
    }
    if (extractedData.materialPreferences.length > 0) {
      constraintParts.push(`Materials: ${extractedData.materialPreferences.join(', ')}`);
    }

    const generateConfig: Parameters<typeof onGenerate>[0] = {
      roomType,
      style,
      designIntent: {
        desiredChanges: extractedData.desiredChanges,
        constraintsToPreserve: extractedData.constraintsToPreserve,
        ...(extractedData.materialPreferences.length > 0 && {
          materialPreferences: extractedData.materialPreferences,
        }),
      },
    };
    if (constraintParts.length > 0) {
      generateConfig.constraints = constraintParts.join('. ');
    }
    if (photoAnalysis) {
      generateConfig.photoAnalysis = photoAnalysis;
    }
    onGenerate(generateConfig);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Style buttons for quick selection
  const styleOptions: { value: DesignStyle; label: string }[] = [
    { value: 'modern', label: 'Modern' },
    { value: 'traditional', label: 'Traditional' },
    { value: 'farmhouse', label: 'Farmhouse' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'minimalist', label: 'Minimalist' },
    { value: 'contemporary', label: 'Contemporary' },
  ];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="font-semibold">Chat with Emma</h2>
            <p className="text-xs text-muted-foreground">
              Your renovation assistant
            </p>
          </div>
        </div>

        {/* Readiness indicator */}
        {isReady && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Ready to generate
          </div>
        )}
      </div>

      {/* Photo thumbnail + analysis feedback */}
      <div className="bg-muted/50 border-b border-border">
        <div className="flex items-center gap-3 p-3">
          <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0">
            <img
              src={imageBase64}
              alt="Your room"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            {photoAnalysis ? (
              <div className="text-sm">
                <span className="font-medium capitalize">
                  {photoAnalysis.roomType.replace('_', ' ')}
                </span>
                <span className="text-muted-foreground"> • </span>
                <span className="text-muted-foreground capitalize">
                  {photoAnalysis.layoutType}
                </span>
                {photoAnalysis.estimatedCeilingHeight && (
                  <>
                    <span className="text-muted-foreground"> • </span>
                    <span className="text-muted-foreground text-xs">
                      {photoAnalysis.estimatedCeilingHeight}
                    </span>
                  </>
                )}
              </div>
            ) : isAnalyzing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing your space...
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Your room</div>
            )}
          </div>
        </div>

        {/* Phased analysis feedback */}
        {(isAnalyzing || photoAnalysis) && (
          <AnalysisFeedback isAnalyzing={isAnalyzing} photoAnalysis={photoAnalysis} />
        )}
      </div>

      {/* Extracted data summary */}
      {(extractedData.stylePreference ||
        extractedData.desiredChanges.length > 0) && (
        <div className="p-3 bg-primary/5 border-b border-border">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs space-y-1">
              {extractedData.stylePreference && (
                <div>
                  <span className="text-muted-foreground">Style:</span>{' '}
                  <span className="font-medium capitalize">
                    {extractedData.stylePreference}
                  </span>
                </div>
              )}
              {extractedData.desiredChanges.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Changes:</span>{' '}
                  {extractedData.desiredChanges.slice(0, 3).join(', ')}
                  {extractedData.desiredChanges.length > 3 && '...'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {getMessageContent(message)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick style selection (show if no style selected yet) */}
      {!extractedData.stylePreference &&
        !isAnalyzing &&
        messages.length > 0 && (
          <div className="p-3 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">
              Quick select a style:
            </p>
            <div className="flex flex-wrap gap-2">
              {styleOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setExtractedData((prev) => ({
                      ...prev,
                      stylePreference: option.value,
                    }));
                    setInputValue(`I'd like a ${option.label.toLowerCase()} style`);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}

      {/* Voice Indicator — inline when voice is active */}
      <VisualizerVoiceIndicator extractedData={extractedData} setExtractedData={setExtractedData} />

      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Emma about your dream space..."
            disabled={isLoading || isAnalyzing}
            className="flex-1"
            aria-label="Message to Emma"
          />
          <TalkButton
            context="visualizer"
            variant="inline"
            disabled={isLoading || isAnalyzing}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || isAnalyzing}
            size="icon"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Generate button */}
        {isReady && (
          <Button
            onClick={handleGenerate}
            className="w-full mt-3 bg-primary"
            size="lg"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate My Vision
          </Button>
        )}

        {/* Skip to generate option */}
        {!isReady && messages.length >= 2 && extractedData.stylePreference && (
          <div className="text-center mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              className="text-xs"
            >
              Skip chat and generate with{' '}
              <span className="capitalize ml-1">
                {extractedData.stylePreference}
              </span>{' '}
              style
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Analysis Feedback Component
 * Animated phased analysis display showing what the AI detected
 */
interface AnalysisPhase {
  icon: React.ReactNode;
  label: string;
  detail: string | null;
  complete: boolean;
}

function AnalysisFeedback({
  isAnalyzing,
  photoAnalysis,
}: {
  isAnalyzing: boolean;
  photoAnalysis: RoomAnalysis | null;
}) {
  const [visiblePhases, setVisiblePhases] = useState(0);

  useEffect(() => {
    if (!isAnalyzing && !photoAnalysis) return undefined;

    // Animate phases appearing one by one during analysis
    if (isAnalyzing) {
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 1; i <= 5; i++) {
        timers.push(setTimeout(() => setVisiblePhases(i), i * 600));
      }
      return () => timers.forEach(clearTimeout);
    }

    // Once analysis is done, show all phases immediately
    if (photoAnalysis) {
      setVisiblePhases(5);
    }
    return undefined;
  }, [isAnalyzing, photoAnalysis]);

  if (!isAnalyzing && !photoAnalysis) return null;

  const phases: AnalysisPhase[] = [
    {
      icon: <ScanSearch className="w-3.5 h-3.5" />,
      label: 'Detecting room type',
      detail: photoAnalysis
        ? `${photoAnalysis.roomType.replace('_', ' ')} detected (${photoAnalysis.layoutType} layout)`
        : null,
      complete: !!photoAnalysis,
    },
    {
      icon: <Blocks className="w-3.5 h-3.5" />,
      label: 'Mapping structural elements',
      detail: photoAnalysis
        ? `${photoAnalysis.wallCount ?? photoAnalysis.structuralElements.length} walls mapped, ${photoAnalysis.openings?.filter(o => o.type === 'window').length ?? 0} windows, ${photoAnalysis.openings?.filter(o => o.type === 'door').length ?? 0} doors`
        : null,
      complete: !!photoAnalysis,
    },
    {
      icon: <Sun className="w-3.5 h-3.5" />,
      label: 'Analyzing lighting conditions',
      detail: photoAnalysis?.lightingConditions
        ? photoAnalysis.lightingConditions.slice(0, 60) + (photoAnalysis.lightingConditions.length > 60 ? '...' : '')
        : null,
      complete: !!photoAnalysis,
    },
    {
      icon: <Package className="w-3.5 h-3.5" />,
      label: 'Identifying fixtures',
      detail: photoAnalysis?.identifiedFixtures?.length
        ? photoAnalysis.identifiedFixtures.slice(0, 4).join(', ')
        : null,
      complete: !!photoAnalysis,
    },
    {
      icon: <CircleCheck className="w-3.5 h-3.5" />,
      label: 'Ready for design consultation',
      detail: null,
      complete: !!photoAnalysis,
    },
  ];

  return (
    <div className="px-3 py-2 space-y-1.5">
      {phases.slice(0, visiblePhases).map((phase, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-2 text-xs transition-all duration-300',
            phase.complete ? 'text-green-600' : 'text-muted-foreground'
          )}
        >
          {phase.complete ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          ) : i === visiblePhases - 1 && isAnalyzing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          ) : (
            <span className="flex-shrink-0">{phase.icon}</span>
          )}
          <span className={cn(phase.complete && 'font-medium')}>
            {phase.detail || phase.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Visualizer Voice Indicator
 * Shows voice indicator and extracts design intent from voice transcript
 */
function VisualizerVoiceIndicator({
  extractedData,
  setExtractedData,
}: {
  extractedData: ExtractedData;
  setExtractedData: React.Dispatch<React.SetStateAction<ExtractedData>>;
}) {
  const { status, transcript } = useVoice();
  const processedCountRef = useRef(0);

  // Extract style/material data from voice transcript entries
  useEffect(() => {
    if (transcript.length <= processedCountRef.current) return;

    const newEntries = transcript.slice(processedCountRef.current);
    processedCountRef.current = transcript.length;

    for (const entry of newEntries) {
      const lower = entry.content.toLowerCase();

      // Extract style preferences
      const styles: Record<string, DesignStyle> = {
        modern: 'modern',
        traditional: 'traditional',
        farmhouse: 'farmhouse',
        industrial: 'industrial',
        minimalist: 'minimalist',
        contemporary: 'contemporary',
      };
      for (const [keyword, style] of Object.entries(styles)) {
        if (lower.includes(keyword)) {
          setExtractedData((prev) => ({
            ...prev,
            stylePreference: prev.stylePreference || style,
          }));
          break;
        }
      }

      // Extract materials mentioned
      const materials = ['marble', 'granite', 'quartz', 'wood', 'tile', 'brass', 'stainless steel', 'subway tile'];
      for (const mat of materials) {
        if (lower.includes(mat)) {
          setExtractedData((prev) => ({
            ...prev,
            materialPreferences: [...new Set([...prev.materialPreferences, mat])],
          }));
        }
      }
    }
  }, [transcript, setExtractedData]);

  const isVoiceActive = status === 'connected' || status === 'connecting';
  if (!isVoiceActive) return null;

  return <VoiceIndicator context="visualizer" />;
}
