/**
 * Lead Brief Enrichment API
 *
 * Takes a homeowner's room type, chosen style, and free-text project
 * description captured by the Visualizer widget, and returns 2-4 concise
 * design-intent bullets written for the contractor. Used by the VP Lead
 * Package PDF composer to fill the "Refinement Notes" block, giving the
 * contractor a high-signal summary of what the homeowner actually wants
 * before they pick up the phone.
 *
 * Called from the VP API (`apps/api/src/app/api/widget/leads/route.ts`)
 * via `proxyToConversionOS('/api/ai/lead-brief', body, siteId)`. Auth is
 * handled by the VP proxy + `x-internal-proxy` header validated in
 * `src/proxy.ts` middleware.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@/lib/ai/providers';
import { z } from 'zod';
import { applyRateLimit } from '@/lib/rate-limit';

export const maxDuration = 15;

const requestSchema = z.object({
  roomType: z.string().max(200).optional().nullable(),
  style: z.string().max(200).optional().nullable(),
  projectDescription: z.string().max(2000).optional().nullable(),
  leadName: z.string().max(200).optional().nullable(),
});

const responseSchema = z.object({
  bullets: z
    .array(z.string().min(4).max(240))
    .min(1)
    .max(4)
    .describe('2-4 short design-intent bullets written for the contractor.'),
});

const SYSTEM_PROMPT = `You are a renovation design analyst. A homeowner just submitted a lead through a contractor's website after using an AI visualizer to preview their project. You have the room type, chosen design style, and their free-text notes.

Write 2 to 4 short bullets capturing the homeowner's design intent, targeted at the CONTRACTOR who will call them back. Each bullet should surface one concrete, actionable design fact the contractor can use to prep for the call.

Rules:
- Speak about the homeowner in third person ("They want…", "Their notes emphasise…", "Priority is…").
- No greetings, no closings, no sales pitch, no mention of the visualizer or any software.
- Each bullet is a self-contained fact (no leading dashes, no numbering — the PDF will add them).
- Max 22 words per bullet.
- Canadian spelling (colour, favourite, centre).
- If the project description is empty or vague, infer from the room type + style and say so softly ("Likely...", "Early-stage interest in...").
- Never fabricate measurements, budgets, or materials the homeowner did not mention.
- Never repeat the same bullet in different words.`;

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { roomType, style, projectDescription, leadName } = parsed.data;

  const facts = [
    roomType ? `Room type: ${roomType}` : null,
    style ? `Chosen style: ${style}` : null,
    projectDescription ? `Homeowner notes: ${projectDescription}` : null,
    leadName ? `Homeowner first name: ${leadName.split(/\s+/)[0]}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (!facts) {
    return NextResponse.json({ bullets: [] });
  }

  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: responseSchema,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Write the design-intent bullets for this lead.\n\n${facts}`,
        },
      ],
      maxOutputTokens: 400,
      temperature: 0.3,
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error('[lead-brief] generateObject failed:', error);
    return NextResponse.json(
      { error: 'Lead brief generation failed', bullets: [] },
      { status: 502 },
    );
  }
}
