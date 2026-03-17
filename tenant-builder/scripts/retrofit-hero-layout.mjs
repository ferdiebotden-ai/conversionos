#!/usr/bin/env node
/**
 * Retrofit all existing tenant page_layouts to use hero:visualizer-teardown.
 *
 * For every tenant in admin_settings that has page_layouts with
 * hero:full-bleed-overlay, replaces it with hero:visualizer-teardown
 * and removes misc:visualizer-teaser (now embedded in the hero).
 *
 * Usage:
 *   node tenant-builder/scripts/retrofit-hero-layout.mjs [--dry-run]
 */

import { loadEnv, requireEnv } from '../lib/env-loader.mjs';
import { getSupabase } from '../lib/supabase-client.mjs';

loadEnv();
requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const dryRun = process.argv.includes('--dry-run');
const sb = getSupabase();

async function main() {
  console.log(`\n🔄 Retrofitting tenant hero layouts${dryRun ? ' (DRY RUN)' : ''}...\n`);

  // Fetch all page_layouts rows
  const { data: rows, error } = await sb
    .from('admin_settings')
    .select('id, site_id, value')
    .eq('key', 'page_layouts');

  if (error) {
    console.error('Failed to fetch page_layouts:', error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('No page_layouts rows found.');
    return;
  }

  console.log(`Found ${rows.length} tenants with page_layouts.\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const layouts = row.value;
    if (!layouts || typeof layouts !== 'object') {
      console.log(`  ⏭ ${row.site_id}: no valid layout object`);
      skipped++;
      continue;
    }

    let changed = false;
    const newLayouts = { ...layouts };

    for (const [page, sections] of Object.entries(newLayouts)) {
      if (!Array.isArray(sections)) continue;

      const newSections = sections
        .map(s => {
          // Replace any hero section (standard or custom) with visualizer-teardown on homepage
          if (page === 'homepage') {
            if (s === 'hero:full-bleed-overlay' || s === 'hero:visualizer-showcase' ||
                s === 'hero:split-image-text' || s === 'hero:editorial-centered' ||
                s === 'hero:video-background' || s === 'hero:gradient-text' ||
                (s.startsWith('custom:') && (s.includes('-hero') || s.includes('hero-')))) {
              changed = true;
              return 'hero:visualizer-teardown';
            }
          }
          return s;
        })
        .filter(s => {
          if (s === 'misc:visualizer-teaser') {
            // Remove from homepage (already in the hero now)
            if (page === 'homepage') {
              changed = true;
              return false;
            }
          }
          return true;
        });

      // Deduplicate (in case hero:visualizer-teardown was already there)
      const seen = new Set();
      newLayouts[page] = newSections.filter(s => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });
    }

    if (!changed) {
      // Check if already using visualizer-teardown
      const homepage = layouts.homepage || [];
      if (homepage.includes('hero:visualizer-teardown')) {
        console.log(`  ✓ ${row.site_id}: already using visualizer-teardown`);
      } else {
        console.log(`  ⏭ ${row.site_id}: no hero:full-bleed-overlay found (custom layout?)`);
      }
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  📋 ${row.site_id}: would update homepage to:`, newLayouts.homepage);
      updated++;
      continue;
    }

    const { error: updateError } = await sb
      .from('admin_settings')
      .update({ value: newLayouts })
      .eq('id', row.id);

    if (updateError) {
      console.error(`  ✗ ${row.site_id}: update failed:`, updateError.message);
    } else {
      console.log(`  ✓ ${row.site_id}: updated → hero:visualizer-teardown`);
      updated++;
    }
  }

  console.log(`\n${dryRun ? 'Would update' : 'Updated'}: ${updated} | Skipped: ${skipped} | Total: ${rows.length}\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
