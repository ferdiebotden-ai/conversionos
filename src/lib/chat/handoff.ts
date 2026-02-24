/**
 * Page Handoff Utilities
 * Serializes conversation context to sessionStorage for cross-page handoffs
 */

import type { PersonaKey, PageContext } from '@/lib/ai/personas/types';
import { PERSONA_TO_CONTEXT } from '@/lib/ai/personas/types';
import type { QuoteAssistanceMode } from '@/lib/quote-assistance';

/** Reverse map: PageContext → legacy PersonaKey (for backward compat serialisation) */
const CONTEXT_TO_PERSONA: Record<PageContext, PersonaKey> = {
  general: 'receptionist',
  estimate: 'quote-specialist',
  visualizer: 'design-consultant',
};

const HANDOFF_KEY = 'demo_handoff_context';

/** Photo analysis data included in handoff (subset of RoomAnalysis) */
export interface HandoffPhotoAnalysis {
  roomType: string;
  layoutType: string;
  currentCondition: string;
  structuralElements: string[];
  identifiedFixtures: string[];
  estimatedDimensions?: string | null;
  estimatedCeilingHeight?: string | null;
  wallCount?: number | null;
  wallDimensions?: { wall: string; estimatedLength: string; hasWindow: boolean; hasDoor: boolean }[] | null;
  spatialZones?: { name: string; description: string; approximateLocation: string }[] | null;
}

/** Cost signals for quote handoff (populated when quote_assistance.mode !== 'none') */
export interface HandoffCostSignals {
  estimatedRangeLow?: number;
  estimatedRangeHigh?: number;
  breakdownHints?: string[];
  selectedMaterials?: string[];
}

export interface HandoffContext {
  /** @deprecated Use fromPage instead */
  fromPersona: PersonaKey;
  /** @deprecated Use toPage instead */
  toPersona: PersonaKey;
  /** New: page context the user is coming from */
  fromPage?: PageContext | undefined;
  /** New: page context the user is going to */
  toPage?: PageContext | undefined;
  summary: string;
  /** Last N messages serialized for context */
  recentMessages: { role: 'user' | 'assistant'; content: string }[];
  /** Any extracted data (estimate data, design preferences, etc.) */
  extractedData?: Record<string, unknown> | undefined;
  /** Visualization data when handing off from visualizer */
  visualizationData?: {
    id: string;
    concepts: { id: string; imageUrl: string; description?: string }[];
    originalImageUrl: string;
    roomType: string;
    style: string;
  } | undefined;
  /** Design preferences from the streamlined form */
  designPreferences?: {
    roomType: string;
    customRoomType?: string;
    style: string;
    customStyle?: string;
    textPreferences: string;
    voicePreferencesSummary?: string;
  } | undefined;
  /** Photo analysis from GPT Vision — structural, spatial, and fixture data */
  photoAnalysis?: HandoffPhotoAnalysis | undefined;
  /** Cost signals — only populated when contractor's quote_assistance.mode !== 'none' */
  costSignals?: HandoffCostSignals | undefined;
  /** Contractor's quote assistance mode — tells Emma how to discuss pricing in estimate context */
  quoteAssistanceMode?: QuoteAssistanceMode | undefined;
  /** Voice-extracted structured preferences (changes, materials, preservation) */
  voiceExtractedPreferences?: {
    desiredChanges: string[];
    materialPreferences: string[];
    preservationNotes: string[];
  } | undefined;
  timestamp: number;
}

/**
 * Build a concise summary from recent messages for handoff context
 */
export function buildHandoffSummary(
  messages: { role: 'user' | 'assistant'; content: string }[],
): string {
  // Take last 6 messages for context
  const recent = messages.slice(-6);
  const userMessages = recent.filter(m => m.role === 'user');

  if (userMessages.length === 0) return 'The user was browsing but hasn\'t shared specifics yet.';

  // Build a short summary from user messages
  const topics = userMessages
    .map(m => m.content.slice(0, 150))
    .join(' | ');

  return `The user discussed: ${topics}`;
}

