/**
 * AI Provider Configuration
 * OpenAI provider setup using Vercel AI SDK
 */

import { createOpenAI } from '@ai-sdk/openai';

// Create OpenAI provider instance
// API key is read from OPENAI_API_KEY env variable automatically
export const openai = createOpenAI({});

// Export model references for convenience
export const chatModel = openai('gpt-5.4');
export const visionModel = openai('gpt-5.4');
