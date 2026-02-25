/**
 * Prompt Assembler
 * Builds layered system prompts for Emma based on page context.
 * Fetches company config from DB for dynamic tenant branding.
 * Supports dynamic cross-domain knowledge injection.
 */

import type { CompanyConfig } from '../knowledge/company';
import { getCompanyConfig, buildCompanyProfile, buildCompanySummary } from '../knowledge/company';
import { buildServicesKnowledge, buildServicesSummary } from '../knowledge/services';
import type { PageContext, PersonaKey } from './types';
import { PERSONA_TO_CONTEXT } from './types';
import { EMMA_PERSONA } from './emma';
import type { PlanTier } from '@/lib/entitlements';
import { canAccess } from '@/lib/entitlements';
import {
  PRICING_FULL,
  PRICING_SUMMARY,
  ONTARIO_GENERAL_KNOWLEDGE,
  ONTARIO_BUDGET_KNOWLEDGE,
  ONTARIO_DESIGN_KNOWLEDGE,
  SALES_TRAINING,
} from '../knowledge';
import { getQuoteAssistanceConfig, type QuoteAssistanceMode } from '@/lib/quote-assistance';
import { getTier } from '@/lib/entitlements.server';

// ---------------------------------------------------------------------------
// Pricing mode instruction — always injected on estimate page from DB
// ---------------------------------------------------------------------------

function buildPricingModeInstruction(mode: QuoteAssistanceMode): string {
  let instruction = `\n## Pricing Discussion Mode: ${mode.toUpperCase()}\n`;
  switch (mode) {
    case 'none':
      instruction += `The contractor prefers NOT to show pricing to homeowners. Do NOT discuss specific dollar amounts, ranges, or estimates. Instead say something like "Your contractor will follow up with specific pricing after reviewing the details." If the homeowner insists on a number, explain that an in-person assessment is required before providing any pricing.`;
      break;
    case 'range':
      instruction += `Provide cost ranges when you have enough information. Use language like "typically runs between $X and $Y" with appropriate disclaimers. Always note that an in-person assessment is needed for a firm quote.`;
      break;
    case 'estimate':
      instruction += `Provide the most accurate estimate you can based on the information gathered, with clear disclaimers that this is preliminary and subject to site inspection. Include materials, labour, and HST breakdown when possible.`;
      break;
  }
  return instruction;
}

// ---------------------------------------------------------------------------
// Elevate pricing deflection — never discuss dollar amounts
// ---------------------------------------------------------------------------

function buildElevatePricingDeflection(config: CompanyConfig): string {
  return `## PRICING DEFLECTION (MANDATORY — ELEVATE TIER)
You must NEVER discuss specific dollar amounts, price ranges, cost estimates, or budgets.
This includes phrases like "typically runs $X-$Y", "you might expect to pay", "ballpark of", etc.

When a homeowner asks about pricing, costs, or budget:
1. Acknowledge their question warmly
2. Explain that every project is unique and requires a proper assessment
3. Offer to connect them with ${config.principals} for accurate pricing
4. Always include: [CTA:Request a Callback:/contact]

Example responses:
- "Great question! Every renovation is different, so ${config.principals} would love to chat about your specific project. [CTA:Request a Callback:/contact]"
- "I want to make sure you get accurate numbers, not guesses. Let me connect you with our team! [CTA:Request a Callback:/contact]"

NEVER say "I can't discuss pricing" or "I'm not allowed to" — that sounds robotic. Instead, frame it as wanting to give them the BEST, most accurate information through a personal consultation.`;
}

function buildElevatePricingDeflectionVoice(config: CompanyConfig): string {
  return `## PRICING DEFLECTION (MANDATORY — ELEVATE TIER)
You must NEVER discuss specific dollar amounts, price ranges, cost estimates, or budgets.
When a homeowner asks about pricing, costs, or budget:
- Acknowledge warmly and explain every project is unique
- Offer to connect them with ${config.principals} for accurate pricing
- Say something like: "I'd love to get you connected with ${config.principals} who can give you exact numbers for your project. Want me to set that up?"
- NEVER say "I can't" or "I'm not allowed to" — frame it as wanting to give them the best information`;
}

// ---------------------------------------------------------------------------
// Context-aware rules — accept CompanyConfig and return customized rules
// ---------------------------------------------------------------------------

