'use client';

/**
 * Receptionist Chat
 * Unified voice + text chat container with Chat/Talk mode toggle
 * Voice transcript appears inline with text messages
 */

import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ReceptionistInput } from './receptionist-input';
import { ReceptionistCTAButtons, stripCTAs } from './receptionist-cta-buttons';
import { VoiceIndicator } from '@/components/voice/voice-indicator';
import { VoiceTranscriptMessage } from '@/components/voice/voice-transcript-message';
import { useVoice } from '@/components/voice/voice-provider';
import { EMMA_PERSONA } from '@/lib/ai/personas';
import { cn } from '@/lib/utils';
import { MessageCircle, AudioLines, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SRAnnounce } from '@/components/ui/sr-announce';
import { useTier } from '@/components/tier-provider';

function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

// Merged message type for rendering both text and voice messages
interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'text' | 'voice';
}

type ChatMode = 'chat' | 'talk';

export function ReceptionistChat() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ChatMode>('chat');
  const { canAccess: checkAccess } = useTier();
  const hasVoice = checkAccess('voice_web');

  const { status, startVoice, endVoice, isApiConfigured, transcript: voiceTranscript } = useVoice();

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/ai/receptionist' }),
    []
  );

  const initialMessages = useMemo<UIMessage[]>(() => [{
    id: 'emma-greeting',
    role: 'assistant' as const,
    parts: [{ type: 'text' as const, text: EMMA_PERSONA.greeting }],
  }], []);

  const { messages, sendMessage, status: chatStatus } = useChat({
    transport,
    messages: initialMessages,
  });

  const isLoading = chatStatus === 'streaming' || chatStatus === 'submitted';
  const isVoiceActive = status === 'connected' || status === 'connecting';

  // Handle mode switching
  const handleModeChange = useCallback((newMode: ChatMode) => {
    if (newMode === mode) return;
    setMode(newMode);

    if (newMode === 'talk') {
      if (isApiConfigured && status === 'disconnected') {
        startVoice('general');
      }
    } else {
      if (isVoiceActive) {
        endVoice();
      }
    }
  }, [mode, isApiConfigured, status, startVoice, endVoice, isVoiceActive]);

  // Merge text messages and voice transcript for display
  const displayMessages = useMemo<DisplayMessage[]>(() => {
    const textMsgs: DisplayMessage[] = messages.map((message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant',
      content: getMessageContent(message),
      source: 'text' as const,
    }));

    const voiceMsgs: DisplayMessage[] = voiceTranscript.map((entry) => ({
      id: entry.id,
      role: entry.role,
      content: entry.content,
      source: 'voice' as const,
    }));

    // Voice messages appear after text messages
    return [...textMsgs, ...voiceMsgs];
  }, [messages, voiceTranscript]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [displayMessages, isLoading]);

  const handleSend = useCallback(
    async (message: string) => {
      await sendMessage({ text: message });
    },
    [sendMessage]
  );

  // Screen reader announcement message
  const srMessage = useMemo(() => {
    if (isLoading) return 'Emma is typing...';
    if (status === 'connecting') return 'Processing voice input...';
    if (isVoiceActive) return 'Voice mode active';
    return '';
  }, [isLoading, isVoiceActive, status]);

  return (
    <div className="flex flex-col h-full max-h-[min(520px,calc(100dvh-120px))]">
      {/* Mode Toggle — Chat / Talk segmented control (voice = Dominate only) */}
      {hasVoice && (
        <div className="flex items-center gap-1 px-3 pt-2 pb-1">
          <div className="flex bg-muted rounded-lg p-0.5 w-full">
            <button
              onClick={() => handleModeChange('chat')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all',
                mode === 'chat'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              onClick={() => handleModeChange('talk')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all',
                mode === 'talk'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <AudioLines className="h-3.5 w-3.5" />
              Talk
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0" aria-live="polite" role="log">
        <div className="space-y-1 py-2">
          {displayMessages.map((message) => {
            if (message.source === 'voice') {
              return (
                <VoiceTranscriptMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  agentName={message.role === 'assistant' ? 'Emma' : undefined}
                />
              );
            }

            const cleanContent = message.role === 'assistant' ? stripCTAs(message.content) : message.content;
            return (
              <div key={message.id}>
                <MessageBubble
                  role={message.role}
                  content={cleanContent}
                  agentName={message.role === 'assistant' ? 'Emma' : undefined}
                />
                {message.role === 'assistant' && (
                  <div className="px-4 pl-14">
                    <ReceptionistCTAButtons
                      text={message.content}
                      messages={displayMessages.map(m => ({ role: m.role, content: m.content }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="px-4">
              <TypingIndicator />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Voice mode content */}
      {mode === 'talk' && (
        <>
          {/* Voice Indicator — shown inline when voice is active */}
          {isVoiceActive && (
            <VoiceIndicator context="general" />
          )}

          {/* Connecting indicator */}
          {status === 'connecting' && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground border-t border-border">
              <Loader2 className="h-3 w-3 animate-spin" />
              Connecting voice...
            </div>
          )}

          {/* Start voice button (shown when disconnected in talk mode) */}
          {status === 'disconnected' && (
            <div className="p-4 border-t border-border flex flex-col items-center gap-2">
              <Button
                onClick={() => startVoice('general')}
                disabled={isApiConfigured === false}
                className="w-full bg-primary"
                size="lg"
              >
                <AudioLines className="h-4 w-4 mr-2" />
                Talk to Emma
              </Button>
              {isApiConfigured === false && (
                <p className="text-xs text-muted-foreground">Voice is not configured</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Text input — visible in chat mode, or always as a fallback */}
      {mode === 'chat' && (
        <ReceptionistInput
          onSend={handleSend}
          disabled={isLoading}
          context="general"
        />
      )}

      {/* Screen reader announcements */}
      <SRAnnounce message={srMessage} />
    </div>
  );
}
