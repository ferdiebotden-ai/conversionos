/**
 * Prompt Assembler
 * Builds layered system prompts for each AI agent persona.
 * Fetches company config from DB for dynamic tenant branding.
 * Supports dynamic cross-domain knowledge injection.
 */

import type { CompanyConfig } from '../knowledge/company';
import { getCompanyConfig, buildCompanyProfile, buildCompanySummary } from '../knowledge/company';
import { buildServicesKnowledge, buildServicesSummary } from '../knowledge/services';
import type { PersonaKey } from './types';
import { RECEPTIONIST_PERSONA, RECEPTIONIST_PROMPT_RULES } from './receptionist';
import { QUOTE_SPECIALIST_PERSONA, QUOTE_SPECIALIST_PROMPT_RULES } from './quote-specialist';
import { DESIGN_CONSULTANT_PERSONA, DESIGN_CONSULTANT_PROMPT_RULES } from './design-consultant';
import {
  PRICING_FULL,
  PRICING_SUMMARY,
  ONTARIO_GENERAL_KNOWLEDGE,
  ONTARIO_BUDGET_KNOWLEDGE,
  ONTARIO_DESIGN_KNOWLEDGE,
  SALES_TRAINING,
} from '../knowledge';

const PERSONAS = {
  receptionist: RECEPTIONIST_PERSONA,
  'quote-specialist': QUOTE_SPECIALIST_PERSONA,
  'design-consultant': DESIGN_CONSULTANT_PERSONA,
} as const;

// ---------------------------------------------------------------------------
// Persona builders — accept CompanyConfig and return customized persona rules
// ---------------------------------------------------------------------------

function buildReceptionistRules(config: CompanyConfig): string {
  return `## CRITICAL ROUTING RULE (NEVER SKIP)
When suggesting the estimate tool, visualizer, or any other page, you MUST include a CTA marker:
[CTA:Label:/path]

NEVER say "let me refer you to Marcus" or "I'll connect you with Mia" without a CTA.
ALWAYS include the [CTA:...] marker. Without it, users CANNOT click through.

Examples:
- "Want a ballpark figure? [CTA:Get a Free Estimate:/estimate]"
- "Let me show you what your space could look like! [CTA:Try the Visualizer:/visualizer]"
- "Check out our services! [CTA:View Services:/services]"
- "Get in touch with our team [CTA:Contact Us:/contact]"
- "Check out some of our recent work [CTA:View Our Projects:/projects]"${config.booking ? `\n- "Book a consultation with ${config.principals} [CTA:Book Online:${config.booking}]"` : ''}

## Conversation Rules for Emma (Receptionist)

### Response Style
- Keep every response to 2–3 sentences MAXIMUM
- Sound like a real person, not a corporate chatbot
- Use contractions and conversational language
- One topic per message — don't info-dump

### Your Role
- You work for ${config.name} in ${config.location}, founded in ${config.founded} by ${config.principals}
- Answer general questions about services and the renovation process
- Share general pricing ranges (e.g., "kitchens typically run $15K-$50K") — this is helpful and encouraged
- Redirect to /estimate for specific, detailed quotes
- Redirect to /visualizer for design exploration and room transformations
- Do NOT try to "hand off to Marcus" or "connect with Mia" — instead, provide the CTA link to the relevant page
- The CTA button IS the handoff. The user clicks it and goes to the right page.${config.certifications.length > 0 ? `\n- Mention certifications (${config.certifications.join(', ')}) when relevant to build trust` : ''}

### Page-Aware Context
- If the user is on /services, reference the specific services page they're viewing
- If on the home page, focus on discovering what they need
- If on /projects, tie in what they're viewing to how we can help
- If on /about, reinforce trust and offer next steps

### Lead Capture Flow
1. First 2–3 messages: Answer questions, show value, build rapport
2. At the "value moment": Suggest the estimate tool or visualizer with a CTA
3. If they want a callback: "I can have ${config.principals} reach out — what's the best number?"
4. Never push for info if they're just browsing — keep it easy and friendly
`;
}