/**
 * Serialize handoff context to sessionStorage before navigation.
 * Accepts either PageContext (new) or PersonaKey (legacy) values.
 * Always writes both PageContext and legacy PersonaKey fields for backward compatibility.
 */
export function serializeHandoffContext(
  from: PageContext | PersonaKey,
  to: PageContext | PersonaKey,
  messages: { role: 'user' | 'assistant'; content: string }[],
  extractedData?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;

  // Resolve to PageContext (new) and PersonaKey (legacy) regardless of input type
  const isPersonaKey = (v: string): v is PersonaKey =>
    v === 'receptionist' || v === 'quote-specialist' || v === 'design-consultant';

  const fromPage: PageContext = isPersonaKey(from) ? PERSONA_TO_CONTEXT[from] : from;
  const toPage: PageContext = isPersonaKey(to) ? PERSONA_TO_CONTEXT[to] : to;
  const fromPersona: PersonaKey = isPersonaKey(from) ? from : CONTEXT_TO_PERSONA[from];
  const toPersona: PersonaKey = isPersonaKey(to) ? to : CONTEXT_TO_PERSONA[to];

  const context: HandoffContext = {
    // New fields
    fromPage,
    toPage,
    // Legacy fields (backward compat — old consumers read PersonaKey values)
    fromPersona,
    toPersona,
    summary: buildHandoffSummary(messages),
    recentMessages: messages.slice(-6),
    extractedData,
    timestamp: Date.now(),
  };

  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(context));
  } catch {
    // sessionStorage might be full or unavailable
    console.warn('Failed to save handoff context');
  }
}

/**
 * Read handoff context from sessionStorage (returns null if none or expired)
 */
export function readHandoffContext(): HandoffContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;

    const context: HandoffContext = JSON.parse(raw);

    // Expire after 15 minutes
    if (Date.now() - context.timestamp > 15 * 60 * 1000) {
      clearHandoffContext();
      return null;
    }

    return context;
  } catch {
    return null;
  }
}

/**
 * Clear handoff context after reading
 */
export function clearHandoffContext(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    // ignore
  }
}

/**
 * Build a HandoffContext from a visualization DB record.
 * Used when the user navigates to /estimate?visualization=<id> (potentially
 * in a new tab or after a page refresh, where sessionStorage may be empty).
 */
