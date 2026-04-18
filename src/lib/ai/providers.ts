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

// GPT-5.4 reasoning effort for vision + extraction + chat calls.
// 'high' gives the model more internal reasoning budget before responding,
// improving structured-output spatial-reasoning quality on the visualizer
// photo-analysis path. Cost delta vs default is ~$2.60/customer/month at
// 30 designs/mo volume — well under the $10/customer/mo budget ceiling.
// Applied globally per decision 2026-04-18. Override by passing
// explicit providerOptions at the call site.
export const OPENAI_HIGH_EFFORT = {
  openai: { reasoningEffort: 'high' as const },
} as const;
