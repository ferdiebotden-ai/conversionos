/**
 * Visualizer Conversation State Machine
 * Manages the conversational flow for design intent gathering
 */

import type { DesignStyle, RoomType } from '@/lib/schemas/visualization';
import type { RoomAnalysis } from './photo-analyzer';
import type {
  VisualizerConversationState,
  VisualizerMessage,
  DesignIntent,
  GenerationReadiness,
} from '@/lib/schemas/visualizer-extraction';

/**
 * Full conversation context
 */
export interface VisualizerConversationContext {
  state: VisualizerConversationState;
  photoAnalysis?: RoomAnalysis;
  extractedData: {
    desiredChanges: string[];
    constraintsToPreserve: string[];
    stylePreference?: DesignStyle;
    materialPreferences: string[];
    roomType?: RoomType;
    confidenceScore: number;
  };
  conversationHistory: VisualizerMessage[];
  turnCount: number;
  sessionId?: string;
}

/**
 * Create initial conversation context
 */
export function createInitialContext(sessionId?: string): VisualizerConversationContext {
  const context: VisualizerConversationContext = {
    state: 'photo_analysis',
    extractedData: {
      desiredChanges: [],
      constraintsToPreserve: [],
      materialPreferences: [],
      confidenceScore: 0,
    },
    conversationHistory: [],
    turnCount: 0,
  };
  if (sessionId) {
    context.sessionId = sessionId;
  }
  return context;
}

/**
 * Add photo analysis to context and advance state
 */
export function addPhotoAnalysis(
  context: VisualizerConversationContext,
  analysis: RoomAnalysis
): VisualizerConversationContext {
  // Build extractedData with proper handling for optional roomType
  const newExtractedData = {
    desiredChanges: context.extractedData.desiredChanges,
    constraintsToPreserve: [
      ...context.extractedData.constraintsToPreserve,
      ...analysis.preservationConstraints,
    ],
    materialPreferences: context.extractedData.materialPreferences,
    confidenceScore: context.extractedData.confidenceScore,
    ...(context.extractedData.stylePreference && { stylePreference: context.extractedData.stylePreference }),
    ...(analysis.roomType && { roomType: analysis.roomType as RoomType }),
  };

  return {
    ...context,
    photoAnalysis: analysis,
    extractedData: newExtractedData,
    state: 'intent_gathering',
  };
}

/**
 * Add a message to conversation history
 */
export function addMessage(
  context: VisualizerConversationContext,
  role: 'user' | 'assistant',
  content: string,
  extractedData?: Partial<DesignIntent>
): VisualizerConversationContext {
  const message: VisualizerMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
    extractedData: extractedData ? {
      desiredChanges: extractedData.desiredChanges,
      stylePreference: extractedData.stylePreference,
      materialMentions: extractedData.materialPreferences,
      constraints: extractedData.constraintsToPreserve,
    } : undefined,
  };

  const newHistory = [...context.conversationHistory, message];
  const newTurnCount = role === 'user' ? context.turnCount + 1 : context.turnCount;

  // Merge extracted data with proper handling for optional properties
  let mergedExtracted = { ...context.extractedData };
  if (extractedData) {
    // Build the base merged data
    const baseMerged = {
      desiredChanges: [
        ...new Set([
          ...mergedExtracted.desiredChanges,
          ...(extractedData.desiredChanges || []),
        ]),
      ],
      constraintsToPreserve: [
        ...new Set([
          ...mergedExtracted.constraintsToPreserve,
          ...(extractedData.constraintsToPreserve || []),
        ]),
      ],
      materialPreferences: [
        ...new Set([
          ...mergedExtracted.materialPreferences,
          ...(extractedData.materialPreferences || []),
        ]),
      ],
      confidenceScore: mergedExtracted.confidenceScore,
      ...(mergedExtracted.roomType && { roomType: mergedExtracted.roomType }),
    };

    // Handle stylePreference separately to avoid undefined assignment
    const newStylePref = extractedData.stylePreference
      ? (extractedData.stylePreference as DesignStyle)
      : mergedExtracted.stylePreference;

    mergedExtracted = {
      ...baseMerged,
      ...(newStylePref && { stylePreference: newStylePref }),
    };
  }

  return {
    ...context,
    conversationHistory: newHistory,
    turnCount: newTurnCount,
    extractedData: mergedExtracted,
  };
}

/**
 * Update conversation state
 */