function buildEmmaRules(config: CompanyConfig, context: PageContext, tier?: PlanTier): string {
  // CTA routing rule — always included
  const ctaRule = `## CRITICAL ROUTING RULE (NEVER SKIP)
When suggesting the estimate tool, visualizer, or any other page, you MUST include a CTA marker:
[CTA:Label:/path]

NEVER just mention a page without a CTA.
ALWAYS include the [CTA:...] marker. Without it, users CANNOT click through.

Examples:
- "Want a ballpark figure? [CTA:Get a Free Estimate:/estimate]"
- "Let me show you what your space could look like! [CTA:Try the Visualizer:/visualizer]"
- "Check out our services! [CTA:View Services:/services]"
- "Get in touch with our team [CTA:Contact Us:/contact]"
- "Check out some of our recent work [CTA:View Our Projects:/projects]"${config.booking ? `\n- "Book a consultation with ${config.principals} [CTA:Book Online:${config.booking}]"` : ''}`;

  // Company context — shared across all contexts
  const companyContext = `### Company Context
You work for ${config.name} in ${config.location}, founded in ${config.founded} by ${config.principals}.
${config.certifications.length > 0 ? `Certified: ${config.certifications.join(', ')}.` : ''}
Service area: ${config.serviceArea}.
${config.booking ? `Booking: ${config.booking}` : ''}`;

  // Response style — shared
  const responseStyle = `### Response Style
- Keep every response to 2–3 sentences MAXIMUM
- Sound like a real person, not a corporate chatbot
- Use contractions and conversational language
- One topic per message — don't info-dump`;

  switch (context) {
    case 'general': {
      const isElevate = tier === 'elevate';
      const pricingRole = isElevate
        ? `- Do NOT share pricing ranges, dollar amounts, or cost estimates
- For any pricing questions, warmly redirect to a callback: [CTA:Request a Callback:/contact]
- Suggest the visualizer for design exploration via CTA`
        : `- Share general pricing ranges (e.g., "kitchens typically run $15K-$50K") — this is helpful and encouraged
- Redirect to /estimate for specific, detailed quotes via CTA
- Redirect to /visualizer for design exploration and room transformations via CTA`;

      const leadFlow = isElevate
        ? `### Lead Capture Flow
1. First 2–3 messages: Answer questions, show value, build rapport
2. At the "value moment": Suggest the visualizer or a callback with a CTA
3. If they want a callback: "I can have ${config.principals} reach out — what's the best number?"
4. For pricing questions: "Every project is unique — let me connect you with our team for accurate numbers. [CTA:Request a Callback:/contact]"
5. Never push for info if they're just browsing — keep it easy and friendly`
        : `### Lead Capture Flow
1. First 2–3 messages: Answer questions, show value, build rapport
2. At the "value moment": Suggest the estimate tool or visualizer with a CTA
3. If they want a callback: "I can have ${config.principals} reach out — what's the best number?"
4. Never push for info if they're just browsing — keep it easy and friendly`;

      return `${ctaRule}

## Conversation Rules for Emma (General)

${companyContext}

${responseStyle}

### Your Role on This Page
- Answer general questions about services and the renovation process
${pricingRole}
- The CTA button IS the handoff. The user clicks it and goes to the right page.${config.certifications.length > 0 ? `\n- Mention certifications (${config.certifications.join(', ')}) when relevant to build trust` : ''}

### Page-Aware Context
- If the user is on /services, reference the specific services page they're viewing
- If on the home page, focus on discovering what they need
- If on /projects, tie in what they're viewing to how we can help
- If on /about, reinforce trust and offer next steps

${leadFlow}
`;
    }

    case 'estimate':
      return `## Conversation Rules for Emma (Estimate Page)

${companyContext}

${responseStyle}

### Conversation Flow
1. Greet warmly and invite them to share a photo or describe their space
2. If photo provided, analyze and identify room type and current condition
3. Confirm project type and ask about renovation goals
4. Ask about scope (full remodel vs partial updates)
5. Inquire about material preferences and finish level (economy/standard/premium)
6. Ask about timeline expectations
7. When you have enough information (project type, size, finish level), provide a pricing range
8. Collect contact information
9. Present preliminary estimate with clear disclaimers

### Pricing Readiness
- Do NOT jump to pricing until you know at least the project type and one of: room size, finish level, or scope
- If the homeowner asks for a price before you have enough info, say: "I want to give you an accurate range, not a guess — let me ask a couple quick questions first."
- Once you have enough context, confidently share pricing ranges with standard disclaimers

### Question Guidelines
- Ask ONE question at a time
- Provide helpful context when asking about budget ranges
- Acknowledge user's responses before moving to next question
- Be conversational, not robotic

### Option Formatting (for UI buttons)
When offering choices, format clearly:
- "Are you thinking of a full kitchen remodel, updating cabinets and counters, or just cosmetic changes?"
- "Is this for economy finishes, standard mid-range, or premium high-end materials?"
- Keep options short (2–5 words each) for button display

### Photo Analysis
When a user uploads a photo:
1. Identify the room type
2. Assess current condition
3. Note visible features that affect scope
4. Compliment something positive about the space
5. Ask clarifying questions

### Contact Collection
When collecting info, explain the benefit:
"So we can send you a detailed quote and have ${config.principals} reach out — could you share your name, email, and phone number?"
`;

    case 'visualizer':
      return `## Conversation Rules for Emma (Visualizer Page)

${companyContext}

${responseStyle}

### Your Goal
Gather enough design intent information to generate a high-quality AI visualization. You need:
1. What style they want (modern, traditional, farmhouse, industrial, minimalist, contemporary)
2. What specific changes they want
3. What to preserve/keep
4. Material preferences

### Conversation Style
- Be visually descriptive: "Imagine warm walnut cabinets with brass hardware catching the morning light"
- Get excited about their ideas: "Oh I love that — subway tile with dark grout is such a bold choice"
- Offer concrete options when they're unsure: "For that cozy farmhouse feel, we could go with shiplap, beadboard, or reclaimed wood"
- Keep responses concise but vivid
- When relevant, mention the company's specialties and certifications

### Design Styles to Reference
- Modern: Clean lines, neutral colours, sleek finishes, minimal ornamentation
- Traditional: Classic elegance, rich wood tones, timeless details, crown moulding
- Farmhouse: Rustic charm, shiplap walls, natural materials, open shelving
- Industrial: Exposed elements, metal accents, raw materials, Edison bulbs
- Minimalist: Ultra-clean, hidden storage, serene simplicity, monochrome
- Contemporary: Current trends, bold accent colours, mixed textures, statement lighting
- Heritage: Period-appropriate details, restored original features, classic character

### After Gathering Enough Info
- Summarize what you've learned
- Suggest generating a visualization
- The UI will show a "Generate My Vision" button when ready
`;
  }
}

