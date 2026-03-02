import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import type { LeadStatus, LeadUpdate } from '@/types/database';

/**
 * Schema for PATCH /api/leads/[id]
 */
const LeadUpdateSchema = z.object({
  status: z.enum(['new', 'draft_ready', 'needs_clarification', 'sent', 'won', 'lost']).optional(),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  city: z.string().optional(),
  province: z.string().optional(),
  owner_notes: z.string().optional().nullable(),
  follow_up_date: z.string().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/leads/[id]
 * Get a single lead by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const siteId = await getSiteIdAsync();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('site_id', siteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching lead:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Lead fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leads/[id]
 * Update a lead by ID
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const siteId = await getSiteIdAsync();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = LeadUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;
    const supabase = createServiceClient();

    // First get the current lead for audit logging
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('site_id', siteId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching lead:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch lead' },
        { status: 500 }
      );
    }

    // Build update object - only include defined fields
    const leadUpdate: LeadUpdate = {
      updated_at: new Date().toISOString(),
    };

    // Only add fields that are explicitly provided
    if (updateData.status !== undefined) {
      leadUpdate.status = updateData.status as LeadStatus;
    }
    if (updateData.name !== undefined) {
      leadUpdate.name = updateData.name;
    }
    if (updateData.email !== undefined) {
      leadUpdate.email = updateData.email;
    }
    if (updateData.phone !== undefined) {
      leadUpdate.phone = updateData.phone;
    }
    if (updateData.address !== undefined) {
      leadUpdate.address = updateData.address;
    }
    if (updateData.postal_code !== undefined) {
      leadUpdate.postal_code = updateData.postal_code;
    }
    if (updateData.city !== undefined) {
      leadUpdate.city = updateData.city;
    }
    if (updateData.province !== undefined) {
      leadUpdate.province = updateData.province;
    }
    if (updateData.owner_notes !== undefined) {
      leadUpdate.owner_notes = updateData.owner_notes;
    }
    if (updateData.follow_up_date !== undefined) {
      leadUpdate.follow_up_date = updateData.follow_up_date;
    }

    // Update last_contacted_at if status is changing to sent
    if (updateData.status === 'sent' && existingLead.status !== 'sent') {
      leadUpdate.last_contacted_at = new Date().toISOString();
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(leadUpdate)
      .eq('id', id)
      .eq('site_id', siteId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return NextResponse.json(
        { error: 'Failed to update lead' },
        { status: 500 }
      );
    }

    // Log the update
    await supabase.from('audit_log').insert(withSiteId({
      lead_id: id,
      action: 'lead_updated',
      old_values: existingLead,
      new_values: updatedLead,
    }, siteId));

    return NextResponse.json({
      success: true,
      data: updatedLead,
    });
  } catch (error) {
    console.error('Lead update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/[id]
 * Soft-delete a lead by marking it as lost
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const siteId = await getSiteIdAsync();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Soft delete — mark as lost
    const { data, error } = await supabase
      .from('leads')
      .update({ status: 'lost' as LeadStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('site_id', siteId)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      console.error('Error deleting lead:', error);
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Lead delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
