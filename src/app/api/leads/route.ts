import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import { calculateEstimate } from '@/lib/pricing/engine';
import { generateAIQuote, convertAIQuoteToLineItems, calculateAIQuoteTotals } from '@/lib/ai/quote-generation';
import { sendEmail, getOwnerEmail } from '@/lib/email/resend';
import { LeadConfirmationEmail } from '@/emails/lead-confirmation';
import { NewLeadNotificationEmail } from '@/emails/new-lead-notification';
import { getBranding } from '@/lib/branding';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import { applyRateLimit } from '@/lib/rate-limit';
import type { LeadStatus, ProjectType, FinishLevel, Timeline, BudgetBand, Json } from '@/types/database';

/**
 * Escape PostgREST special characters in user search input.
 */
function escapePostgREST(input: string): string {
  return input.replace(/[,()%_\\*]/g, (ch) => `\\${ch}`);
}

/**
 * Query params schema for GET /api/leads
 */
const LeadsQuerySchema = z.object({
  status: z.enum(['new', 'draft_ready', 'needs_clarification', 'sent', 'won', 'lost']).optional(),
  projectType: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'other']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['created_at', 'name', 'updated_at']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
});

/**
 * GET /api/leads
 * List leads with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const siteId = await getSiteIdAsync();
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const validationResult = LeadsQuerySchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status, projectType, search, sortBy, sortOrder, page, limit } = validationResult.data;
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId);

    // Apply filters
    if (status) {
      query = query.eq('status', status as LeadStatus);
    }
    if (projectType) {
      query = query.eq('project_type', projectType as ProjectType);
    }

    // Apply search (name, email, phone) — escape PostgREST special characters
    if (search) {
      const safe = escapePostgREST(search);
      query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: leads, error, count } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error('Leads fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Lead submission schema
 */
