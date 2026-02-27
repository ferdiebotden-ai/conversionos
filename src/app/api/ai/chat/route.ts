import { type NextRequest } from 'next/server';
import { streamText, type UserModelMessage, type AssistantModelMessage } from 'ai';
import { openai } from '@/lib/ai/providers';
import { AI_CONFIG } from '@/lib/ai/config';
import { buildAgentSystemPrompt } from '@/lib/ai/personas';
import { buildHandoffPromptPrefix, type HandoffContext } from '@/lib/chat/handoff';
import { buildPricingGateInstruction, type EstimateContext } from '@/lib/ai/pricing-gate';
import { applyRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

interface MessagePart {
  type: 'text' | 'image';
  text?: string;
  image?: string;
}

interface IncomingMessage {
  role: 'user' | 'assistant' | 'system';
  content?: string;
  parts?: MessagePart[];
  data?: { images?: string[] };
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req);
  if (limited) return limited;

  try {
    const { messages, handoffContext, estimateData } = await req.json();

    // Helper to extract text content from message (handles both old and new formats)
    const getMessageContent = (msg: IncomingMessage): string => {
      // New format: parts array
      if (msg.parts && msg.parts.length > 0) {
        return msg.parts
          .filter((part): part is MessagePart & { text: string } => part.type === 'text' && !!part.text)
          .map(part => part.text)
          .join('');
      }
      // Old format: content string
      return msg.content || '';
    };

    // Helper to extract images from message parts
    const getMessageImages = (msg: IncomingMessage): string[] => {
      if (msg.parts) {
        return msg.parts
          .filter((part): part is MessagePart & { image: string } => part.type === 'image' && !!part.image)
          .map(part => part.image);
      }
      return msg.data?.images || [];
    };

    // Convert messages to the format expected by the AI SDK
    const formattedMessages: Array<UserModelMessage | AssistantModelMessage> = messages
      .filter((msg: IncomingMessage) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: IncomingMessage) => {
        const content = getMessageContent(msg);
        const images = getMessageImages(msg);

        // Handle user messages with images
        if (msg.role === 'user' && images.length > 0) {
          return {
            role: 'user' as const,
            content: [
              { type: 'text' as const, text: content },
              ...images.map((img: string) => ({
                type: 'image' as const,
                image: img,
              })),
            ],
          };
        }

        // Handle user messages without images
        if (msg.role === 'user') {
          return {
            role: 'user' as const,
            content: content,
          };
        }

        // Handle assistant messages
        return {
          role: 'assistant' as const,
          content: content,
        };
      });

    // Get latest user message for dynamic knowledge injection
    const lastUserMsg = formattedMessages.filter((m: { role: string }) => m.role === 'user').pop();
    const userMessage = lastUserMsg?.content as string | undefined;

    // Build system prompt with optional handoff context prefix + pricing gate
    let systemPrompt = await buildAgentSystemPrompt('estimate', {
      userMessage,
      handoffContext: handoffContext as Record<string, unknown> | undefined,
    });

    // Pricing confidence gating
    if (estimateData) {
      const pricingInstruction = buildPricingGateInstruction(estimateData as EstimateContext);
      systemPrompt += `\n\n---\n\n${pricingInstruction}`;
    }

    // Handoff context from a previous page (prompt prefix with recent messages + summary)
    if (handoffContext) {
      const handoffPrefix = buildHandoffPromptPrefix(handoffContext as HandoffContext);
      systemPrompt = `${handoffPrefix}\n\n---\n\n${systemPrompt}`;
    }

    const result = streamText({
      model: openai(AI_CONFIG.openai.chat),
      system: systemPrompt,
      messages: formattedMessages,
      maxOutputTokens: AI_CONFIG.parameters.chat.maxTokens,
      temperature: AI_CONFIG.parameters.chat.temperature,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
