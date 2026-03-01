'use client';

/**
 * Design Studio Chat
 * Purpose-built inline chat for the post-generation phase.
 * Quick action buttons guide the homeowner through refinement → estimate.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
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
  icon: 'refine' | 'chat' | 'estimate' | 'email';
  action: 'refine' | 'chat' | 'estimate' | 'email';
  variant: 'primary' | 'secondary' | 'ghost';
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
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

const ICON_MAP = {
  refine: Sparkles,
  chat: MessageCircle,
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
}: DesignStudioChatProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [refinementCount, setRefinementCount] = useState(0);
  const [isRefining, setIsRefining] = useState(false);
  const [accumulatedSignals, setAccumulatedSignals] = useState<DesignSignal[]>([]);

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
      parts: [{ type: 'text', text: 'These look amazing! What would you like to do?' }],
    },
  ];

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  // Extra messages injected by the system (refinement ack, etc.)
  const [systemMessages, setSystemMessages] = useState<UIMessage[]>([]);
  const allMessages = useMemo(() => [...messages, ...systemMessages], [messages, systemMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages, isRefining]);

  // Helper to inject a system message (refinement ack, error, etc.)
  const injectAssistantMessage = useCallback((text: string) => {
    setSystemMessages(prev => [...prev, {
      id: `system-${Date.now()}`,
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text }],
    }]);
  }, []);

  // Extract design signals from user messages
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    // Extract signals before sending
    const signals = extractDesignSignals(inputValue);
    if (signals.length > 0) {
      setAccumulatedSignals(prev => [...prev, ...signals]);
    }

    const text = inputValue;
    setInputValue('');
    await sendMessage({ text });
  }, [inputValue, isLoading, sendMessage]);

  // Handle refinement
  const handleRefine = useCallback(async () => {
    if (isRefining || refinementCount >= RENDERING_CONFIG.maxRefinements) return;

    setIsRefining(true);

    try {
      const res = await fetch('/api/ai/visualize/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualizationId,
          starredConceptIndex: starredIndex,
          designSignals: accumulatedSignals,
          refinementNumber: refinementCount + 1,
        }),
      });

      if (!res.ok) throw new Error('Refinement failed');

      const data = await res.json();
      setRefinementCount(prev => prev + 1);
      setAccumulatedSignals([]);
      onConceptRefined(starredIndex, data.imageUrl);

      // Emma acknowledges the refinement
      injectAssistantMessage("I've updated your design — take a look! What's next?");
    } catch {
      injectAssistantMessage("I had trouble updating the design. Want to try again, or keep discussing?");
    } finally {
      setIsRefining(false);
    }
  }, [isRefining, refinementCount, visualizationId, starredIndex, accumulatedSignals, onConceptRefined, injectAssistantMessage]);

  // Handle quick action clicks
  const handleQuickAction = useCallback((action: QuickAction['action']) => {
    switch (action) {
      case 'refine':
        handleRefine();
        break;
      case 'chat':
        inputRef.current?.focus();
        break;
      case 'estimate':
        onRequestEstimate();
        break;
      case 'email':
        onEmailDesigns();
        break;
    }
  }, [handleRefine, onRequestEstimate, onEmailDesigns]);

  // Determine which quick actions to show
  const getQuickActions = (): QuickAction[] => {
    const canRefine = refinementCount < RENDERING_CONFIG.maxRefinements && !isRefining;
    const isElevate = tier === 'elevate';

    // After max refinements — only CTA + discuss
    if (!canRefine && refinementCount >= RENDERING_CONFIG.maxRefinements) {
      return [
        {
          label: isElevate ? 'Email My Designs' : 'Get My Estimate',
          icon: isElevate ? 'email' : 'estimate',
          action: isElevate ? 'email' : 'estimate',
          variant: 'primary',
        },
        { label: 'I Have More Questions', icon: 'chat', action: 'chat', variant: 'secondary' },
      ];
    }

    // Default: refine + discuss + CTA
    const actions: QuickAction[] = [];
    if (canRefine) {
      actions.push({ label: 'Refine My Design', icon: 'refine', action: 'refine', variant: 'secondary' });
    }
    actions.push({ label: 'Keep Discussing', icon: 'chat', action: 'chat', variant: 'ghost' });
    actions.push({
      label: isElevate ? 'Email My Designs' : 'Get My Estimate',
      icon: isElevate ? 'email' : 'estimate',
      action: isElevate ? 'email' : 'estimate',
      variant: 'primary',
    });

    return actions;
  };

  // Should show quick actions after the last assistant message
  const lastMessage = allMessages[allMessages.length - 1];
  const showQuickActions = lastMessage?.role === 'assistant' && !isLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={panelSpring}
      className="border border-border rounded-2xl bg-card overflow-hidden"
      data-testid="design-studio-chat"
    >
      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="max-h-[400px] overflow-y-auto p-4 space-y-4"
      >
        <AnimatePresence initial={false}>
          {allMessages.map((msg) => (
            <motion.div
              key={msg.id}
              variants={staggerItem}
              initial="hidden"
              animate="visible"
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              {msg.role === 'assistant' && (
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
                {getTextContent(msg)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Refining indicator */}
        {isRefining && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Refining your design...
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

      {/* Quick action buttons */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-3"
          >
            <div className="flex flex-wrap gap-2">
              {getQuickActions().map((action) => {
                const Icon = ICON_MAP[action.icon];
                return (
                  <motion.div
                    key={action.action}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      size="sm"
                      variant={action.variant === 'primary' ? 'default' : action.variant === 'secondary' ? 'outline' : 'ghost'}
                      className="rounded-full gap-1.5 text-xs min-h-[36px]"
                      onClick={() => handleQuickAction(action.action)}
                      disabled={isRefining}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {action.label}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat input */}
      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
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
    </motion.div>
  );
}