export function updateState(
  context: VisualizerConversationContext,
  newState: VisualizerConversationState
): VisualizerConversationContext {
  return {
    ...context,
    state: newState,
  };
}

/**
 * Check if we have enough information to generate
 */
export function checkGenerationReadiness(
  context: VisualizerConversationContext
): GenerationReadiness {
  const { extractedData, photoAnalysis, turnCount } = context;
  const missingInfo: string[] = [];

  // Must have at least room type (from analysis or user)
  const hasRoomType = !!extractedData.roomType || !!photoAnalysis?.roomType;
  if (!hasRoomType) {
    missingInfo.push('room type');
  }

  // Must have style preference
  const hasStyle = !!extractedData.stylePreference;
  if (!hasStyle) {
    missingInfo.push('design style preference');
  }

  // Should have at least some desired changes
  const hasChanges = extractedData.desiredChanges.length > 0;
  if (!hasChanges && turnCount < 2) {
    missingInfo.push('specific changes you want');
  }

  // Calculate confidence
  let confidence = 0.3; // Base confidence
  if (hasRoomType) confidence += 0.2;
  if (hasStyle) confidence += 0.2;
  if (hasChanges) confidence += 0.15;
  if (photoAnalysis) confidence += 0.1;
  if (extractedData.materialPreferences.length > 0) confidence += 0.05;

  // Cap at 1.0
  confidence = Math.min(confidence, 1);

  // After 3 turns, we're ready even with minimal info
  const isReady = missingInfo.length === 0 || (turnCount >= 3 && hasStyle);

  // Build summary
  const roomDesc = extractedData.roomType || photoAnalysis?.roomType || 'room';
  const styleDesc = extractedData.stylePreference || 'your preferred style';
  const changesDesc = extractedData.desiredChanges.length > 0
    ? extractedData.desiredChanges.slice(0, 3).join(', ')
    : 'a fresh new look';

  const generationSummary = `${styleDesc} renovation of your ${roomDesc} featuring ${changesDesc}`;

  return {
    isReady,
    missingInfo,
    qualityConfidence: confidence,
    suggestedStyle: !hasStyle ? suggestStyle(context) : undefined,
    generationSummary,
  };
}

/**
 * Suggest a style based on context
 */
function suggestStyle(context: VisualizerConversationContext): DesignStyle {
  const { photoAnalysis, extractedData } = context;

  // If we have current style info, suggest complementary
  if (photoAnalysis?.currentStyle) {
    const current = photoAnalysis.currentStyle.toLowerCase();
    if (current.includes('dated') || current.includes('traditional')) {
      return 'modern';
    }
    if (current.includes('modern') || current.includes('contemporary')) {
      return 'minimalist';
    }
  }

  // Based on material preferences
  const materials = extractedData.materialPreferences.join(' ').toLowerCase();
  if (materials.includes('wood') || materials.includes('rustic') || materials.includes('barn')) {
    return 'farmhouse';
  }
  if (materials.includes('metal') || materials.includes('brick') || materials.includes('concrete')) {
    return 'industrial';
  }
  if (materials.includes('walnut') || materials.includes('teak') || materials.includes('terrazzo')) {
    return 'mid_century_modern';
  }
  if (materials.includes('rattan') || materials.includes('jute') || materials.includes('driftwood')) {
    return 'coastal';
  }
  if (materials.includes('birch') || materials.includes('linen') || materials.includes('ash')) {
    return 'scandinavian';
  }
  if (materials.includes('marble') || materials.includes('taupe') || materials.includes('greige')) {
    return 'transitional';
  }

  // Default suggestion
  return 'modern';
}

/**
 * Get the next question to ask based on state
 */
export function getNextQuestion(context: VisualizerConversationContext): string | null {
  const { state, extractedData, turnCount } = context;

  // If we're ready or have asked enough questions, stop
  const readiness = checkGenerationReadiness(context);
  if (readiness.isReady || turnCount >= 5) {
    return null;
  }

  // State-based questions
  switch (state) {
    case 'photo_analysis':
      return null; // Handled separately

    case 'intent_gathering':
      if (extractedData.desiredChanges.length === 0) {
        return "What changes would you like to see in this space? For example: new countertops, updated lighting, different flooring...";
      }
      if (!extractedData.stylePreference) {
        return "What design style appeals to you? Options include modern, traditional, farmhouse, industrial, minimalist, contemporary, transitional, Scandinavian, coastal, or mid-century modern.";
      }
      break;

    case 'style_selection':
      if (!extractedData.stylePreference) {
        return "Let's nail down the style. Would you prefer something clean and modern, warm and traditional, rustic farmhouse, edgy industrial, minimal and serene, bold contemporary, refined transitional, bright Scandinavian, breezy coastal, or retro mid-century modern?";
      }
      break;

    case 'refinement':
      if (extractedData.materialPreferences.length === 0 && turnCount < 4) {
        return "Any specific materials you love? Like quartz counters, subway tile, brass hardware, or hardwood floors?";
      }
      break;

    case 'generation_ready':
      return null;
  }

  return null;
}

