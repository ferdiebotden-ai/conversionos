'use client';

/**
 * Chat Interface
 * Main container component for the AI Quote Assistant
 * Uses useChat hook from Vercel AI SDK for streaming
 * Unified voice + text experience via ElevenLabs VoiceProvider
 */

import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { TypingIndicator } from './typing-indicator';
import { EstimateSidebar, type EstimateData, type ProjectSummaryData, type FieldChangeInfo } from './estimate-sidebar';
import { ProgressIndicator, detectProgressStep, type ProgressStep } from './progress-indicator';
import { SaveProgressModal } from './save-progress-modal';
import { SubmitRequestModal } from './submit-request-modal';
import { ProjectFormModal } from './project-form-modal';
import { VoiceProvider, useVoice } from '@/components/voice/voice-provider';
import { VoiceIndicator } from '@/components/voice/voice-indicator';
import { VoiceTranscriptMessage } from '@/components/voice/voice-transcript-message';
import { compressImage, fileToBase64 } from '@/lib/utils/image';
import { readHandoffContext, clearHandoffContext, buildHandoffPromptPrefix, type HandoffContext } from '@/lib/chat/handoff';
import { Save, FileText, Send } from 'lucide-react';
import type { VoiceTranscriptEntry } from '@/lib/voice/config';
import { useBranding } from '@/components/branding-provider';

// Helper to extract text content from UIMessage parts
function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

// Extended message type to include image data
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[] | undefined;
  createdAt?: Date | undefined;
  source?: 'text' | 'voice' | undefined;
}

interface VisualizationContext {
  id: string;
  roomType: string;
  style: string;
  originalPhotoUrl: string;
  constraints?: string | undefined;
}

interface ChatInterfaceProps {
  initialMessages?: ChatMessage[] | undefined;
  sessionId?: string | undefined;
  visualizationContext?: VisualizationContext | undefined;
}

function getWelcomeMessage(companyName: string, city: string, province: string) {
  return `Hey there! I'm Marcus, the budget and cost specialist here at ${companyName}. I help homeowners in the ${city}, ${province} area understand what their renovation will cost — no surprises, no pressure.\n\nTell me about the space you're thinking of renovating, or snap a quick photo and I'll take a look!`;
}

// Map frontend timeline values to API enum values
function mapTimelineToApi(timeline: string | undefined): string | undefined {
  if (!timeline) return undefined;
  const mapping: Record<string, string> = {
    'asap': 'asap',
    '1-3mo': '1_3_months',
    '3-6mo': '3_6_months',
    '6-12mo': '6_plus_months',
    'planning': 'just_exploring',
  };
  return mapping[timeline] || timeline;
}

// Map visualization room type to estimate project type
function mapRoomTypeToProjectType(roomType: string): string {
  const mapping: Record<string, string> = {
    kitchen: 'kitchen',
    bathroom: 'bathroom',
    living_room: 'other',
    bedroom: 'other',
    basement: 'basement',
    dining_room: 'other',
  };
  return mapping[roomType] || 'other';
}

// Generate a custom welcome message when coming from visualizer
function getVisualizationWelcomeMessage(context: VisualizationContext, companyName: string): string {
  const roomType = context.roomType.replace(/_/g, ' ');
  const style = context.style.charAt(0).toUpperCase() + context.style.slice(1);

  return `Hi! I see you've been exploring designs for your ${roomType} renovation in a ${style} style - it looks great! 🎨\n\nI'm your renovation assistant from ${companyName}. I can help turn that vision into a detailed estimate.\n\nTo get started, could you tell me a bit more about the space? For example:\n- What's the approximate size of the room?\n- When are you hoping to start the project?\n- Is there anything specific from your visualization you want to prioritize?`;
}

/**
 * Inner component that uses VoiceProvider context
 */