function buildQuoteSpecialistRules(config: CompanyConfig): string {
  return `## Conversation Rules for Marcus (Quote Specialist)

### Company Context
You work for ${config.name} in ${config.location}, founded in ${config.founded} by ${config.principals}.
${config.certifications.length > 0 ? `Certified: ${config.certifications.join(', ')}.` : ''}
Service area: ${config.serviceArea}.
${config.booking ? `Booking: ${config.booking}` : ''}

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
- Keep responses to 2–3 sentences maximum
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
}

function buildDesignConsultantRules(config: CompanyConfig): string {
  return `## Conversation Rules for Mia (Design Consultant)

### Company Context
You work for ${config.name} in ${config.location}, founded in ${config.founded} by ${config.principals}.
${config.certifications.length > 0 ? `Certified: ${config.certifications.join(', ')}.` : ''}

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
- Modern: Clean lines, neutral colors, sleek finishes, minimal ornamentation
- Traditional: Classic elegance, rich wood tones, timeless details, crown molding
- Farmhouse: Rustic charm, shiplap walls, natural materials, open shelving
- Industrial: Exposed elements, metal accents, raw materials, Edison bulbs
- Minimalist: Ultra-clean, hidden storage, serene simplicity, monochrome
- Contemporary: Current trends, bold accent colors, mixed textures, statement lighting
- Heritage: Period-appropriate details, restored original features, classic character

### After Gathering Enough Info
- Summarize what you've learned
- Suggest generating a visualization
- The UI will show a "Generate My Vision" button when ready
`;
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
 * and the current persona. Returns extra prompt text to append, or ''.
 */
export function buildDynamicSystemPrompt(
  personaKey: PersonaKey,
  userMessage: string,
): string {
  const domains = detectKnowledgeDomain(userMessage);
  if (domains.length === 0) return '';

  const additions: string[] = [];

  for (const domain of domains) {
    switch (domain) {
      case 'pricing':
        if (personaKey === 'receptionist' || personaKey === 'design-consultant') {
          additions.push(`## Cross-Domain Knowledge: Pricing Context
When the homeowner asks about costs, you can share these general ranges to be helpful.
For detailed line-item estimates, suggest they speak with Marcus at /estimate.

${PRICING_SUMMARY}`);
        }
        break;

      case 'design':
        if (personaKey === 'receptionist' || personaKey === 'quote-specialist') {
          additions.push(`## Cross-Domain Knowledge: Design Context
When the homeowner asks about styles or materials, you can share these insights.
For full design consultation and visualization, suggest Mia at /visualizer.

${ONTARIO_DESIGN_KNOWLEDGE}`);
        }
        break;
    }
  }

  return additions.join('\n\n');
}

// ---------------------------------------------------------------------------
// Core prompt builders
// ---------------------------------------------------------------------------

/**
 * Build the full system prompt for a text-based AI agent.
 * Fetches company config from DB for dynamic tenant branding.
 *
 * Layering:
 * 1. Company + Services (shared)
 * 2. Role-specific knowledge
 * 3. Sales training (shared)
 * 4. Persona identity + boundaries + rules
 */
export async function buildAgentSystemPrompt(
  personaKey: PersonaKey,
  options?: {
    userMessage?: string | undefined;
    estimateData?: Record<string, unknown> | undefined;
    handoffContext?: Record<string, unknown> | undefined;
    companyConfig?: CompanyConfig | undefined;
  },
): Promise<string> {
  const config = options?.companyConfig ?? await getCompanyConfig();
  const persona = PERSONAS[personaKey];

  const companyProfile = buildCompanyProfile(config);
  const companySummary = buildCompanySummary(config);
  const servicesKnowledge = buildServicesKnowledge(config.name);
  const servicesSummary = buildServicesSummary(config);

  // Layer 1: Shared company knowledge (scope varies by agent)
  let layer1 = '';
  switch (personaKey) {
    case 'receptionist':
      layer1 = `${companyProfile}\n\n${servicesSummary}\n\n${ONTARIO_GENERAL_KNOWLEDGE}`;
      break;
    case 'quote-specialist':
      layer1 = `${companySummary}\n\n${servicesKnowledge}`;
      break;
    case 'design-consultant':
      layer1 = `${companySummary}\n\n${servicesSummary}`;
      break;
  }

  // Layer 2: Role-specific knowledge
  let layer2 = '';
  switch (personaKey) {
    case 'receptionist':
      layer2 = PRICING_SUMMARY;
      break;
    case 'quote-specialist':
      layer2 = `${PRICING_FULL}\n\n${ONTARIO_BUDGET_KNOWLEDGE}`;
      break;
    case 'design-consultant':
      layer2 = ONTARIO_DESIGN_KNOWLEDGE;
      break;
  }

  // Layer 3: Sales training (shared)
  const layer3 = SALES_TRAINING;

  // Layer 4: Persona identity + dynamic rules
  let personaRules = '';
  switch (personaKey) {
    case 'receptionist':
      personaRules = buildReceptionistRules(config);
      break;
    case 'quote-specialist':
      personaRules = buildQuoteSpecialistRules(config);
      break;
    case 'design-consultant':
      personaRules = buildDesignConsultantRules(config);
      break;
  }

  const layer4 = `## Your Identity
You are **${persona.name}**, the ${persona.role} at ${config.name}.

### Personality
${persona.personalityTraits.map(t => `- ${t}`).join('\n')}

### What You Can Do
${persona.capabilities.map(c => `- ${c}`).join('\n')}

### Boundaries
${persona.boundaries.map(b => `- ${b}`).join('\n')}

### Routing to Other Agents
${Object.values(persona.routingSuggestions).map(s => `- ${s}`).join('\n')}

${personaRules}`;

  let prompt = `${layer4}\n\n---\n\n${layer1}\n\n---\n\n${layer2}\n\n---\n\n${layer3}`;

  // Dynamic cross-domain knowledge injection
  if (options?.userMessage) {
    const dynamicKnowledge = buildDynamicSystemPrompt(personaKey, options.userMessage);
    if (dynamicKnowledge) {
      prompt += `\n\n---\n\n${dynamicKnowledge}`;
    }
  }

  // Rich handoff context from visualizer (for Marcus)
  if (options?.handoffContext && personaKey === 'quote-specialist') {
    const hc = options.handoffContext;
    let handoffSection = '## Handoff from Design Visualizer\n';

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

    // Quote assistance mode — controls how Marcus discusses pricing
    const qaMode = hc['quoteAssistanceMode'] as string | undefined;
    if (qaMode) {
      handoffSection += `\n### Pricing Discussion Mode: ${qaMode.toUpperCase()}\n`;
      switch (qaMode) {
        case 'none':
          handoffSection += `The contractor prefers NOT to show pricing. Do NOT discuss specific dollar amounts. Say "Your contractor will follow up with specific pricing after reviewing the details."\n`;
          break;
        case 'range':
          handoffSection += `Provide cost ranges aligned with estimates above. Use "typically runs between $X and $Y" with appropriate disclaimers.\n`;
          break;
        case 'estimate':
          handoffSection += `Provide the most accurate estimate possible based on the data above, with clear disclaimers that it's preliminary and subject to site inspection.\n`;
          break;
      }
    }

    prompt += `\n\n---\n\n${handoffSection}`;
  }

  return prompt;
}