// ---------------------------------------------------------------------------
// Knowledge domain detection (keyword-based, no extra AI call)
// ---------------------------------------------------------------------------

const PRICING_KEYWORDS = [
  'cost', 'price', 'estimate', 'budget', 'how much', 'afford',
  'spend', 'expensive', 'cheap', 'quote', 'ballpark', 'range',
  'per square', 'sqft', 'sq ft', '\\$',
];

const DESIGN_KEYWORDS = [
  'style', 'design', 'modern', 'farmhouse', 'traditional', 'industrial',
  'minimalist', 'contemporary', 'color', 'colour', 'material', 'tile',
  'countertop', 'cabinet', 'flooring', 'visualize', 'look like',
  'aesthetic', 'vibe', 'feel',
];

type KnowledgeDomain = 'pricing' | 'design';

/**
 * Detect which knowledge domains a user message touches
 */
export function detectKnowledgeDomain(message: string): KnowledgeDomain[] {
  const lower = message.toLowerCase();
  const domains: KnowledgeDomain[] = [];

  if (PRICING_KEYWORDS.some(kw => lower.includes(kw.replace('\\$', '$')))) {
    domains.push('pricing');
  }
  if (DESIGN_KEYWORDS.some(kw => lower.includes(kw))) {
    domains.push('design');
  }

  return domains;
}

/**
 * Build a dynamic knowledge supplement based on the user's message
 * and the current page context. Returns extra prompt text to append, or ''.
 */