function ChatInterfaceInner({ initialMessages, sessionId: initialSessionId, visualizationContext }: ChatInterfaceProps) {
  const branding = useBranding();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [voiceTranscriptMessages, setVoiceTranscriptMessages] = useState<ChatMessage[]>([]);
  const [handoffContext, setHandoffContext] = useState<HandoffContext | null>(null);

  // Read handoff context on mount (from persona navigation)
  useEffect(() => {
    const ctx = readHandoffContext();
    if (ctx && ctx.toPersona === 'quote-specialist') {
      setHandoffContext(ctx);
      clearHandoffContext();
    }
  }, []);

  // Subscribe to voice transcript from VoiceProvider
  const { transcript: voiceTranscript } = useVoice();
  const processedVoiceIdsRef = useRef<Set<string>>(new Set());

  // Sync voice transcript entries into voiceTranscriptMessages (and parse estimate data)
  useEffect(() => {
    for (const entry of voiceTranscript) {
      if (!processedVoiceIdsRef.current.has(entry.id)) {
        processedVoiceIdsRef.current.add(entry.id);
        const msg: ChatMessage = {
          id: entry.id,
          role: entry.role,
          content: entry.content,
          createdAt: entry.timestamp,
          source: 'voice',
        };
        setVoiceTranscriptMessages((prev) => [...prev, msg]);
        parseEstimateFromResponse(entry.content);
      }
    }
  }, [voiceTranscript]);

  // Determine starting messages based on context
  const getHandoffWelcome = (ctx: HandoffContext): string => {
    const personaNames: Record<string, string> = {
      receptionist: 'Emma',
      'design-consultant': 'Mia',
    };
    const fromName = personaNames[ctx.fromPersona] || 'our team';

    // Rich welcome when coming from visualizer with design preferences
    if (ctx.fromPersona === 'design-consultant' && ctx.designPreferences) {
      const dp = ctx.designPreferences;
      const roomLabel = dp.customRoomType || dp.roomType.replace(/_/g, ' ');
      const styleLabel = dp.customStyle || dp.style;
      const conceptCount = ctx.visualizationData?.concepts.length || 0;
      const conceptNote = conceptCount > 0 ? ` I can see you generated ${conceptCount} design concepts — they look great!` : '';
      return `Hey there! I see you've been designing a ${roomLabel} renovation in a ${styleLabel} style with ${fromName}.${conceptNote}\n\nI'm Marcus, the budget and cost specialist here at ${branding.name}. Let's turn that vision into real numbers.\n\nTo get you an accurate estimate, could you tell me about the size of the space and when you're hoping to start?`;
    }

    return `Hey! ${fromName} filled me in on what you've been discussing. I'm Marcus, the budget and cost specialist here at ${branding.name}.\n\nLet's pick up where you left off and get you some solid numbers. What would you like to focus on first?`;
  };

  const welcomeMessage = handoffContext
    ? getHandoffWelcome(handoffContext)
    : visualizationContext
      ? getVisualizationWelcomeMessage(visualizationContext, branding.name)
      : getWelcomeMessage(branding.name, branding.city, branding.province);

  const startingMessages: ChatMessage[] = initialMessages && initialMessages.length > 0
    ? initialMessages
    : [{ id: 'welcome', role: 'assistant', content: welcomeMessage }];

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(startingMessages);

  // Initialize estimate data with visualization context or handoff context
  const initialEstimateData: EstimateData = visualizationContext
    ? { projectType: mapRoomTypeToProjectType(visualizationContext.roomType) }
    : handoffContext?.designPreferences
      ? { projectType: mapRoomTypeToProjectType(handoffContext.designPreferences.roomType) }
      : {};

  const [estimateData, setEstimateData] = useState<EstimateData>(initialEstimateData);
  const [uploadedImages, setUploadedImages] = useState<Map<string, string[]>>(new Map());
  const [progressStep, setProgressStep] = useState<ProgressStep>(
    visualizationContext ? 'photo' : 'welcome'
  );

  // Create transport — includes handoff context and estimate data for pricing gate
  // Note: body is intentionally recreated when dependencies change
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/ai/chat',
    body: {
      ...(handoffContext && { handoffContext }),
      estimateData: {
        projectType: estimateData.projectType,
        areaSqft: estimateData.areaSqft,
        finishLevel: estimateData.finishLevel,
        timeline: estimateData.timeline,
        goals: estimateData.goals,
        hasPhoto: Array.from(uploadedImages.values()).some(imgs => imgs.length > 0),
      },
    },
  }), [handoffContext, estimateData.projectType, estimateData.areaSqft, estimateData.finishLevel, estimateData.timeline, estimateData.goals, uploadedImages]);

  // Convert initial messages to UIMessage format for useChat
  const initialUIMessages = useMemo(() => {
    return startingMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      parts: [{ type: 'text' as const, text: msg.content }],
    }));
  }, []);

  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    transport,
    messages: initialUIMessages,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Sync local messages with chat messages and add image data
  useEffect(() => {
    const messagesWithImages: ChatMessage[] = messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: getMessageContent(msg),
      images: uploadedImages.get(msg.id) || undefined,
      createdAt: undefined,
    }));
    setLocalMessages(messagesWithImages);

    // Parse estimate data from recent messages (both user and assistant)
    const recentMessages = messagesWithImages.slice(-4);
    for (const msg of recentMessages) {
      parseEstimateFromResponse(msg.content);
    }

    // Update progress step based on conversation
    const detectedStep = detectProgressStep(messagesWithImages);
    setProgressStep(detectedStep);
  }, [messages, uploadedImages]);

  // Auto-scroll to bottom on new messages with smooth animation
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth',
          });
        }
      });
    }
  }, [localMessages, voiceTranscriptMessages, isLoading]);

  // Handle voice transcript entries — parse estimate data in real-time
  const handleVoiceMessage = useCallback((entry: VoiceTranscriptEntry) => {
    const msg: ChatMessage = {
      id: entry.id,
      role: entry.role,
      content: entry.content,
      createdAt: entry.timestamp,
      source: 'voice',
    };
    setVoiceTranscriptMessages((prev) => [...prev, msg]);
    parseEstimateFromResponse(entry.content);
  }, []);

  // Parse estimate data from AI response and user messages
  const parseEstimateFromResponse = useCallback((content: string) => {
    const lower = content.toLowerCase();

    // Look for JSON block in the response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        if (data.estimate) {
          setEstimateData((prev) => ({
            ...prev,
            ...data.estimate,
          }));
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Also check for inline estimate patterns
    const estimateMatch = content.match(/\$([0-9,]+)\s*[-–]\s*\$([0-9,]+)/);
    if (estimateMatch && estimateMatch[1] && estimateMatch[2]) {
      const low = parseInt(estimateMatch[1].replace(/,/g, ''), 10);
      const high = parseInt(estimateMatch[2].replace(/,/g, ''), 10);
      if (!isNaN(low) && !isNaN(high)) {
        setEstimateData((prev) => ({
          ...prev,
          estimateLow: low,
          estimateHigh: high,
        }));
      }
    }

    // Check for project type mentions
    const projectTypes = ['kitchen', 'bathroom', 'basement', 'flooring'];
    for (const type of projectTypes) {
      if (lower.includes(type)) {
        setEstimateData((prev) => ({
          ...prev,
          projectType: prev.projectType || type,
        }));
        break;
      }
    }

    // Extract room size
    const sizeMatch = content.match(/(?:about|around|approximately|~)?\s*(\d+)\s*(?:sq\.?\s*(?:ft|feet)|square\s*feet|sqft)/i);
    if (sizeMatch?.[1]) {
      const size = parseInt(sizeMatch[1], 10);
      if (size > 0 && size < 10000) {
        setEstimateData((prev) => ({
          ...prev,
          areaSqft: prev.areaSqft || size,
        }));
      }
    }

    // Extract timeline from content
    if (lower.includes('asap') || lower.includes('as soon as possible') || lower.includes('right away') || lower.includes('immediately')) {
      setEstimateData((prev) => ({ ...prev, timeline: prev.timeline || 'asap' }));
    } else if (lower.includes('1-3 month') || lower.includes('1 to 3 month') || lower.includes('few months') || lower.includes('couple months')) {
      setEstimateData((prev) => ({ ...prev, timeline: prev.timeline || '1-3mo' }));
    } else if (lower.includes('3-6 month') || lower.includes('3 to 6 month') || lower.includes('half year') || lower.includes('summer') || lower.includes('spring')) {
      setEstimateData((prev) => ({ ...prev, timeline: prev.timeline || '3-6mo' }));
    } else if (lower.includes('6-12 month') || lower.includes('6 to 12 month') || lower.includes('next year') || lower.includes('year from now')) {
      setEstimateData((prev) => ({ ...prev, timeline: prev.timeline || '6-12mo' }));
    } else if (lower.includes('just planning') || lower.includes('just exploring') || lower.includes('no rush') || lower.includes('researching')) {
      setEstimateData((prev) => ({ ...prev, timeline: prev.timeline || 'planning' }));
    }

    // Extract finish level
    if (lower.includes('premium') || lower.includes('high-end') || lower.includes('luxury') || lower.includes('top quality') || lower.includes('best quality')) {
      setEstimateData((prev) => ({ ...prev, finishLevel: prev.finishLevel || 'premium' }));
    } else if (lower.includes('economy') || lower.includes('budget') || lower.includes('affordable') || lower.includes('basic') || lower.includes('low cost')) {
      setEstimateData((prev) => ({ ...prev, finishLevel: prev.finishLevel || 'economy' }));
    } else if (lower.includes('standard') || lower.includes('mid-range') || lower.includes('middle') || lower.includes('average quality')) {
      setEstimateData((prev) => ({ ...prev, finishLevel: prev.finishLevel || 'standard' }));
    }

    // Extract goals/wants from user messages
    const goalPatterns = [
      /(?:i|we)(?:'d|'ll)?\s+(?:want|like|love)\s+(?:to\s+)?(.+?)(?:\.|,|$)/gi,
      /(?:looking|hoping)\s+(?:to|for)\s+(.+?)(?:\.|,|$)/gi,
      /(?:my|our)\s+goal\s+is\s+(?:to\s+)?(.+?)(?:\.|,|$)/gi,
      /(?:need|must have)\s+(.+?)(?:\.|,|$)/gi,
    ];

    for (const pattern of goalPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const goalText = match[1];
        if (goalText && goalText.length > 10 && goalText.length < 200) {
          setEstimateData((prev) => {
            const existingGoals = prev.goals || '';
            const newGoal = goalText.trim();
            if (existingGoals.toLowerCase().includes(newGoal.toLowerCase())) {
              return prev;
            }
            return {
              ...prev,
              goals: existingGoals ? `${existingGoals}. ${newGoal}` : newGoal,
            };
          });
        }
      }
    }
  }, []);

  const handleSend = async (message: string, images: File[]) => {
    let imageDataUrls: string[] = [];
    let imageDescriptions = '';

    if (images.length > 0) {
      try {
        const processedImages = await Promise.all(
          images.map(async (file) => {
            const compressed = await compressImage(file);
            return fileToBase64(compressed);
          })
        );
        imageDataUrls = processedImages;
        imageDescriptions = `\n[User uploaded ${images.length} photo${images.length > 1 ? 's' : ''}]`;
      } catch (err) {
        console.error('Error processing images:', err);
      }
    }

    const fullMessage = message + imageDescriptions;

    const tempImageKey = `temp-${Date.now()}`;
    if (imageDataUrls.length > 0) {
      setUploadedImages((prev) => {
        const next = new Map(prev);
        next.set(tempImageKey, imageDataUrls);
        return next;
      });
    }

    await sendMessage({ text: fullMessage });
  };

  // Handle save progress
  const handleSaveProgress = async (email: string) => {
    const allMessages = [...localMessages, ...voiceTranscriptMessages];
    const response = await fetch('/api/sessions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        messages: allMessages,
        extractedData: estimateData,
        sessionId,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save progress');
    }

    const data = await response.json();
    if (data.sessionId) {
      setSessionId(data.sessionId);
    }
  };

  // Handle sidebar data changes with chat acknowledgement
  const handleEstimateDataChange = useCallback((changes: Partial<ProjectSummaryData>, changeInfo?: FieldChangeInfo) => {
    setEstimateData((prev) => ({ ...prev, ...changes }));

    if (changeInfo && changeInfo.displayValue) {
      const systemContext = `[SIDEBAR_EDIT] User updated ${changeInfo.field}: ${changeInfo.displayValue}`;
      const acknowledgement = `Got it! I've updated your ${changeInfo.fieldLabel} to ${changeInfo.displayValue}.`;
      const ackMessage: ChatMessage = {
        id: `ack-${Date.now()}`,
        role: 'assistant',
        content: acknowledgement,
        createdAt: new Date(),
      };
      const editLogMessage: ChatMessage = {
        id: `edit-log-${Date.now()}`,
        role: 'user',
        content: systemContext,
        createdAt: new Date(),
      };
      setLocalMessages((prev) => [...prev, editLogMessage, ackMessage]);
    }
  }, []);

  // Handle submit request
  const handleSubmitRequest = useCallback(
    async (contactInfo: { name: string; email: string; phone?: string }) => {
      const allMessages = [...localMessages, ...voiceTranscriptMessages];
      const leadData = {
        name: contactInfo.name,
        email: contactInfo.email,
        phone: contactInfo.phone || undefined,
        projectType: estimateData.projectType || 'other',
        areaSqft: estimateData.areaSqft,
        finishLevel: estimateData.finishLevel,
        timeline: mapTimelineToApi(estimateData.timeline),
        goalsText: estimateData.goals,
        chatTranscript: allMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        visualizationId: visualizationContext?.id,
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      setEstimateData((prev) => ({
        ...prev,
        contactName: contactInfo.name,
        contactEmail: contactInfo.email,
        ...(contactInfo.phone && { contactPhone: contactInfo.phone }),
      }));
    },
    [estimateData, localMessages, voiceTranscriptMessages, visualizationContext]
  );

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (formData: {
      name: string;
      email: string;
      phone: string;
      projectType: string;
      areaSqft: string;
      timeline: string;
      finishLevel: string;
      goals: string;
    }) => {
      const allMessages = [...localMessages, ...voiceTranscriptMessages];
      const leadData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        projectType: formData.projectType || 'other',
        areaSqft: formData.areaSqft ? parseInt(formData.areaSqft, 10) : undefined,
        finishLevel: formData.finishLevel || undefined,
        timeline: mapTimelineToApi(formData.timeline),
        goalsText: formData.goals || undefined,
        chatTranscript: allMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        visualizationId: visualizationContext?.id,
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit form');
      }

      const newData: Partial<EstimateData> = {
        contactName: formData.name,
        contactEmail: formData.email,
      };
      if (formData.projectType) newData.projectType = formData.projectType;
      if (formData.areaSqft) newData.areaSqft = parseInt(formData.areaSqft, 10);
      if (formData.timeline) newData.timeline = formData.timeline;
      if (formData.finishLevel) {
        newData.finishLevel = formData.finishLevel as 'economy' | 'standard' | 'premium';
      }
      if (formData.goals) newData.goals = formData.goals;
      if (formData.phone) newData.contactPhone = formData.phone;

      setEstimateData((prev) => ({ ...prev, ...newData }));
    },
    [localMessages, voiceTranscriptMessages, visualizationContext]
  );

  // Show save button only after conversation has started
  const showSaveButton = localMessages.length > 1 || voiceTranscriptMessages.length > 0;

  // Count photos for sidebar
  const photosCount = Array.from(uploadedImages.values()).reduce(
    (sum, imgs) => sum + imgs.length,
    0
  );

  // Sidebar data with photos count
  const sidebarData: ProjectSummaryData = {
    ...estimateData,
    photosCount,
  };

  // All messages for display (text + voice transcript)
  const allDisplayMessages = [...localMessages, ...voiceTranscriptMessages];

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden bg-background">
      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Progress indicator with save button */}
        <div className="border-b border-border px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <ProgressIndicator currentStep={progressStep} hasPhoto={photosCount > 0} className="flex-1" />
            <div className="flex items-center gap-2 flex-shrink-0">
              {showSaveButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveModal(true)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Save Progress</span>
                  <span className="sm:hidden">Save</span>
                </Button>
              )}
            </div>
          </div>

          {/* Switch to Form option */}
          {estimateData.projectType && !estimateData.contactEmail && (
            <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Prefer a form?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFormModal(true)}
                className="h-7 text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                Switch to Form
              </Button>
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 min-h-0 p-4">
          <div className="max-w-3xl mx-auto space-y-1">
            {allDisplayMessages.map((message) => {
              if (message.source === 'voice') {
                return (
                  <VoiceTranscriptMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    agentName={message.role === 'assistant' ? 'Marcus' : undefined}
                  />
                );
              }
              return (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  images={message.images}
                  timestamp={message.createdAt}
                  data-testid={`${message.role}-message`}
                />
              );
            })}
            {isLoading && <TypingIndicator />}
            {error && (
              <div className="px-4 py-3 text-sm text-destructive">
                Something went wrong. Please try again.
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Voice Indicator — inline when voice active */}
        <VoiceIndicator persona="quote-specialist" />

        {/* Mobile estimate card */}
        {(sidebarData.projectType || photosCount > 0) && (
          <div className="lg:hidden px-4 py-2 border-t border-border flex-shrink-0">
            <EstimateSidebar
              data={sidebarData}
              isLoading={isLoading}
              onDataChange={handleEstimateDataChange}
              onSubmitRequest={() => setShowSubmitModal(true)}
              className="shadow-sm"
            />
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0">
          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            placeholder="Describe your renovation project..."
          />
        </div>

        {/* Submit Request CTA */}
        {sidebarData.projectType && !sidebarData.contactEmail ? (
          <div className="px-4 py-3 pb-6 border-t border-border bg-muted/30 flex-shrink-0">
            <Button
              onClick={() => setShowSubmitModal(true)}
              className="w-full bg-[#1565C0] hover:bg-[#B71C1C] text-white h-12 text-base font-semibold"
              size="lg"
              data-testid="request-quote-button"
            >
              <Send className="h-5 w-5 mr-2" />
              Submit Request Now
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              In a hurry? Skip the chat and get your quote within 24 hours.
            </p>
          </div>
        ) : (
          <div className="h-4 flex-shrink-0" />
        )}
      </div>

      {/* Estimate sidebar - desktop only */}
      <div className="hidden lg:block w-80 border-l border-border p-4 overflow-y-auto">
        <EstimateSidebar
          data={sidebarData}
          isLoading={isLoading}
          onDataChange={handleEstimateDataChange}
          onSubmitRequest={() => setShowSubmitModal(true)}
        />
      </div>

      {/* Save Progress Modal */}
      <SaveProgressModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveProgress}
      />

      {/* Submit Request Modal */}
      <SubmitRequestModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        projectData={sidebarData}
        messages={allDisplayMessages}
        onSubmit={handleSubmitRequest}
      />

      {/* Project Form Modal */}
      <ProjectFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        initialData={sidebarData}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

/**
 * ChatInterface — wraps inner component with VoiceProvider
 */
export function ChatInterface(props: ChatInterfaceProps) {
  return (
    <VoiceProvider>
      <ChatInterfaceInner {...props} />
    </VoiceProvider>
  );
}