export function buildHandoffFromVisualization(
  viz: Record<string, unknown>,
): HandoffContext {
  const concepts = Array.isArray(viz['generated_concepts'])
    ? (viz['generated_concepts'] as { id?: string; imageUrl?: string; image_url?: string; description?: string }[])
    : [];

  const conversationCtx = (viz['conversation_context'] as Record<string, unknown>) ?? {};
  const photoAnalysisRaw = (viz['photo_analysis'] as Record<string, unknown>) ?? null;
  const conceptPricing = (viz['concept_pricing'] as Record<string, unknown>) ?? null;

  // Reconstruct photo analysis
  let photoAnalysis: HandoffPhotoAnalysis | undefined;
  if (photoAnalysisRaw) {
    photoAnalysis = {
      roomType: (photoAnalysisRaw['roomType'] as string) ?? (viz['room_type'] as string) ?? '',
      layoutType: (photoAnalysisRaw['layoutType'] as string) ?? '',
      currentCondition: (photoAnalysisRaw['currentCondition'] as string) ?? '',
      structuralElements: (photoAnalysisRaw['structuralElements'] as string[]) ?? [],
      identifiedFixtures: (photoAnalysisRaw['identifiedFixtures'] as string[]) ?? [],
      estimatedDimensions: (photoAnalysisRaw['estimatedDimensions'] as string) ?? null,
      estimatedCeilingHeight: (photoAnalysisRaw['estimatedCeilingHeight'] as string) ?? null,
      wallCount: (photoAnalysisRaw['wallCount'] as number) ?? null,
      wallDimensions: (photoAnalysisRaw['wallDimensions'] as HandoffPhotoAnalysis['wallDimensions']) ?? null,
      spatialZones: (photoAnalysisRaw['spatialZones'] as HandoffPhotoAnalysis['spatialZones']) ?? null,
    };
  }

  // Reconstruct cost signals from concept pricing
  let costSignals: HandoffCostSignals | undefined;
  if (conceptPricing) {
    const low = conceptPricing['estimatedRangeLow'] as number | undefined;
    const high = conceptPricing['estimatedRangeHigh'] as number | undefined;
    if (low != null && high != null) {
      costSignals = {
        estimatedRangeLow: low,
        estimatedRangeHigh: high,
        breakdownHints: (conceptPricing['breakdownHints'] as string[]) ?? [],
        selectedMaterials: (conceptPricing['selectedMaterials'] as string[]) ?? [],
      };
    }
  }

  // Extract voice preferences from conversation context
  const voiceExtractedPreferences = conversationCtx['voiceExtractedPreferences'] as HandoffContext['voiceExtractedPreferences'] | undefined;
  const designIntent = conversationCtx['designIntent'] as Record<string, unknown> | undefined;

  return {
    // New PageContext fields
    fromPage: 'visualizer',
    toPage: 'estimate',
    // Legacy PersonaKey fields (backward compat — kept as original values)
    fromPersona: 'receptionist',
    toPersona: 'quote-specialist',
    summary: `The user used the AI visualizer to explore ${(viz['room_type'] as string)?.replace(/_/g, ' ') ?? 'a room'} renovation in ${(viz['style'] as string) ?? 'their chosen'} style. ${concepts.length} design concepts were generated.`,
    recentMessages: [],
    visualizationData: {
      id: (viz['id'] as string) ?? '',
      concepts: concepts.map((c, i) => ({
        id: c.id ?? `concept-${i}`,
        imageUrl: c.imageUrl ?? c.image_url ?? '',
        ...(c.description ? { description: c.description } : {}),
      })),
      originalImageUrl: (viz['original_photo_url'] as string) ?? '',
      roomType: (viz['room_type'] as string) ?? '',
      style: (viz['style'] as string) ?? '',
    },
    designPreferences: {
      roomType: (viz['room_type'] as string) ?? '',
      style: (viz['style'] as string) ?? '',
      textPreferences: (designIntent?.['textPreferences'] as string) ?? (viz['constraints'] as string) ?? '',
    },
    photoAnalysis,
    costSignals,
    voiceExtractedPreferences,
    quoteAssistanceMode: (conversationCtx['quoteAssistanceMode'] as QuoteAssistanceMode) ?? undefined,
    timestamp: Date.now(),
  };
}

/**
 * Build a system prompt prefix from handoff context
 */
