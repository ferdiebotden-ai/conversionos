import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId, withSiteId } from '@/lib/db/site';
import { regenerateAIQuote, generateAIQuote } from '@/lib/ai/quote-generation';
import type { QuoteGenerationInput } from '@/lib/schemas/ai-quote';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { Json } from '@/types/database';
import { DEFAULT_CATEGORY_MARKUPS, type CategoryMarkupsConfig } from '@/lib/pricing/category-markups';

/**
 * Schema for POST /api/quotes/[leadId]/regenerate
 */
const RegenerateSchema = z.object({
  guidance: z.string().max(1000).optional(),
});

type RouteContext = { params: Promise<{ leadId: string }> };

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * POST /api/quotes/[leadId]/regenerate
 * Regenerate AI quote for a lead with optional admin guidance
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'ai_quote_engine')) {
      return NextResponse.json({ error: 'Quote regeneration requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { leadId } = await context.params;

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = RegenerateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { guidance } = validationResult.data;

    const supabase = createServiceClient();

    // Fetch the lead with all needed data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('site_id', getSiteId())
      .single();

    if (leadError) {
      if (leadError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching lead:', leadError);
      return NextResponse.json(
        { error: 'Failed to fetch lead' },
        { status: 500 }
      );
    }

    // Check if we have enough data to regenerate
    if (!lead.project_type) {
      return NextResponse.json(
        { error: 'Lead does not have a project type specified' },
        { status: 400 }
      );
    }

    // Build quote generation input
    const quoteInput: QuoteGenerationInput = {
      projectType: lead.project_type as 'kitchen' | 'bathroom' | 'basement' | 'flooring' | 'painting' | 'exterior' | 'other',
      areaSqft: lead.area_sqft ?? undefined,
      finishLevel: lead.finish_level as 'economy' | 'standard' | 'premium' | undefined,
      chatTranscript: (lead.chat_transcript as ChatMessage[] | null) ?? undefined,
      goalsText: lead.goals_text ?? undefined,
      city: lead.city ?? 'Ontario',
      province: lead.province ?? 'ON',
    };

    // Fetch category markups from admin_settings
    const { data: markupsRow } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'category_markups')
      .eq('site_id', getSiteId())
      .maybeSingle();
    const markups: CategoryMarkupsConfig = (markupsRow?.value as unknown as CategoryMarkupsConfig) || DEFAULT_CATEGORY_MARKUPS;

    // Fetch contractor prices for AI prompt injection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contractor_prices not in generated types
    const { data: contractorPrices } = await (supabase as any).from('contractor_prices')
      .select('*')
      .eq('site_id', getSiteId());

    // Fetch concept pricing from visualization for richer AI context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- concept_pricing not in generated types
    const { data: vizRows } = await (supabase as any)
      .from('visualizations')
      .select('concept_pricing')
      .eq('lead_id', leadId)
      .eq('site_id', getSiteId())
      .order('created_at', { ascending: false })
      .limit(1);

    const conceptPricingRaw = vizRows?.[0]?.concept_pricing;
    if (conceptPricingRaw && typeof conceptPricingRaw === 'object') {
      quoteInput.conceptPricing = {
        identifiedMaterials: Array.isArray(conceptPricingRaw.identifiedMaterials)
          ? conceptPricingRaw.identifiedMaterials
          : [],
        inferredFinishLevel: conceptPricingRaw.inferredFinishLevel || 'standard',
        materialCostRange: conceptPricingRaw.materialCostRange || { low: 0, high: 0 },
        labourCostRange: conceptPricingRaw.labourCostRange || { low: 0, high: 0 },
        totalEstimate: conceptPricingRaw.totalEstimate || { low: 0, high: 0 },
        visibleChanges: Array.isArray(conceptPricingRaw.visibleChanges)
          ? conceptPricingRaw.visibleChanges
          : [],
      };
    }

    // Generate new AI quote
    let aiQuote;
    if (guidance) {
      aiQuote = await regenerateAIQuote(quoteInput, guidance, markups, contractorPrices ?? []);
    } else {
      aiQuote = await generateAIQuote(quoteInput, markups, contractorPrices ?? []);
    }

    // Update the lead's quote_draft_json with the new AI quote
    const existingDraftJson = (lead.quote_draft_json as Record<string, unknown>) || {};
    const updatedDraftJson = {
      ...existingDraftJson,
      aiQuote,
      regeneratedAt: new Date().toISOString(),
      regenerationGuidance: guidance || null,
    };

    const { error: updateError } = await supabase
      .from('leads')
      .update({
        quote_draft_json: updatedDraftJson as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .eq('site_id', getSiteId());

    if (updateError) {
      console.error('Error updating lead with regenerated quote:', updateError);
      return NextResponse.json(
        { error: 'Failed to save regenerated quote' },
        { status: 500 }
      );
    }

    // Log the regeneration
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: leadId,
      action: 'ai_quote_regenerated',
      new_values: {
        has_guidance: !!guidance,
        line_items_count: aiQuote.lineItems.length,
        overall_confidence: aiQuote.overallConfidence,
      },
    }));

    return NextResponse.json({
      success: true,
      aiQuote,
    });
  } catch (error) {
    console.error('Quote regeneration error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate quote. Please try again.' },
      { status: 500 }
    );
  }
}
