/**
 * Data Extraction
 * Functions for extracting structured lead data from conversations
 */

import { generateObject } from 'ai';
import { openai } from './providers';
import { AI_CONFIG } from './config';
const LEAD_EXTRACTION_PROMPT = `Based on this conversation, extract the following lead information. Only include fields where information was explicitly provided.

Required output format (JSON):
{
  "projectType": "kitchen|bathroom|basement|flooring|painting|exterior|other",
  "scopeDescription": "Detailed description of what the customer wants",
  "areaSqft": number or null,
  "finishLevel": "economy|standard|premium" or null,
  "timeline": "asap|1_3_months|3_6_months|6_plus_months|just_exploring" or null,
  "budgetBand": "under_15k|15k_25k|25k_40k|40k_60k|60k_plus|not_sure" or null,
  "specialRequirements": ["array of special requests"],
  "concernsOrQuestions": ["array of customer concerns"],
  "estimatedCostRange": {
    "low": number,
    "high": number,
    "confidence": number (0-1),
    "breakdown": {
      "materials": number,
      "labor": number,
      "hst": number
    }
  },
  "uncertainties": ["things we're unsure about"],
  "contact": {
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null"
  }
}`;
import {
  LeadExtractionSchema,
  PartialLeadExtractionSchema,
  type LeadExtraction,
  type PartialLeadExtraction,
} from '@/lib/schemas/lead-extraction';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Extract lead data from a conversation
 */
export async function extractLeadData(messages: Message[]): Promise<LeadExtraction> {
  // Format conversation for the prompt
  const conversationText = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.extraction),
      schema: LeadExtractionSchema,
      messages: [
        {
          role: 'system',
          content: LEAD_EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: `Extract lead information from this conversation:\n\n${conversationText}`,
        },
      ],
      maxOutputTokens: AI_CONFIG.parameters.extraction.maxTokens,
      temperature: AI_CONFIG.parameters.extraction.temperature,
    });

    return result.object;
  } catch (error) {
    console.error('Failed to extract lead data:', error);
    throw new Error(
      `Lead extraction failed: ${error instanceof Error ? error.message : 'Unable to extract lead data. Please try again.'}`
    );
  }
}

/**
 * Extract partial lead data (for incomplete conversations)
 */
export async function extractPartialLeadData(
  messages: Message[]
): Promise<PartialLeadExtraction> {
  const conversationText = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.extraction),
      schema: PartialLeadExtractionSchema,
      messages: [
        {
          role: 'system',
          content: `${LEAD_EXTRACTION_PROMPT}

Note: This conversation may be incomplete. Only extract fields where information was explicitly provided. Leave other fields empty.`,
        },
        {
          role: 'user',
          content: `Extract any available lead information from this conversation:\n\n${conversationText}`,
        },
      ],
      maxOutputTokens: AI_CONFIG.parameters.extraction.maxTokens,
      temperature: AI_CONFIG.parameters.extraction.temperature,
    });

    return result.object;
  } catch (error) {
    console.error('Failed to extract partial lead data:', error);
    throw new Error(
      `Partial lead extraction failed: ${error instanceof Error ? error.message : 'Unable to extract data. Please try again.'}`
    );
  }
}

/**
 * Contact info extraction schema
 */
import { z } from 'zod';

const ContactInfoSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

/**
 * Extract contact information specifically
 */
export async function extractContactInfo(messages: Message[]): Promise<{
  name: string | null;
  email: string | null;
  phone: string | null;
}> {
  const conversationText = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.chat),
      schema: ContactInfoSchema,
      messages: [
        {
          role: 'user',
          content: `Extract the customer's contact information (name, email, phone) from this conversation. Return null for any information not provided:\n\n${conversationText}`,
        },
      ],
      maxOutputTokens: 200,
      temperature: 0.1,
    });

    return result.object;
  } catch (error) {
    console.error('Failed to extract contact info:', error);
    return { name: null, email: null, phone: null };
  }
}

/**
 * Determine conversation completeness
 */
export function assessConversationCompleteness(data: PartialLeadExtraction): {
  isComplete: boolean;
  missingFields: string[];
  completenessScore: number;
} {
  const requiredFields = [
    'projectType',
    'scopeDescription',
  ];

  const desiredFields = [
    'areaSqft',
    'finishLevel',
    'timeline',
  ];

  const missingRequired = requiredFields.filter(
    (field) => !data[field as keyof PartialLeadExtraction]
  );
  const missingDesired = desiredFields.filter(
    (field) => !data[field as keyof PartialLeadExtraction]
  );
  const hasContact = !!(data.contact?.name || data.contact?.email || data.contact?.phone);

  // Calculate completeness score (0-1)
  const requiredScore = (requiredFields.length - missingRequired.length) / requiredFields.length;
  const desiredScore = (desiredFields.length - missingDesired.length) / desiredFields.length;
  const contactScore = hasContact ? 1 : 0;

  // Weighted: 50% required, 30% desired, 20% contact
  const completenessScore = requiredScore * 0.5 + desiredScore * 0.3 + contactScore * 0.2;

  const missingFields = [
    ...missingRequired,
    ...missingDesired,
    ...(hasContact ? [] : ['contact information']),
  ];

  return {
    isComplete: missingRequired.length === 0 && hasContact,
    missingFields,
    completenessScore,
  };
}