export function buildHandoffPromptPrefix(context: HandoffContext): string {
  // Resolve the source page context — prefer new field, fall back to legacy mapping
  const sourcePage: PageContext = context.fromPage ?? PERSONA_TO_CONTEXT[context.fromPersona];

  const pageDescriptions: Record<PageContext, string> = {
    general: 'the homepage',
    estimate: 'the estimate page',
    visualizer: 'the visualizer',
  };

  const fromDesc = pageDescriptions[sourcePage];

  let prefix = `## Handoff Context
Based on the user's previous conversation on ${fromDesc}, here's what was discussed:
${context.summary}`;

  if (context.extractedData && Object.keys(context.extractedData).length > 0) {
    prefix += `\n\nExtracted data from the previous conversation:\n${JSON.stringify(context.extractedData, null, 2)}`;
  }

  // Rich visualization handoff data
  if (context.designPreferences) {
    const dp = context.designPreferences;
    const roomLabel = dp.customRoomType || dp.roomType.replace(/_/g, ' ');
    const styleLabel = dp.customStyle || dp.style;
    prefix += `\n\n## Handoff from Design Visualizer`;
    prefix += `\nRoom: ${roomLabel} | Style: ${styleLabel}`;
    if (dp.textPreferences) {
      prefix += `\nText Preferences: "${dp.textPreferences}"`;
    }
    if (dp.voicePreferencesSummary) {
      prefix += `\nVoice Summary: "${dp.voicePreferencesSummary}"`;
    }
  }

  if (context.visualizationData) {
    const vd = context.visualizationData;
    prefix += `\nVisualization: ${vd.concepts.length} concepts generated (ID: ${vd.id})`;
  }

  // Structural and spatial data from photo analysis
  if (context.photoAnalysis) {
    const pa = context.photoAnalysis;
    prefix += `\n\n## Room Analysis (from photo)`;
    prefix += `\nLayout: ${pa.layoutType} | Condition: ${pa.currentCondition}`;
    if (pa.estimatedDimensions) prefix += `\nDimensions: ${pa.estimatedDimensions}`;
    if (pa.estimatedCeilingHeight) prefix += `\nCeiling height: ${pa.estimatedCeilingHeight}`;
    if (pa.structuralElements.length > 0) {
      prefix += `\nStructural elements: ${pa.structuralElements.join(', ')}`;
    }
    if (pa.identifiedFixtures.length > 0) {
      prefix += `\nFixtures: ${pa.identifiedFixtures.join(', ')}`;
    }
    if (pa.wallCount != null && pa.wallDimensions?.length) {
      prefix += `\nWalls (${pa.wallCount} visible): ${pa.wallDimensions.map(w => `${w.wall} ~${w.estimatedLength}`).join(', ')}`;
    }
  }

  // Voice-extracted structured preferences
  if (context.voiceExtractedPreferences) {
    const vep = context.voiceExtractedPreferences;
    if (vep.desiredChanges.length > 0) {
      prefix += `\nDesired changes: ${vep.desiredChanges.join('; ')}`;
    }
    if (vep.materialPreferences.length > 0) {
      prefix += `\nMaterial preferences: ${vep.materialPreferences.join('; ')}`;
    }
    if (vep.preservationNotes.length > 0) {
      prefix += `\nPreserve: ${vep.preservationNotes.join('; ')}`;
    }
  }

  // Cost signals (only when contractor has pricing enabled)
  if (context.costSignals) {
    const cs = context.costSignals;
    if (cs.estimatedRangeLow != null && cs.estimatedRangeHigh != null) {
      prefix += `\n\n## AI Cost Estimate`;
      prefix += `\nRange: $${cs.estimatedRangeLow.toLocaleString()} – $${cs.estimatedRangeHigh.toLocaleString()} + HST`;
    }
    if (cs.breakdownHints?.length) {
      prefix += `\nBreakdown hints: ${cs.breakdownHints.join('; ')}`;
    }
  }

  // Quote assistance mode — instructs Emma on how to discuss pricing in estimate context
  if (context.quoteAssistanceMode) {
    prefix += `\n\n## Pricing Discussion Mode: ${context.quoteAssistanceMode.toUpperCase()}`;
    switch (context.quoteAssistanceMode) {
      case 'none':
        prefix += `\nThe contractor prefers NOT to show pricing to homeowners. Do NOT discuss specific dollar amounts. Instead say something like "Your contractor will follow up with specific pricing after reviewing the details."`;
        break;
      case 'range':
        prefix += `\nProvide cost ranges aligned with the estimates above. Use language like "typically runs between $X and $Y" with appropriate disclaimers.`;
        break;
      case 'estimate':
        prefix += `\nProvide the most accurate estimate you can based on the data above, with clear disclaimers that this is preliminary and subject to site inspection.`;
        break;
    }
  }

  prefix += '\n\nGreet them warmly and acknowledge you know what they were discussing. Don\'t repeat everything — just show awareness and pick up where they left off.';

  return prefix;
}
