/**
 * Receptionist AI Chat API Route
 * Streaming chat endpoint for Emma in the general context (homepage widget)
 */

import { type NextRequest } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@/lib/ai/providers';
import { AI_CONFIG } from '@/lib/ai/config';
import { buildAgentSystemPrompt } from '@/lib/ai/personas';
import { applyRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

interface MessagePart {
  type: 'text';
  text?: string;
}

interface IncomingMessage {
  role: 'user' | 'assistant' | 'system';
  content?: string;
  parts?: MessagePart[];
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req);
  if (limited) return limited;

  try {
    const { messages } = await req.json();

    // Extract text content from messages (handles both old and new formats)
    const getMessageContent = (msg: IncomingMessage): string => {
      if (msg.parts && msg.parts.length > 0) {
        return msg.parts
          .filter((part): part is MessagePart & { text: string } => part.type === 'text' && !!part.text)
          .map(part => part.text)
          .join('');
      }
      return msg.content || '';
    };

    // Format messages for the AI SDK (text only — no image support for receptionist)
    const formattedMessages = messages
      .filter((msg: IncomingMessage) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: IncomingMessage) => ({
        role: msg.role as 'user' | 'assistant',
        content: getMessageContent(msg),
      }));

    // Get latest user message for dynamic knowledge injection
    const lastUserMsg = formattedMessages.filter((m: { role: string }) => m.role === 'user').pop();
    const userMessage = lastUserMsg?.content as string | undefined;

    const system = await buildAgentSystemPrompt('general', { userMessage });

    const result = streamText({
      model: openai(AI_CONFIG.openai.chat),
      system,
      messages: formattedMessages,
      maxOutputTokens: 512,
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Receptionist API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