/**
 * Determine if state should transition
 */
export function shouldTransitionState(
  context: VisualizerConversationContext
): VisualizerConversationState | null {
  const { state, extractedData, turnCount } = context;
  const readiness = checkGenerationReadiness(context);

  // Check for generation_ready
  if (readiness.isReady) {
    return 'generation_ready';
  }

  // State transitions based on gathered info
  switch (state) {
    case 'photo_analysis':
      return 'intent_gathering';

    case 'intent_gathering':
      if (extractedData.desiredChanges.length > 0 && !extractedData.stylePreference) {
        return 'style_selection';
      }
      if (extractedData.stylePreference) {
        return 'refinement';
      }
      break;

    case 'style_selection':
      if (extractedData.stylePreference) {
        return 'refinement';
      }
      break;

    case 'refinement':
      // After 3 turns in refinement, we're ready
      if (turnCount >= 3) {
        return 'generation_ready';
      }
      break;
  }

  return null;
}

/**
 * Build the system prompt for the visualizer chat
 */
export function buildVisualizerSystemPrompt(context: VisualizerConversationContext): string {
  const { photoAnalysis, extractedData, state } = context;

  let systemPrompt = `You are Emma, an AI Renovation Assistant who helps homeowners bring their renovation vision to life through AI visualizations. You're warm, creative, detail-oriented, and concise.

CURRENT STATE: ${state}
TURN COUNT: ${context.turnCount}

GUIDELINES:
- Ask ONE question at a time
- Be conversational, warm, and visually descriptive — paint pictures with words
- Use vivid, sensory language: "Imagine warm walnut cabinets catching the morning light"
- Extract specific, actionable design preferences
- Get excited about their ideas — validate and build on them
- Keep responses concise (2-3 sentences max)
- After 3-4 exchanges, summarize what you've learned and suggest generating`;

  if (photoAnalysis) {
    systemPrompt += `

PHOTO ANALYSIS:
- Room Type: ${photoAnalysis.roomType}
- Current Layout: ${photoAnalysis.layoutType}
- Current Condition: ${photoAnalysis.currentCondition}
- Key Features: ${photoAnalysis.identifiedFixtures.join(', ')}
- Preservation Notes: ${photoAnalysis.preservationConstraints.join(', ')}`;
  }

  if (extractedData.desiredChanges.length > 0 || extractedData.stylePreference) {
    systemPrompt += `

GATHERED SO FAR:
- Desired Changes: ${extractedData.desiredChanges.join(', ') || 'Not specified yet'}
- Style Preference: ${extractedData.stylePreference || 'Not specified yet'}
- Materials: ${extractedData.materialPreferences.join(', ') || 'Not specified yet'}
- Keep/Preserve: ${extractedData.constraintsToPreserve.join(', ') || 'Not specified yet'}`;
  }

  systemPrompt += `

DESIGN STYLES TO REFERENCE:
- Modern: Clean lines, neutral colors, sleek finishes
- Traditional: Classic elegance, rich wood, timeless details
- Farmhouse: Rustic charm, shiplap, natural materials
- Industrial: Exposed elements, metal accents, raw materials
- Minimalist: Ultra-clean, hidden storage, serene simplicity
- Contemporary: Current trends, bold accents, mixed textures
- Transitional: Traditional warmth + contemporary restraint, neutral palette
- Scandinavian: Nordic minimalism, bright whites, light wood, cosy textures
- Coastal: Seaside calm, whitewashed wood, ocean blues, natural fibres
- Mid-Century Modern: 1950s–60s curves, walnut/teak, bold colour pops

Remember: Your job is to GATHER information, not generate images. Once you have enough (style + changes), suggest moving to visualization.

If they ask about costs, gently suggest: "For pricing, I can give you a detailed breakdown on the estimate page at /estimate — but let's nail down your vision first!"
Always sign off as Emma and use "we" language to create partnership.`;

  return systemPrompt;
}
