import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAIEmail } from '@/lib/ai/email-generation';
import { getBranding } from '@/lib/branding';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

/**
 * Schema for POST /api/quotes/[leadId]/draft-email
 */
const DraftEmailSchema = z.object({
  customerName: z.string(),
  projectType: z.string(),
  quoteTotal: z.number(),
  depositRequired: z.number(),
  lineItemCount: z.number(),
  goalsText: z.string().optional(),
  specialNotes: z.string().optional(),
  isResend: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ leadId: string }> };

/**
 * POST /api/quotes/[leadId]/draft-email
 * Generate an AI-drafted email for a quote
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const tier = await getTier();
    if (!canAccess(tier, 'ai_quote_engine')) {
      return NextResponse.json({ error: 'Email drafting requires the Accelerate plan or higher' }, { status: 403 });
    }

    const { leadId } = await context.params;

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = DraftEmailSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Generate AI email with tenant branding
    const branding = await getBranding();
    const aiEmail = await generateAIEmail({
      customerName: input.customerName,
      projectType: input.projectType,
      quoteTotal: input.quoteTotal,
      depositRequired: input.depositRequired,
      lineItemCount: input.lineItemCount,
      goalsText: input.goalsText,
      specialNotes: input.specialNotes,
      isResend: input.isResend,
    }, branding);

    return NextResponse.json({
      success: true,
      aiEmail,
    });
  } catch (error) {
    console.error('Email draft generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email draft' },
      { status: 500 }
    );
  }
}
