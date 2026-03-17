#!/usr/bin/env node
/**
 * Fix tenants with unregistered custom sections.
 *
 * For bespoke tenants whose custom:* sections aren't in the deploy repo's
 * section registry, replace them with standard section equivalents.
 * The hero is already hero:visualizer-teardown from the retrofit.
 *
 * Mapping: custom:*-services → services:grid-3-cards
 *          custom:*-why-us → about:values-cards
 *          custom:*-about → about:split-image-copy
 *          custom:*-process → misc:process-steps
 *          custom:*-testimonials → testimonials:cards-carousel
 *          custom:*-gallery → gallery:masonry-grid
 *          custom:*-footer → (removed — standard footer renders from layout.tsx)
 *          custom:*-intro-* → (removed)
 *          custom:*-contact-* → contact:form-with-map
 *          custom:*-trust-* → trust:badge-strip
 *          custom:*-featured-* → gallery:editorial-featured
 *          custom:*-team-* → about:team-grid
 *          custom:*-seen-on-* → (removed)
 */

import { loadEnv, requireEnv } from '../lib/env-loader.mjs';
import { getSupabase } from '../lib/supabase-client.mjs';

loadEnv();
requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const dryRun = process.argv.includes('--dry-run');
const sb = getSupabase();

/** Map custom section pattern → standard replacement (null = remove) */
function mapCustomSection(sectionId) {
  if (!sectionId.startsWith('custom:')) return sectionId;

  const lower = sectionId.toLowerCase();
  if (lower.includes('-services')) return 'services:grid-3-cards';
  if (lower.includes('-why-us') || lower.includes('-why_us')) return 'about:values-cards';
  if (lower.includes('-about')) return 'about:split-image-copy';
  if (lower.includes('-process')) return 'misc:process-steps';
  if (lower.includes('-testimonial')) return 'testimonials:cards-carousel';
  if (lower.includes('-gallery')) return 'gallery:masonry-grid';
  if (lower.includes('-footer')) return null; // standard footer renders from layout.tsx
  if (lower.includes('-intro')) return null;
  if (lower.includes('-contact')) return 'contact:form-simple';
  if (lower.includes('-trust')) return 'trust:badge-strip';
  if (lower.includes('-featured') || lower.includes('-project')) return 'gallery:editorial-featured';
  if (lower.includes('-team')) return 'about:team-grid';
  if (lower.includes('-seen-on') || lower.includes('-tv')) return null;
  if (lower.includes('-hero')) return 'hero:visualizer-teardown'; // shouldn't happen but safety

  // Unknown custom section — keep it (might be properly registered)
  console.log(`  ⚠ Unknown custom section: ${sectionId}`);
  return sectionId;
}

async function main() {
  console.log(`\n🔧 Fixing broken custom section layouts${dryRun ? ' (DRY RUN)' : ''}...\n`);

  const { data: rows, error } = await sb
    .from('admin_settings')
    .select('id, site_id, value')
    .eq('key', 'page_layouts');

  if (error) {
    console.error('Failed to fetch:', error.message);
    process.exit(1);
  }

  let fixed = 0;
  let skipped = 0;

  for (const row of rows) {
    const layouts = row.value;
    if (!layouts || typeof layouts !== 'object') { skipped++; continue; }

    let hasCustom = false;
    for (const sections of Object.values(layouts)) {
      if (Array.isArray(sections) && sections.some(s => s.startsWith('custom:'))) {
        hasCustom = true;
        break;
      }
    }

    if (!hasCustom) { skipped++; continue; }

    let changed = false;
    const newLayouts = { ...layouts };

    for (const [page, sections] of Object.entries(newLayouts)) {
      if (!Array.isArray(sections)) continue;

      const mapped = sections
        .map(s => mapCustomSection(s))
        .filter(s => s !== null);

      // Deduplicate
      const seen = new Set();
      const deduped = mapped.filter(s => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });

      if (JSON.stringify(deduped) !== JSON.stringify(sections)) {
        changed = true;
        newLayouts[page] = deduped;
      }
    }

    if (!changed) { skipped++; continue; }

    if (dryRun) {
      console.log(`  📋 ${row.site_id}:`);
      console.log(`     old homepage: ${JSON.stringify(layouts.homepage)}`);
      console.log(`     new homepage: ${JSON.stringify(newLayouts.homepage)}`);
      fixed++;
      continue;
    }

    const { error: updateError } = await sb
      .from('admin_settings')
      .update({ value: newLayouts })
      .eq('id', row.id);

    if (updateError) {
      console.error(`  ✗ ${row.site_id}: ${updateError.message}`);
    } else {
      console.log(`  ✓ ${row.site_id}: custom sections → standard`);
      fixed++;
    }
  }

  console.log(`\n${dryRun ? 'Would fix' : 'Fixed'}: ${fixed} | Skipped: ${skipped} | Total: ${rows.length}\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
