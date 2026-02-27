/**
 * AI Configuration
 * Model constants and parameters for AI services
 */

export const AI_CONFIG = {
  openai: {
    chat: 'gpt-5.2',           // Production chat model
    extraction: 'gpt-5.2',     // Structured extraction
    vision: 'gpt-5.2',         // Photo analysis (multimodal) — 86.3% spatial reasoning accuracy
    moderation: 'omni-moderation-latest',
  },
  google: {
    imageGeneration: 'gemini-3.1-flash-image-preview', // Nano Banana 2 — Pro quality at Flash speed
  },
  replicate: {
    depthModel: 'depth-anything/depth-anything-v3-metric',
    depthTimeout: 25000,
  },
  pipeline: {
    enableDepthEstimation: false,  // Disabled: REPLICATE_API_TOKEN not configured
    enableEdgeDetection: true,     // Local sharp processing, zero cost
    enableIterativeRefinement: false, // Disabled globally — enabled per-request for Accelerate+ tiers
  },
  parameters: {
    chat: {
      maxTokens: 1024,
      temperature: 0.7,
    },
    extraction: {
      maxTokens: 2048,
      temperature: 0.3,
    },
    vision: {
      maxTokens: 2500,
      temperature: 0.5,
    },
    imageGeneration: {
      structureReferenceStrength: 0.90, // Preserve room geometry
      styleStrength: 0.4,               // Apply style without overwhelming
      outputCount: 4,                   // Generate 4 variations
      timeout: 75000,                   // 75s — matches VISUALIZATION_CONFIG.timeout
    },
  },
} as const;

export type ModelType = keyof typeof AI_CONFIG.openai;