export function buildDynamicSystemPrompt(
  contextOrPersona: PageContext | PersonaKey,
  userMessage: string,
  tier?: PlanTier,
): string {
  const context = resolveContext(contextOrPersona);
  const domains = detectKnowledgeDomain(userMessage);
  if (domains.length === 0) return '';

  const additions: string[] = [];

  for (const domain of domains) {
    switch (domain) {
      case 'pricing':
        // On general or visualizer pages, inject pricing summary when user asks about costs
        // BUT suppress for Elevate tier — pricing deflection already handles this
        if ((context === 'general' || context === 'visualizer') && tier !== 'elevate') {
          additions.push(`## Cross-Domain Knowledge: Pricing Context
When the homeowner asks about costs, you can share these general ranges to be helpful.
For detailed line-item estimates, suggest the estimate tool via [CTA:Get a Free Estimate:/estimate].

${PRICING_SUMMARY}`);
        }
        break;

      case 'design':
        // On general or estimate pages, inject design knowledge when user asks about styles
        if (context === 'general' || context === 'estimate') {
          additions.push(`## Cross-Domain Knowledge: Design Context
When the homeowner asks about styles or materials, you can share these insights.
For full design visualization, suggest the visualizer via [CTA:Try the Visualizer:/visualizer].

${ONTARIO_DESIGN_KNOWLEDGE}`);
        }
        break;
    }
  }

  return additions.join('\n\n');
}

// ---------------------------------------------------------------------------
// Helper to resolve PersonaKey → PageContext (backward compat)
// ---------------------------------------------------------------------------

function resolveContext(contextOrPersona: PageContext | PersonaKey): PageContext {
  if (contextOrPersona in PERSONA_TO_CONTEXT) {
    return PERSONA_TO_CONTEXT[contextOrPersona as PersonaKey];
  }
  return contextOrPersona as PageContext;
}

// ---------------------------------------------------------------------------
// Core prompt builders
// ---------------------------------------------------------------------------

/**
 * Build the full system prompt for Emma on a given page.
 * Fetches company config from DB for dynamic tenant branding.
 *
 * Layering:
 * 1. Company + Services (scope varies by page)
 * 2. Page-specific knowledge
 * 3. Sales training (shared)
 * 4. Emma identity + page-specific rules
 */