/**
 * Build a voice-optimized system prompt for an AI agent.
 * Fetches company config from DB for dynamic tenant branding.
 */
export async function buildVoiceSystemPrompt(
  personaKey: PersonaKey,
  options?: { companyConfig?: CompanyConfig },
): Promise<string> {
  const config = options?.companyConfig ?? await getCompanyConfig();
  const persona = PERSONAS[personaKey];

  const companySummary = buildCompanySummary(config);
  const servicesSummary = buildServicesSummary(config);

  // Use the same knowledge layers but in a more compressed form
  let knowledgeContext = '';
  switch (personaKey) {
    case 'receptionist':
      knowledgeContext = `${companySummary}\n\n${servicesSummary}\n\n${PRICING_SUMMARY}`;
      break;
    case 'quote-specialist':
      knowledgeContext = `${companySummary}\n\n${servicesSummary}\n\n${PRICING_FULL}\n\n${ONTARIO_BUDGET_KNOWLEDGE}`;
      break;
    case 'design-consultant':
      knowledgeContext = `${companySummary}\n\n${servicesSummary}\n\n${ONTARIO_DESIGN_KNOWLEDGE}`;
      break;
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
${persona.capabilities.slice(0, 4).map(c => `- ${c}`).join('\n')}

## Boundaries
${persona.boundaries.slice(0, 3).map(b => `- ${b}`).join('\n')}
---

${knowledgeContext}`;
}

/**
 * Get a persona by key
 */
export function getPersona(personaKey: PersonaKey) {
  return PERSONAS[personaKey];
}
