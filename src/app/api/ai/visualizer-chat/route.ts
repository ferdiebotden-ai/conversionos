/**
 * Visualizer Chat API Route
 * Conversational design intent gathering for enhanced visualizations
 *
 * Two modes:
 * 1. Initial photo analysis (isInitial=true) → returns JSON
 * 2. Chat messages → streams via toUIMessageStreamResponse()
 */

import { streamText, generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@/lib/ai/providers';
import { AI_CONFIG } from '@/lib/ai/config';
import {
  analyzeRoomPhotoForVisualization,
  type RoomAnalysis,
} from '@/lib/ai/photo-analyzer';
import {
  type VisualizerConversationContext,
  createInitialContext,
  addPhotoAnalysis,
  addMessage,
  updateState,
  checkGenerationReadiness,
  shouldTransitionState,
  buildVisualizerSystemPrompt,
} from '@/lib/ai/visualizer-conversation';
import { buildDynamicSystemPrompt } from '@/lib/ai/personas/prompt-assembler';

export const maxDuration = 60;

// Request schema for initial photo analysis
const initialRequestSchema = z.object({
  message: z.string().min(1),
  imageBase64: z.string().optional(),
  isInitial: z.literal(true),
});

// Extraction schema for user messages
const userMessageExtractionSchema = z.object({
  desiredChanges: z.array(z.string()).describe('Specific renovation changes mentioned'),
  constraintsToPreserve: z.array(z.string()).describe('Things to keep unchanged'),
  stylePreference: z.string().optional().describe('Design style if mentioned'),
  materialPreferences: z.array(z.string()).describe('Specific materials mentioned'),
});

interface MessagePart {
  type: 'text';
  text?: string;
}

interface IncomingMessage {
  role: 'user' | 'assistant' | 'system';
  content?: string;
  parts?: MessagePart[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Mode 1: Initial photo analysis (returns JSON, not streamed)
    if (body.isInitial) {
      const parseResult = initialRequestSchema.safeParse(body);
      if (!parseResult.success) {
        return Response.json(
          { error: 'Invalid request', details: parseResult.error.issues },
          { status: 400 }
        );
      }

      const { imageBase64 } = parseResult.data;
      let context = createInitialContext();

      if (imageBase64) {
        try {
          const analysis = await analyzeRoomPhotoForVisualization(imageBase64);
          context = addPhotoAnalysis(context, analysis);
          const initialResponse = await generateInitialResponse(analysis);
          context = addMessage(context, 'assistant', initialResponse);

          return Response.json({
            message: initialResponse,
            context,
            photoAnalysis: analysis,
            readiness: checkGenerationReadiness(context),
          });
        } catch (error) {
          console.error('Photo analysis failed:', error);
          context = updateState(context, 'intent_gathering');
        }
      }

      // Fallback if no image or analysis failed
      return Response.json({
        message: "I've received your photo! What kind of changes would you like to see in this space?",
        context,
        readiness: checkGenerationReadiness(context),
      });
    }

    // Mode 2: Streaming chat (useChat compatible)
    const { messages: rawMessages, data } = body;

    // Extract text from messages (handles both old and new formats)
    const getMessageContent = (msg: IncomingMessage): string => {
      if (msg.parts && msg.parts.length > 0) {
        return msg.parts
          .filter((part): part is MessagePart & { text: string } => part.type === 'text' && !!part.text)
          .map(part => part.text)
          .join('');
      }
      return msg.content || '';
    };

    const formattedMessages = (rawMessages || [])
      .filter((msg: IncomingMessage) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: IncomingMessage) => ({
        role: msg.role as 'user' | 'assistant',
        content: getMessageContent(msg),
      }));

    // Restore context from client data (passed via useChat body)
    const context: VisualizerConversationContext = data?.context
      ? (data.context as VisualizerConversationContext)
      : createInitialContext();

    // Build system prompt — uses dynamic knowledge injection from Phase 3
    const lastUserMessage = formattedMessages.filter((m: { role: string }) => m.role === 'user').pop();
    const visualizerBase = buildVisualizerSystemPrompt(context);
    const dynamicAdditions = lastUserMessage
      ? buildDynamicSystemPrompt('design-consultant', lastUserMessage.content)
      : '';
    const systemPrompt = dynamicAdditions
      ? `${visualizerBase}\n\n---\n\n${dynamicAdditions}`
      : visualizerBase;

    const result = streamText({
      model: openai(AI_CONFIG.openai.chat),
      system: systemPrompt,
      messages: formattedMessages,
      maxOutputTokens: 300,
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Visualizer chat error:', error);
    return Response.json(
      { error: 'Chat failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Generate initial response based on photo analysis
async function generateInitialResponse(analysis: RoomAnalysis): Promise<string> {
  const roomType = analysis.roomType.replace('_', ' ');
  const condition = analysis.currentCondition;
  const layout = analysis.layoutType;
  const fixtures = analysis.identifiedFixtures.slice(0, 4);

  let response = `I can see this is ${/^[aeiou]/i.test(roomType) ? 'an' : 'a'} ${roomType} `;

  if (layout) {
    response += `with a ${layout.toLowerCase()} layout. `;
  }

  if (condition === 'excellent' || condition === 'good') {
    response += `It's in ${condition} condition! `;
  } else if (condition === 'dated') {
    response += `It looks like it could use some updating. `;
  } else {
    response += `I can see there's great potential here for a transformation. `;
  }

  if (fixtures.length > 0) {
    response += `I notice the ${fixtures.slice(0, 2).join(' and ')}. `;
  }

  response += `\n\nWhat kind of changes are you hoping to make? `;
  response += `Are you thinking of a complete style overhaul, or focusing on specific elements?`;

  return response;
}

// Extract design intent from user message
async function extractFromMessage(message: string): Promise<z.infer<typeof userMessageExtractionSchema>> {
  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.extraction),
      schema: userMessageExtractionSchema,
      prompt: `Extract renovation design intent from this message. Be specific and actionable.

User message: "${message}"

Extract:
- desiredChanges: Specific changes they want (e.g., "new countertops", "update lighting")
- constraintsToPreserve: Things they want to keep (e.g., "keep the layout", "preserve the cabinets")
- stylePreference: If they mention a style (modern, traditional, farmhouse, industrial, minimalist, contemporary)
- materialPreferences: Specific materials mentioned (e.g., "quartz", "subway tile", "brass")

Only include items actually mentioned or clearly implied.`,
      maxOutputTokens: 300,
      temperature: 0.2,
    });

    return result.object;
  } catch (error) {
    console.error('Extraction failed:', error);
    return {
      desiredChanges: [],
      constraintsToPreserve: [],
      materialPreferences: [],
    };
  }
}