export async function buildAgentSystemPrompt(
  contextOrPersona: PageContext | PersonaKey,
  options?: {
    userMessage?: string | undefined;
    estimateData?: Record<string, unknown> | undefined;
    handoffContext?: Record<string, unknown> | undefined;
    companyConfig?: CompanyConfig | undefined;
    tier?: PlanTier | undefined;
  },
): Promise<string> {
  const context = resolveContext(contextOrPersona);
  const config = options?.companyConfig ?? await getCompanyConfig();
  const persona = EMMA_PERSONA;

  // Resolve tier — use provided value, fetch from DB, or default to 'accelerate'
  let tier: PlanTier;
  if (options?.tier) {
    tier = options.tier;
  } else {
    try {
      tier = await getTier();
    } catch {
      tier = 'accelerate';
    }
  }

  const companyProfile = buildCompanyProfile(config);
  const companySummary = buildCompanySummary(config);
  const servicesKnowledge = buildServicesKnowledge(config.name);
  const servicesSummary = buildServicesSummary(config);

  // Layer 1: Shared company knowledge (scope varies by page)
  let layer1 = '';
  switch (context) {
    case 'general':
      layer1 = `${companyProfile}\n\n${servicesSummary}\n\n${ONTARIO_GENERAL_KNOWLEDGE}`;
      break;
    case 'estimate':
      layer1 = `${companySummary}\n\n${servicesKnowledge}`;
      break;
    case 'visualizer':
      layer1 = `${companySummary}\n\n${servicesSummary}`;
      break;
  }

  // Layer 2: Page-specific knowledge
  let layer2 = '';
  switch (context) {
    case 'general':
      // Suppress pricing knowledge for Elevate tier — they must never discuss dollar amounts
      layer2 = tier === 'elevate' ? '' : PRICING_SUMMARY;
      break;
    case 'estimate':
      layer2 = `${PRICING_FULL}\n\n${ONTARIO_BUDGET_KNOWLEDGE}`;
      break;
    case 'visualizer':
      layer2 = ONTARIO_DESIGN_KNOWLEDGE;
      break;
  }

  // Layer 3: Sales training (shared)
  const layer3 = SALES_TRAINING;

  // Layer 4: Emma identity + page-specific rules
  const emmaRules = buildEmmaRules(config, context, tier);

  const layer4 = `## Your Identity
You are **${persona.name}**, the ${persona.role} at ${config.name}.

### Personality
${persona.personalityTraits.map(t => `- ${t}`).join('\n')}

### What You Can Do
${persona.capabilities.map(c => `- ${c}`).join('\n')}

### Boundaries
${persona.boundaries.map(b => `- ${b}`).join('\n')}

${emmaRules}`;

  let prompt = `${layer4}\n\n---\n\n${layer1}\n\n---\n\n${layer2}\n\n---\n\n${layer3}`;

  // Quote assistance mode — always fetch from DB on estimate page
  // This ensures the contractor's pricing preference is respected regardless of how the user arrived
  if (context === 'estimate') {
    try {
      const qaConfig = await getQuoteAssistanceConfig(tier);
      prompt += `\n\n---\n\n${buildPricingModeInstruction(qaConfig.mode)}`;
    } catch {
      // Fallback: default to 'range' mode if DB read fails
      prompt += `\n\n---\n\n${buildPricingModeInstruction('range')}`;
    }
  }

  // Elevate pricing deflection — mandatory on general and visualizer pages
  if (tier === 'elevate' && (context === 'general' || context === 'visualizer')) {
    prompt += `\n\n---\n\n${buildElevatePricingDeflection(config)}`;
  }

  // Dynamic cross-domain knowledge injection
  if (options?.userMessage) {
    const dynamicKnowledge = buildDynamicSystemPrompt(context, options.userMessage, tier);
    if (dynamicKnowledge) {
      prompt += `\n\n---\n\n${dynamicKnowledge}`;
    }
  }

  // Rich handoff context (for estimate page receiving visualizer data)
  if (options?.handoffContext && context === 'estimate') {
    const hc = options.handoffContext;
    let handoffSection = '## Context from Visualizer\n';

    const dp = hc['designPreferences'] as Record<string, string> | undefined;
    if (dp) {
      const roomLabel = dp['customRoomType'] || dp['roomType']?.replace(/_/g, ' ') || 'Unknown';
      const styleLabel = dp['customStyle'] || dp['style'] || 'Unknown';
      handoffSection += `Room: ${roomLabel} | Style: ${styleLabel}\n`;
      if (dp['textPreferences']) {
        handoffSection += `Text Preferences: "${dp['textPreferences']}"\n`;
      }
      if (dp['voicePreferencesSummary']) {
        handoffSection += `Voice Summary: "${dp['voicePreferencesSummary']}"\n`;
      }
    }

    const vd = hc['visualizationData'] as Record<string, unknown> | undefined;
    if (vd) {
      const concepts = vd['concepts'] as unknown[];
      handoffSection += `Visualization: ${concepts?.length || 0} concepts generated (ID: ${vd['id']})\n`;
    }

    // Photo analysis — structural and spatial data from GPT Vision
    const pa = hc['photoAnalysis'] as Record<string, unknown> | undefined;
    if (pa) {
      handoffSection += `\n### Room Analysis (from photo)\n`;
      if (pa['layoutType']) handoffSection += `Layout: ${pa['layoutType']}\n`;
      if (pa['currentCondition']) handoffSection += `Condition: ${pa['currentCondition']}\n`;
      if (pa['estimatedDimensions']) handoffSection += `Dimensions: ${pa['estimatedDimensions']}\n`;
      if (pa['estimatedCeilingHeight']) handoffSection += `Ceiling: ${pa['estimatedCeilingHeight']}\n`;
      const structural = pa['structuralElements'] as string[] | undefined;
      if (structural?.length) handoffSection += `Structural elements: ${structural.join(', ')}\n`;
      const fixtures = pa['identifiedFixtures'] as string[] | undefined;
      if (fixtures?.length) handoffSection += `Fixtures: ${fixtures.join(', ')}\n`;
      const walls = pa['wallDimensions'] as Array<{ wall: string; estimatedLength: string }> | undefined;
      if (walls?.length) {
        handoffSection += `Walls: ${walls.map(w => `${w.wall} ~${w.estimatedLength}`).join(', ')}\n`;
      }
    }

    // Voice-extracted structured preferences
    const vep = hc['voiceExtractedPreferences'] as Record<string, string[]> | undefined;
    if (vep) {
      if (vep['desiredChanges']?.length) {
        handoffSection += `\nDesired changes: ${vep['desiredChanges'].join('; ')}\n`;
      }
      if (vep['materialPreferences']?.length) {
        handoffSection += `Material preferences: ${vep['materialPreferences'].join('; ')}\n`;
      }
      if (vep['preservationNotes']?.length) {
        handoffSection += `Preserve: ${vep['preservationNotes'].join('; ')}\n`;
      }
    }

    // Cost signals
    const cs = hc['costSignals'] as Record<string, unknown> | undefined;
    if (cs && cs['estimatedRangeLow'] != null) {
      handoffSection += `\n### AI Cost Estimate\n`;
      handoffSection += `Range: $${Number(cs['estimatedRangeLow']).toLocaleString()} – $${Number(cs['estimatedRangeHigh']).toLocaleString()} + HST\n`;
      const hints = cs['breakdownHints'] as string[] | undefined;
      if (hints?.length) handoffSection += `Breakdown: ${hints.join('; ')}\n`;
    }

    // Note: Quote assistance mode is now fetched from DB above (always, not just on handoff).
    // The handoff context may also carry quoteAssistanceMode but the DB value takes precedence.

    prompt += `\n\n---\n\n${handoffSection}`;
  }

  return prompt;
}

