import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId, withSiteId } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { QuoteDraftUpdate, Json } from '@/types/database';

/**
 * Line item schema
 */
const LineItemSchema = z.object({
  description: z.string().min(1),
  category: z.enum(['materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other']),
  quantity: z.number().positive(),
  unit: z.string(),
  unit_price: z.number().nonnegative(),
  total: z.number().nonnegative(),
  isFromAI: z.boolean().optional(),
  isModified: z.boolean().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  aiReasoning: z.string().optional(),
  transparencyData: z.record(z.string(), z.unknown()).optional(),
  costBeforeMarkup: z.number().nonnegative().optional(),
  markupPercent: z.number().min(0).max(100).optional(),
});

/**
 * Schema for PUT /api/quotes/[leadId]
 */
const QuoteUpdateSchema = z.object({
  line_items: z.array(LineItemSchema),
  assumptions: z.array(z.string()).optional().nullable(),
  exclusions: z.array(z.string()).optional().nullable(),
  special_notes: z.string().optional().nullable(),
  contingency_percent: z.number().min(0).max(50).optional(),
  validity_days: z.number().min(1).max(365).optional(),
  tier_mode: z.enum(['single', 'tiered']).optional(),
  tier_good: z.array(LineItemSchema).optional().nullable(),
  tier_better: z.array(LineItemSchema).optional().nullable(),
  tier_best: z.array(LineItemSchema).optional().nullable(),
});

type RouteContext = { params: Promise<{ leadId: string }> };

// Business constants
const HST_PERCENT = 13;
const DEPOSIT_PERCENT = 15;

/**
 * Calculate quote totals from line items
 */
function calculateTotals(
  lineItems: z.infer<typeof LineItemSchema>[],
  contingencyPercent: number
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const contingencyAmount = subtotal * (contingencyPercent / 100);
  const subtotalWithContingency = subtotal + contingencyAmount;
  const hstAmount = subtotalWithContingency * (HST_PERCENT / 100);
  const total = subtotalWithContingency + hstAmount;
  const depositRequired = total * (DEPOSIT_PERCENT / 100);

  return {
    subtotal,
    contingency_amount: contingencyAmount,
    hst_amount: hstAmount,
    total,
    deposit_required: depositRequired,
  };
}

/**
 * GET /api/quotes/[leadId]
 * Get the quote draft for a lead
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'ai_quote_engine')) {
      return NextResponse.json({ error: 'Quotes require the Accelerate plan or higher' }, { status: 403 });
    }

    const { leadId } = await context.params;

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // First check if lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name, email, project_type, quote_draft_json')
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

    // Get the most recent quote draft for this lead
    const { data: quote, error: quoteError } = await supabase
      .from('quote_drafts')
      .select('*')
      .eq('lead_id', leadId)
      .eq('site_id', getSiteId())
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (quoteError) {
      console.error('Error fetching quote:', quoteError);
      return NextResponse.json(
        { error: 'Failed to fetch quote' },
        { status: 500 }
      );
    }

    // If no quote exists, return empty quote structure
    if (!quote) {
      return NextResponse.json({
        success: true,
        data: null,
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          project_type: lead.project_type,
        },
        // Initial estimate from lead if available
        initialEstimate: lead.quote_draft_json,
      });
    }

    return NextResponse.json({
      success: true,
      data: quote,
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        project_type: lead.project_type,
      },
    });
  } catch (error) {
    console.error('Quote fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/quotes/[leadId]
 * Create or update a quote draft for a lead
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'ai_quote_engine')) {
      return NextResponse.json({ error: 'Quotes require the Accelerate plan or higher' }, { status: 403 });
    }

    const { leadId } = await context.params;

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = QuoteUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      line_items,
      assumptions,
      exclusions,
      special_notes,
      contingency_percent = 10,
      validity_days = 30,
      tier_mode,
      tier_good,
      tier_better,
      tier_best,
    } = validationResult.data;

    const supabase = createServiceClient();

    // Check if lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
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

    // Calculate totals
    const totals = calculateTotals(line_items, contingency_percent);

    // Check for existing quote
    const { data: existingQuote } = await supabase
      .from('quote_drafts')
      .select('id, version')
      .eq('lead_id', leadId)
      .eq('site_id', getSiteId())
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + validity_days * 24 * 60 * 60 * 1000);

    if (existingQuote) {
      // Update existing quote
      const updateData: QuoteDraftUpdate & Record<string, unknown> = {
        line_items: line_items as Json,
        assumptions: assumptions ?? null,
        exclusions: exclusions ?? null,
        special_notes: special_notes ?? null,
        contingency_percent,
        hst_percent: HST_PERCENT,
        deposit_percent: DEPOSIT_PERCENT,
        validity_days,
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
        ...totals,
      };
      // Tier data (JSONB columns — may not be in generated types)
      if (tier_mode) {
        updateData['tier_mode'] = tier_mode;
        updateData['tier_good'] = (tier_good ?? null) as Json;
        updateData['tier_better'] = (tier_better ?? null) as Json;
        updateData['tier_best'] = (tier_best ?? null) as Json;
      }

      const { data: updatedQuote, error: updateError } = await supabase
        .from('quote_drafts')
        .update(updateData)
        .eq('id', existingQuote.id)
        .eq('site_id', getSiteId())
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating quote:', updateError);
        return NextResponse.json(
          { error: 'Failed to update quote' },
          { status: 500 }
        );
      }

      // Log the update
      await supabase.from('audit_log').insert(withSiteId({
        lead_id: leadId,
        action: 'quote_updated',
        new_values: {
          total: totals.total,
          line_items_count: line_items.length,
        },
      }));

      return NextResponse.json({
        success: true,
        data: updatedQuote,
      });
    } else {
      // Create new quote
      const insertData: Record<string, unknown> = {
        lead_id: leadId,
        version: 1,
        line_items: line_items as Json,
        assumptions: assumptions ?? null,
        exclusions: exclusions ?? null,
        special_notes: special_notes ?? null,
        contingency_percent,
        hst_percent: HST_PERCENT,
        deposit_percent: DEPOSIT_PERCENT,
        validity_days,
        expires_at: expiresAt.toISOString(),
        ...totals,
      };
      if (tier_mode) {
        insertData['tier_mode'] = tier_mode;
        insertData['tier_good'] = (tier_good ?? null) as Json;
        insertData['tier_better'] = (tier_better ?? null) as Json;
        insertData['tier_best'] = (tier_best ?? null) as Json;
      }

      const { data: newQuote, error: insertError } = await (supabase
        .from('quote_drafts') as ReturnType<typeof supabase.from>)
        .insert(withSiteId(insertData) as never)
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating quote:', insertError);
        return NextResponse.json(
          { error: 'Failed to create quote' },
          { status: 500 }
        );
      }

      // Update lead status to draft_ready
      await supabase
        .from('leads')
        .update({ status: 'draft_ready', updated_at: now.toISOString() })
        .eq('id', leadId)
        .eq('site_id', getSiteId());

      // Log the creation
      await supabase.from('audit_log').insert(withSiteId({
        lead_id: leadId,
        action: 'quote_created',
        new_values: {
          total: totals.total,
          line_items_count: line_items.length,
        },
      }));

      return NextResponse.json({
        success: true,
        data: newQuote,
      });
    }
  } catch (error) {
    console.error('Quote update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
