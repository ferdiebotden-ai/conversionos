'use client';

/**
 * Chat Transcript
 * Displays the AI chat conversation with the customer
 * [DEV-053]
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Json } from '@/types/database';
import { MessageCircle, ChevronDown, ChevronUp, Bot, User, Mic, Type, ClipboardList } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface ChatTranscriptProps {
  transcript: Json | null;
  intakeRawInput?: string | undefined;
  intakeMethod?: string | undefined;
}

// Format relative time for messages
function formatMessageTime(timestamp?: string): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const INTAKE_METHOD_LABELS: Record<string, { label: string; Icon: typeof Mic }> = {
  voice_dictation: { label: 'Voice Dictation', Icon: Mic },
  text_input: { label: 'Text Input', Icon: Type },
  form: { label: 'Manual Entry', Icon: ClipboardList },
};

export function ChatTranscript({ transcript, intakeRawInput, intakeMethod }: ChatTranscriptProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse transcript - handle both array and null cases
  const messages: ChatMessage[] = Array.isArray(transcript)
    ? (transcript as unknown as ChatMessage[]).filter((m) => m.role !== 'system')
    : [];

  // If no chat transcript but we have intake notes, show those instead
  if (messages.length === 0 && intakeRawInput) {
    const methodInfo = intakeMethod ? INTAKE_METHOD_LABELS[intakeMethod] : undefined;
    const MethodIcon = methodInfo?.Icon || MessageCircle;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Contractor Intake Notes</CardTitle>
          {methodInfo && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
              <MethodIcon className="h-3 w-3" />
              {methodInfo.label}
            </span>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-4">
            <p className="text-sm whitespace-pre-wrap">{intakeRawInput}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chat Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
            <p>No chat transcript available</p>
            <p className="text-sm">
              Conversation history will appear here when available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show first few messages when collapsed
  const displayedMessages = isExpanded ? messages : messages.slice(0, 4);
  const hasMore = messages.length > 4;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Chat Transcript</CardTitle>
        <span className="text-sm text-muted-foreground">
          {messages.length} messages
        </span>
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn(isExpanded ? 'h-[400px]' : 'h-auto')}>
          <div className="space-y-4 pr-4">
            {displayedMessages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={cn(
                    'flex-1 max-w-[80%] rounded-lg p-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.timestamp && (
                    <p
                      className={cn(
                        'text-xs mt-1',
                        message.role === 'user'
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {formatMessageTime(message.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Expand/collapse button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show all {messages.length} messages
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