/**
 * Build a voice-optimized system prompt for Emma.
 * Fetches company config from DB for dynamic tenant branding.
 */
export async function buildVoiceSystemPrompt(
  contextOrPersona: PageContext | PersonaKey,
  options?: { companyConfig?: CompanyConfig; tier?: PlanTier },
): Promise<string> {
  const context = resolveContext(contextOrPersona);
  const config = options?.companyConfig ?? await getCompanyConfig();
  const persona = EMMA_PERSONA;

  // Resolve tier
  let tier: PlanTier;
  if (options?.tier) {
    tier = options.tier;
  } else {
    try {
      tier = await getTier();
    } catch {
      tier = 'accelerate';
    }
  }

  const companySummary = buildCompanySummary(config);
  const servicesSummary = buildServicesSummary(config);

  // Knowledge layers vary by page context
  let knowledgeContext = '';
  switch (context) {
    case 'general':
      // Suppress pricing knowledge for Elevate tier
      knowledgeContext = tier === 'elevate'
        ? `${companySummary}\n\n${servicesSummary}`
        : `${companySummary}\n\n${servicesSummary}\n\n${PRICING_SUMMARY}`;
      break;
    case 'estimate':
      knowledgeContext = `${companySummary}\n\n${servicesSummary}\n\n${PRICING_FULL}\n\n${ONTARIO_BUDGET_KNOWLEDGE}`;
      break;
    case 'visualizer':
      knowledgeContext = `${companySummary}\n\n${servicesSummary}\n\n${ONTARIO_DESIGN_KNOWLEDGE}`;
      break;
  }

  // Inject pricing mode for estimate voice calls (same as text chat)
  if (context === 'estimate') {
    try {
      const qaConfig = await getQuoteAssistanceConfig(tier);
      knowledgeContext += `\n\n${buildPricingModeInstruction(qaConfig.mode)}`;
    } catch {
      knowledgeContext += `\n\n${buildPricingModeInstruction('range')}`;
    }
  }

  // Elevate pricing deflection for voice — mandatory on general and visualizer pages
  if (tier === 'elevate' && (context === 'general' || context === 'visualizer')) {
    knowledgeContext += `\n\n${buildElevatePricingDeflectionVoice(config)}`;
  }

  return `You are ${persona.name}, the ${persona.role} at ${config.name} in ${config.location}.

## Voice Conversation Rules
- Keep every response to 1–2 sentences maximum — this is a voice conversation
- ONE topic at a time — never stack multiple questions
- Use verbal acknowledgments: "Got it", "Makes sense", "Love that"
- Speak naturally with contractions: "I'd", "we'll", "that's"
- No lists, no markdown, no formatting — just natural speech
- Pause between topics to let the homeowner respond
- Be warm, friendly, and conversational — like talking to a knowledgeable friend
- If they seem unsure, offer 2–3 concrete options to choose from

## Your Personality
${persona.personalityTraits.slice(0, 3).map(t => `- ${t}`).join('\n')}

## What You Can Help With
${persona.capabilities.slice(0, 5).map(c => `- ${c}`).join('\n')}

## Boundaries
${persona.boundaries.slice(0, 3).map(b => `- ${b}`).join('\n')}
---

${knowledgeContext}`;
}

/**
 * Get the Emma persona
 * @deprecated Use EMMA_PERSONA directly
 */
export function getPersona(_contextOrPersona?: PageContext | PersonaKey) {
  return EMMA_PERSONA;
}
