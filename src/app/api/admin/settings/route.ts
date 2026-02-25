/**
 * Admin Settings API
 * GET/PUT /api/admin/settings - Retrieve and update configurable business settings
 * [DEV-072]
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId, withSiteId } from '@/lib/db/site';
import type { Json } from '@/types/database';

/**
 * GET /api/admin/settings
 * Get all admin settings
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('site_id', getSiteId())
      .order('key');

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Transform to key-value object for easier consumption
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        description: setting.description,
        updatedAt: setting.updated_at,
      };
      return acc;
    }, {} as Record<string, { value: Json; description: string | null; updatedAt: string }>);

    return NextResponse.json({
      success: true,
      data: settingsMap,
      raw: settings,
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Schema for PUT /api/admin/settings
 */
const SettingsUpdateSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.record(z.string(), z.unknown()),
});

/**
 * PUT /api/admin/settings
 * Update a single setting
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = SettingsUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { key, value } = validationResult.data;

    const supabase = createServiceClient();

    // Check if setting exists
    const { data: existingSetting, error: fetchError } = await supabase
      .from('admin_settings')
      .select('id')
      .eq('key', key)
      .eq('site_id', getSiteId())
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking setting:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check setting' },
        { status: 500 }
      );
    }

    if (existingSetting) {
      // Update existing setting
      const { data: updatedSetting, error: updateError } = await supabase
        .from('admin_settings')
        .update({
          value: value as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('key', key)
        .eq('site_id', getSiteId())
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating setting:', updateError);
        return NextResponse.json(
          { error: 'Failed to update setting' },
          { status: 500 }
        );
      }

      // Log the update
      await supabase.from('audit_log').insert(withSiteId({
        action: 'setting_updated',
        new_values: {
          key,
          value: JSON.stringify(value),
        } as Json,
      }));

      // Revalidate all pages so copy/branding changes take effect immediately
      revalidatePath('/', 'layout');

      return NextResponse.json({
        success: true,
        data: updatedSetting,
      });
    } else {
      // Insert new setting
      const { data: newSetting, error: insertError } = await supabase
        .from('admin_settings')
        .insert(withSiteId({
          key,
          value: value as Json,
        }))
        .select('*')
        .single();

      if (insertError) {
        console.error('Error inserting setting:', insertError);
        return NextResponse.json(
          { error: 'Failed to create setting' },
          { status: 500 }
        );
      }

      // Log the creation
      await supabase.from('audit_log').insert(withSiteId({
        action: 'setting_created',
        new_values: {
          key,
          value: JSON.stringify(value),
        } as Json,
      }));

      // Revalidate all pages so copy/branding changes take effect immediately
      revalidatePath('/', 'layout');

      return NextResponse.json({
        success: true,
        data: newSetting,
      });
    }
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Schema for batch update
 */
const BatchSettingsUpdateSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1).max(100),
    value: z.record(z.string(), z.unknown()),
  })),
});

/**
 * PATCH /api/admin/settings
 * Batch update multiple settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = BatchSettingsUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { settings } = validationResult.data;
    const supabase = createServiceClient();

    // Update each setting
    const results = await Promise.all(
      settings.map(async ({ key, value }) => {
        const { data, error } = await supabase
          .from('admin_settings')
          .upsert({
            key,
            value: value as Json,
            updated_at: new Date().toISOString(),
            site_id: getSiteId(),
          }, {
            onConflict: 'site_id,key',
          })
          .select('*')
          .single();

        return { key, data, error };
      })
    );

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Batch update errors:', errors);
      return NextResponse.json(
        { error: 'Some settings failed to update', details: errors },
        { status: 500 }
      );
    }

    // Log the batch update
    await supabase.from('audit_log').insert(withSiteId({
      action: 'settings_batch_updated',
      new_values: {
        keys: settings.map((s) => s.key),
        count: settings.length,
      },
    }));

    // Revalidate all pages so copy/branding changes take effect immediately
    revalidatePath('/', 'layout');

    return NextResponse.json({
      success: true,
      data: results.map((r) => r.data),
    });
  } catch (error) {
    console.error('Batch settings update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
