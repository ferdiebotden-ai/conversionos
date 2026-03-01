'use client';

/**
 * Design Studio Chat
 * Purpose-built inline chat for the post-generation phase.
 * Industry-standard layout: messages with inline suggestion chips →
 * compact action toolbar → input at bottom (ChatGPT/Claude pattern).
 */

import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { panelSpring, staggerItem } from '@/lib/animations';
import {
  Send,
  Loader2,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Mail,
  Mic,
  MicOff,
} from 'lucide-react';
import { useDictation } from '@/hooks/use-dictation';
import { extractDesignSignals, type DesignSignal } from '@/lib/ai/rendering-gate';
import { RENDERING_CONFIG } from '@/lib/ai/rendering-gate';
import { buildDesignStudioPrompt } from '@/lib/ai/personas/emma';
import type { PlanTier } from '@/lib/entitlements';
import type { QuoteAssistanceMode } from '@/lib/quote-assistance';
import type { GeneratedConcept } from '@/lib/schemas/visualization';
import type { RoomAnalysis } from '@/lib/ai/photo-analyzer';

// ── Types ──────────────────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  icon: 'refine' | 'estimate' | 'email';
  action: 'refine' | 'estimate' | 'email';
  variant: 'primary' | 'secondary';
}

interface DesignStudioChatProps {
  visualizationId: string;
  concepts: GeneratedConcept[];
  starredIndex: number;
  photoAnalysis: RoomAnalysis | null;
  roomType: string;
  style: string;
  companyName: string;
  tier: PlanTier;
  quoteAssistanceMode: QuoteAssistanceMode;
  onConceptRefined: (index: number, newImageUrl: string) => void;
  onRequestEstimate: () => void;
  onEmailDesigns: () => void;
  onRefiningChange?: (isRefining: boolean) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

/** Parse [Suggestions: A | B] from the end of a message */
function parseSuggestions(text: string): { cleanText: string; suggestions: string[] } {
  const match = text.match(/\[Suggestions?:\s*(.+?)\]\s*$/i);
  if (!match?.[1]) return { cleanText: text, suggestions: [] };

  const suggestions = match[1]
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .slice(0, 2); // Max 2 suggestions

  const cleanText = text.slice(0, match.index).trimEnd();
  return { cleanText, suggestions };
}

/** Parse inline markdown: **bold** and *italic* */
function formatInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  const regex = /\*\*(.+?)\*\*|\*([^*]+?)\*/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1]) parts.push(<strong key={key++}>{match[1]}</strong>);
    else if (match[2]) parts.push(<em key={key++}>{match[2]}</em>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

/** Render markdown text as React elements: bold, italic, lists, paragraphs */
function formatChatMessage(text: string): ReactNode {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n');
    const nonEmpty = lines.filter(l => l.trim());
    if (nonEmpty.length > 0 && nonEmpty.every(l => /^\s*[-*]\s/.test(l))) {
      return (
        <ul key={pIdx} className="list-disc pl-4 space-y-1 my-1">
          {nonEmpty.map((item, i) => (
            <li key={i}>{formatInline(item.replace(/^\s*[-*]\s+/, ''))}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
        {lines.map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {formatInline(line)}
          </span>
        ))}
      </p>
    );
  });
}

const ICON_MAP = {
  refine: Sparkles,
  estimate: ArrowRight,
  email: Mail,
} as const;

// ── Component ──────────────────────────────────────────────────────────────

export function DesignStudioChat({
  visualizationId,
  concepts,
  starredIndex,
  photoAnalysis,
  roomType,
  style,
  companyName,
  tier,
  quoteAssistanceMode,
  onConceptRefined,
  onRequestEstimate,
  onEmailDesigns,
  onRefiningChange,
}: DesignStudioChatProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [refinementCount, setRefinementCount] = useState(0);
  const [isRefining, setIsRefining] = useState(false);
  const [accumulatedSignals, setAccumulatedSignals] = useState<DesignSignal[]>([]);
  const [prevStarredIndex, setPrevStarredIndex] = useState(starredIndex);
  const { status: dictationStatus, transcript, startDictation, stopDictation, clearTranscript } = useDictation();

  // Sync dictation transcript into input field
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  // Handle mic toggle
  const handleMicToggle = useCallback(() => {
    if (dictationStatus === 'recording') {
      stopDictation();
      clearTranscript();
    } else {
      clearTranscript();
      startDictation();
    }
  }, [dictationStatus, startDictation, stopDictation, clearTranscript]);

  // Notify parent of refining state changes
  const updateRefining = useCallback((refining: boolean) => {
    setIsRefining(refining);
    onRefiningChange?.(refining);
  }, [onRefiningChange]);

  // Build system prompt for the chat
  const systemPrompt = buildDesignStudioPrompt({
    companyName,
    roomType,
    style,
    photoAnalysis: photoAnalysis ? {
      estimatedDimensions: photoAnalysis.estimatedDimensions ?? undefined,
      currentCondition: photoAnalysis.currentCondition,
      layoutType: photoAnalysis.layoutType,
    } : undefined,
    starredConcepts: [starredIndex],
    conceptDescriptions: concepts.map(c => c.description || ''),
    refinementCount,
    tier,
    quoteAssistanceMode,
  });

  // Chat transport + hook
  const transport = new DefaultChatTransport({
    api: '/api/ai/chat',
    body: {
      systemPromptOverride: systemPrompt,
      handoffContext: {
        fromPersona: 'design-studio',
        designPreferences: { roomType, style },
        visualizationData: {
          id: visualizationId,
          concepts,
        },
        photoAnalysis: photoAnalysis ? {
          roomType: photoAnalysis.roomType,
          estimatedDimensions: photoAnalysis.estimatedDimensions,
          currentCondition: photoAnalysis.currentCondition,
        } : undefined,
      },
    },
  });

  const initialMessages: UIMessage[] = [
    {
      id: 'welcome',
      role: 'assistant',
      parts: [{ type: 'text', text: "These look amazing! Tap the concept that catches your eye — I'll help you refine it with colours, materials, and layout tweaks." }],
    },
  ];

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const [systemMessages, setSystemMessages] = useState<UIMessage[]>([]);
  const allMessages = useMemo(() => [...messages, ...systemMessages], [messages, systemMessages]);

  // Count user messages for contextual actions
  const exchangeCount = useMemo(
    () => allMessages.filter(m => m.role === 'user').length,
    [allMessages],
  );

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages, isRefining]);

  // Helper to inject a system message
  const injectAssistantMessage = useCallback((text: string) => {
    setSystemMessages(prev => [...prev, {
      id: `system-${Date.now()}`,
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text }],
    }]);
  }, []);

  // Inject divider when user switches active concept
  useEffect(() => {
    if (starredIndex !== prevStarredIndex && exchangeCount > 0) {
      injectAssistantMessage(`Switching to **Concept ${starredIndex + 1}** — let's explore this one!`);
    }
    setPrevStarredIndex(starredIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starredIndex]);

  // Extract design signals from user messages
  const handleSend = useCallback(async (text?: string) => {
    const messageText = text ?? inputValue;
    if (!messageText.trim() || isLoading) return;

    const signals = extractDesignSignals(messageText);
    if (signals.length > 0) {
      setAccumulatedSignals(prev => [...prev, ...signals]);
    }

    setInputValue('');
    clearTranscript();
    if (dictationStatus === 'recording') stopDictation();
    await sendMessage({ text: messageText });
  }, [inputValue, isLoading, sendMessage, clearTranscript, dictationStatus, stopDictation]);

  // Handle refinement
  const handleRefine = useCallback(async () => {
    if (isRefining || refinementCount >= RENDERING_CONFIG.maxRefinements) return;

    updateRefining(true);

    try {
      const res = await fetch('/api/ai/visualize/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualizationId,
          starredConceptIndex: starredIndex,
          designSignals: accumulatedSignals,
          conversationMessages: allMessages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-10)
            .map(m => ({ role: m.role, content: getTextContent(m) })),
          refinementNumber: refinementCount + 1,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Refine API error:', res.status, errorBody);
        throw new Error(errorBody.error || `Refinement failed (${res.status})`);
      }

      const data = await res.json();
      const newCount = refinementCount + 1;
      setRefinementCount(newCount);
      setAccumulatedSignals([]);
      onConceptRefined(starredIndex, data.imageUrl);

      if (newCount >= RENDERING_CONFIG.maxRefinements) {
        injectAssistantMessage(
          "Your design is looking great — I've made all the adjustments I can. Ready to move forward with an estimate?"
        );
      } else {
        injectAssistantMessage("I've updated your design — take a look! What's next?");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      injectAssistantMessage(`I had trouble updating the design: ${message}. Want to try again?`);
    } finally {
      updateRefining(false);
    }
  }, [isRefining, refinementCount, visualizationId, starredIndex, accumulatedSignals, allMessages, onConceptRefined, injectAssistantMessage, updateRefining]);

  // Handle quick action clicks
  const handleQuickAction = useCallback((action: QuickAction['action']) => {
    switch (action) {
      case 'refine':
        handleRefine();
        break;
      case 'estimate':
        onRequestEstimate();
        break;
      case 'email':
        onEmailDesigns();
        break;
    }
  }, [handleRefine, onRequestEstimate, onEmailDesigns]);

  // Contextual quick actions — staged based on conversation depth
  const getQuickActions = (): QuickAction[] => {
    if (exchangeCount === 0) return [];

    const canRefine = refinementCount < RENDERING_CONFIG.maxRefinements && !isRefining;
    const isElevate = tier === 'elevate';
    const hasSignals = accumulatedSignals.length > 0;

    const actions: QuickAction[] = [];

    if (canRefine && (hasSignals || exchangeCount >= 1)) {
      actions.push({ label: 'Apply My Feedback', icon: 'refine', action: 'refine', variant: 'secondary' });
    }

    if (exchangeCount >= 2) {
      actions.push({
        label: isElevate ? 'Email My Designs' : 'Get My Estimate',
        icon: isElevate ? 'email' : 'estimate',
        action: isElevate ? 'email' : 'estimate',
        variant: 'primary',
      });
    }

    return actions;
  };

  const quickActions = getQuickActions();
  const showToolbar = !isLoading && quickActions.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={panelSpring}
      className="border border-border rounded-2xl bg-card overflow-hidden flex flex-col"
      data-testid="design-studio-chat"
    >
      {/* Concept header — shows which concept is being discussed */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/30">
        {concepts[starredIndex]?.imageUrl && (
          <img
            src={concepts[starredIndex].imageUrl}
            alt={`Concept ${starredIndex + 1}`}
            className="w-8 h-8 rounded-md object-cover border border-border"
          />
        )}
        <span className="text-sm font-medium text-foreground">
          Discussing Concept {starredIndex + 1}
        </span>
      </div>

      {/* Chat messages — scrollable area with inline suggestion chips */}
      <div
        ref={scrollRef}
        className="max-h-[400px] overflow-y-auto p-4 space-y-4 flex-1"
      >
        <AnimatePresence initial={false}>
          {allMessages.map((msg, msgIndex) => {
            const rawText = getTextContent(msg);
            const isAssistant = msg.role === 'assistant';
            const { cleanText, suggestions } = isAssistant
              ? parseSuggestions(rawText)
              : { cleanText: rawText, suggestions: [] };

            // Show inline suggestions only for the LAST assistant message
            const isLastAssistant = isAssistant &&
              msgIndex === allMessages.length - 1 - [...allMessages].reverse().findIndex(m => m.role === 'assistant');
            const showInlineSuggestions = isLastAssistant && suggestions.length > 0 && !isLoading;

            return (
              <motion.div
                key={msg.id}
                variants={staggerItem}
                initial="hidden"
                animate="visible"
              >
                <div
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                  )}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm max-w-[80%]',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                    )}
                  >
                    {isAssistant
                      ? formatChatMessage(cleanText)
                      : cleanText}
                  </div>
                </div>

                {/* Inline suggestion chips — inside scroll area, below this message */}
                {showInlineSuggestions && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-11">
                    {suggestions.map((suggestion) => (
                      <Button
                        key={suggestion}
                        size="sm"
                        variant="outline"
                        className="rounded-full text-xs min-h-[32px] border-dashed"
                        onClick={() => handleSend(suggestion)}
                        disabled={isLoading || isRefining}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Refining indicator — enhanced with staged messages */}
        {isRefining && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
          >
            <div className="relative w-8 h-8 shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Applying your feedback...</p>
              <p className="text-xs text-muted-foreground">Regenerating Concept {starredIndex + 1} with your preferences</p>
            </div>
          </motion.div>
        )}

        {/* Loading indicator */}
        {isLoading && !isRefining && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-pulse [animation-delay:200ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-pulse [animation-delay:400ms]" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Fixed footer: toolbar + input */}
      <div className="border-t border-border">
        {/* Quick action toolbar — compact row above input */}
        <AnimatePresence>
          {showToolbar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pt-2 pb-1"
            >
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => {
                  const Icon = ICON_MAP[action.icon];
                  return (
                    <Button
                      key={action.action}
                      size="sm"
                      variant={action.variant === 'primary' ? 'default' : 'outline'}
                      className="rounded-full gap-1.5 text-xs min-h-[32px]"
                      onClick={() => handleQuickAction(action.action)}
                      disabled={isRefining}
                      title={action.action === 'refine' ? 'Regenerate the design using your conversation feedback' : undefined}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat input — always at the bottom: [Input] [Mic] [Send] */}
        <div className="p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); if (dictationStatus === 'recording') { stopDictation(); clearTranscript(); } handleSend(); }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Share your thoughts..."
              disabled={isLoading || isRefining}
              className="flex-1 rounded-full bg-muted border-0"
            />
            {dictationStatus !== 'unsupported' && (
              <Button
                type="button"
                size="icon"
                variant={dictationStatus === 'recording' ? 'destructive' : 'ghost'}
                className={cn(
                  'rounded-full shrink-0 h-10 w-10',
                  dictationStatus === 'recording' && 'animate-pulse',
                )}
                onClick={handleMicToggle}
                disabled={isLoading || isRefining}
                title={dictationStatus === 'recording' ? 'Stop dictation' : 'Dictate your feedback'}
              >
                {dictationStatus === 'recording' ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              type="submit"
              size="icon"
              className="rounded-full shrink-0 h-10 w-10"
              disabled={!inputValue.trim() || isLoading || isRefining}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
