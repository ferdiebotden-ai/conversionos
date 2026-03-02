/**
 * Contractor Lead Intake API
 * Two actions:
 *   - action: 'extract' — AI extraction from raw input (returns structured fields)
 *   - action: 'create'  — Creates a lead from contractor intake
 *
 * Gated behind contractor_lead_intake entitlement.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import { extractIntakeFields } from '@/lib/ai/intake-extraction';
import { IntakeRequestSchema } from '@/lib/schemas/intake';
import type { Json } from '@/types/database';

/** Schema for the extract action. */
const ExtractActionSchema = z.object({
  action: z.literal('extract'),
  rawInput: z.string().min(5),
});

/** Schema for the create action (extends IntakeRequestSchema with action field). */
const CreateActionSchema = IntakeRequestSchema.extend({
  action: z.literal('create'),
});

/** Combined discriminated union. */
const RequestSchema = z.discriminatedUnion('action', [
  ExtractActionSchema,
  CreateActionSchema,
]);

export async function POST(request: Request) {
  // Entitlement check
  const tier = await getTier();
  if (!canAccess(tier, 'contractor_lead_intake')) {
    return NextResponse.json(
      { error: 'Contractor lead intake is not available on your plan.' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // ─── Extract action ─────────────────────────────────────────
    if (data.action === 'extract') {
      const extraction = await extractIntakeFields(data.rawInput);
      return NextResponse.json({ extraction });
    }

    // ─── Create action ──────────────────────────────────────────
    const supabase = createServiceClient();
    const siteId = await getSiteIdAsync();

    // Build lead record
    const leadData: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      project_type: data.projectType || null,
      area_sqft: data.areaSqft || null,
      finish_level: data.finishLevel || null,
      timeline: data.timeline || null,
      budget_band: data.budgetBand || null,
      goals_text: data.goalsText || null,
      source: 'contractor_intake',
      created_by: 'contractor',
      intake_method: data.intakeMethod,
      intake_raw_input: data.rawInput || null,
      status: 'new',
    };

    // Insert lead (use `as any` since new columns may not be in generated types)
    const { data: lead, error } = await (supabase.from('leads') as ReturnType<typeof supabase.from>)
      .insert(withSiteId(leadData as Record<string, unknown> & { site_id?: string }, siteId))
      .select('id, status, created_at')
      .single() as { data: { id: string; status: string; created_at: string } | null; error: { message: string; code?: string | undefined } | null };

    if (error || !lead) {
      console.error('Error creating intake lead:', error);
      return NextResponse.json(
        { error: 'An unexpected error occurred. Please try again.' },
        { status: 500 },
      );
    }

    // Attempt AI quote generation if enough data (non-blocking)
    if (data.projectType && data.goalsText && canAccess(tier, 'ai_quote_engine')) {
      try {
        // Fetch contractor prices for AI prompt injection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contractor_prices not in generated types
        const { data: contractorPrices } = await (supabase as any).from('contractor_prices')
          .select('*')
          .eq('site_id', siteId);

        const { generateAIQuote, convertAIQuoteToLineItems, calculateAIQuoteTotals } = await import('@/lib/ai/quote-generation');
        const aiQuote = await generateAIQuote({
          projectType: data.projectType,
          areaSqft: data.areaSqft,
          finishLevel: data.finishLevel,
          goalsText: data.goalsText,
          city: data.city || 'Ontario',
          province: 'ON',
        }, undefined, contractorPrices ?? []);

        const aiTotals = calculateAIQuoteTotals(aiQuote);
        const quoteDraftJson = {
          aiQuote,
          aiLineItems: convertAIQuoteToLineItems(aiQuote),
          aiTotals,
        };

        await (supabase.from('leads') as ReturnType<typeof supabase.from>)
          .update({ quote_draft_json: quoteDraftJson as unknown as Json, status: 'draft_ready' })
          .eq('id', lead.id)
          .eq('site_id', siteId);
      } catch (quoteError) {
        // Non-fatal — lead is created, quote gen is optional
        console.error('AI quote generation failed for intake lead:', quoteError);
      }
    }

    // Audit log
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: lead.id,
      action: 'lead_created_intake',
      new_values: {
        source: 'contractor_intake',
        intake_method: data.intakeMethod,
        project_type: data.projectType || null,
        has_raw_input: !!data.rawInput,
      } as Json,
    }, siteId));

    return NextResponse.json({
      success: true,
      leadId: lead.id,
    });
  } catch (error) {
    console.error('Intake API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