const LeadSubmissionSchema = z.object({
  // Required contact info
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),

  // Project details
  projectType: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'other']),
  areaSqft: z.number().positive().optional(),
  finishLevel: z.enum(['economy', 'standard', 'premium']).optional(),
  timeline: z.enum(['asap', '1_3_months', '3_6_months', '6_plus_months', 'just_exploring']).optional(),
  budgetBand: z.enum(['under_15k', '15k_25k', '25k_40k', '40k_60k', '60k_plus', 'not_sure']).optional(),
  goalsText: z.string().max(2000).optional(),

  // AI-generated data
  chatTranscript: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
  scopeJson: z.record(z.string(), z.unknown()).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  aiNotes: z.string().optional(),

  // Files
  uploadedPhotos: z.array(z.string()).optional(),

  // Tracking
  sessionId: z.string().uuid().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),

  // Visualization link (from visualizer flow)
  visualizationId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  try {
    const siteId = await getSiteIdAsync();
    const body = await request.json();

    // Validate input
    const validationResult = LeadSubmissionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const tier = await getTier();
    const hasQuoteEngine = canAccess(tier, 'ai_quote_engine');

    // Calculate basic estimate for range display
    let quoteDraftJson = null;
    let aiGeneratedQuote = null;

    if (data.projectType && (data.projectType === 'kitchen' || data.projectType === 'bathroom' || data.projectType === 'basement' || data.projectType === 'flooring')) {
      // Calculate basic estimate for email notifications
      const estimate = calculateEstimate({
        projectType: data.projectType,
        areaSqft: data.areaSqft,
        finishLevel: data.finishLevel,
      });

      quoteDraftJson = {
        estimateLow: estimate.low,
        estimateHigh: estimate.high,
        breakdown: estimate.breakdown,
        confidence: estimate.confidence,
        notes: estimate.notes,
      };

      // Generate AI-powered detailed quote with line items (Accelerate+ only)
      if (hasQuoteEngine) {
        try {
          // Fetch contractor prices for AI prompt injection
          const priceClient = createServiceClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contractor_prices not in generated types
          const { data: contractorPrices } = await (priceClient as any).from('contractor_prices')
            .select('*')
            .eq('site_id', siteId);

          aiGeneratedQuote = await generateAIQuote({
            projectType: data.projectType,
            areaSqft: data.areaSqft,
            finishLevel: data.finishLevel,
            chatTranscript: data.chatTranscript,
            goalsText: data.goalsText,
            city: 'Ontario', // Default for now
            province: 'ON',
          }, undefined, contractorPrices ?? []);

          // Add AI quote data to the draft JSON
          const aiTotals = calculateAIQuoteTotals(aiGeneratedQuote);
          quoteDraftJson = {
            ...quoteDraftJson,
            aiQuote: aiGeneratedQuote,
            aiLineItems: convertAIQuoteToLineItems(aiGeneratedQuote),
            aiTotals,
          };
        } catch (aiError) {
          // Log but don't fail - the basic estimate is still valuable
          console.error('AI quote generation failed, using basic estimate:', aiError);
        }
      }
    }

    // Create lead record
    const leadData = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      postal_code: data.postalCode || null,
      project_type: data.projectType as ProjectType,
      area_sqft: data.areaSqft || null,
      finish_level: (data.finishLevel as FinishLevel) || null,
      timeline: (data.timeline as Timeline) || null,
      budget_band: (data.budgetBand as BudgetBand) || null,
      goals_text: data.goalsText || null,
      chat_transcript: (data.chatTranscript || null) as Json,
      scope_json: (data.scopeJson || null) as Json,
      quote_draft_json: quoteDraftJson as Json,
      confidence_score: data.confidenceScore || null,
      ai_notes: data.aiNotes || null,
      uploaded_photos: data.uploadedPhotos || null,
      session_id: data.sessionId || null,
      utm_source: data.utmSource || null,
      utm_medium: data.utmMedium || null,
      utm_campaign: data.utmCampaign || null,
      status: (quoteDraftJson ? 'draft_ready' : 'new') as LeadStatus,
      source: (data.visualizationId ? 'ai_chat' : 'chat_no_photo') as string,
    };

    // Insert into database
    const supabase = createServiceClient();
    const { data: lead, error } = await supabase
      .from('leads')
      .insert(withSiteId(leadData, siteId))
      .select('id, status, created_at')
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { error: 'An unexpected error occurred. Please try again.' },
        { status: 500 }
      );
    }

    // Update chat session if provided
    if (data.sessionId) {
      await supabase
        .from('chat_sessions')
        .update({
          state: 'completed',
          extracted_data: {
            leadId: lead.id,
            projectType: data.projectType,
            estimate: quoteDraftJson,
          } as Json,
        })
        .eq('id', data.sessionId)
        .eq('site_id', siteId);
    }

    // Link visualization to lead if provided
    if (data.visualizationId) {
      // Direct FK link on visualizations table
      const { error: vizError } = await supabase
        .from('visualizations')
        .update({ lead_id: lead.id })
        .eq('id', data.visualizationId)
        .eq('site_id', siteId);

      if (vizError) {
        console.error('Failed to link visualization to lead:', vizError);
      }

      // Also create join table entry with is_primary flag via RPC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase.rpc as any)('link_visualization_to_lead', {
        p_lead_id: lead.id,
        p_visualization_id: data.visualizationId,
        p_is_primary: true,
        p_admin_selected: false,
        p_site_id: siteId,
      });

      if (rpcError) {
        console.error('Failed to link visualization via RPC:', rpcError);
        // Non-fatal — the direct FK link above is the primary mechanism
      }
    }

    // Log the action
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: lead.id,
      action: 'lead_created',
      new_values: {
        source: 'ai_chat',
        project_type: data.projectType,
        has_estimate: !!quoteDraftJson,
        has_ai_quote: !!aiGeneratedQuote,
        ai_confidence: aiGeneratedQuote?.overallConfidence,
      },
    }, siteId));

    // Send email notifications (don't block on these)
    const branding = await getBranding();
    const emailPromises: Promise<unknown>[] = [];

    // Customer confirmation email
    emailPromises.push(
      sendEmail({
        to: data.email,
        subject: `Thanks for your ${data.projectType} renovation inquiry - ${branding.name}`,
        react: LeadConfirmationEmail({
          customerName: data.name,
          projectType: data.projectType,
          estimateLow: quoteDraftJson?.estimateLow,
          estimateHigh: quoteDraftJson?.estimateHigh,
          branding,
        }),
      }).catch((err) => {
        console.error('Failed to send customer confirmation email:', err);
      })
    );

    // Owner notification email
    emailPromises.push(
      sendEmail({
        to: getOwnerEmail(),
        subject: `New ${data.projectType} Lead: ${data.name}`,
        react: NewLeadNotificationEmail({
          leadId: lead.id,
          customerName: data.name,
          customerEmail: data.email,
          customerPhone: data.phone,
          projectType: data.projectType,
          estimateLow: quoteDraftJson?.estimateLow,
          estimateHigh: quoteDraftJson?.estimateHigh,
          timeline: data.timeline,
          goalsText: data.goalsText,
          hasPhotos: (data.uploadedPhotos?.length ?? 0) > 0,
          confidenceScore: data.confidenceScore,
          tier,
          primaryColor: branding.primaryColor,
        }),
        replyTo: data.email,
      }).catch((err) => {
        console.error('Failed to send owner notification email:', err);
      })
    );

    // Wait for emails but don't fail the request if they fail
    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      status: lead.status,
      hasEstimate: !!quoteDraftJson,
    });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
