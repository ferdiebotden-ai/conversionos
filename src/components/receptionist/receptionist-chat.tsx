'use client';

/**
 * Receptionist Chat
 * Text chat container for the Emma receptionist widget
 */

import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from '@/components/chat/message-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { ReceptionistInput } from './receptionist-input';
import { ReceptionistCTAButtons, stripCTAs } from './receptionist-cta-buttons';
import { EMMA_PERSONA } from '@/lib/ai/personas';
import { SRAnnounce } from '@/components/ui/sr-announce';

function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ReceptionistChat() {
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const displayMessages = useMemo<DisplayMessage[]>(() => {
    return messages.map((message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant',
      content: getMessageContent(message),
    }));
  }, [messages]);

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

  const srMessage = useMemo(() => {
    if (isLoading) return 'Emma is typing...';
    return '';
  }, [isLoading]);

  return (
    <div className="flex flex-col h-full max-h-[min(520px,calc(100dvh-120px))]">
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0" aria-live="polite" role="log">
        <div className="space-y-1 py-2">
          {displayMessages.map((message) => {
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

      {/* Text input */}
      <ReceptionistInput
        onSend={handleSend}
        disabled={isLoading}
        context="general"
      />

      {/* Screen reader announcements */}
      <SRAnnounce message={srMessage} />
    </div>
  );
}
