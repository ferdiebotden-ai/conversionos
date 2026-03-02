#!/usr/bin/env node
/**
 * Data Gap Resolution — automatically fix data gaps found by page-completeness.
 *
 * Reads page-completeness.json + scraped.json, identifies fixable gaps,
 * applies fixes to Supabase admin_settings, and re-runs page-completeness
 * to verify resolution.
 *
 * Fixable gaps:
 *   - Social links exist in scraped data but not in branding.socials
 *   - Business hours contain "N/A" — clear the field
 *   - Favicon missing — set faviconUrl from logo URL if available
 *   - OG image missing — set ogImageUrl from scraped/generated data
 *
 * Usage:
 *   node qa/data-gap-resolution.mjs --site-id example --url https://example.norbotsystems.com --results-dir ./results/
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from '../lib/env-loader.mjs';
import { getSupabase } from '../lib/supabase-client.mjs';
import * as logger from '../lib/logger.mjs';

loadEnv();

const MAX_FIX_ATTEMPTS = 2;

const SOCIAL_MAP = {
  social_facebook: 'Facebook',
  social_instagram: 'Instagram',
  social_houzz: 'Houzz',
  social_google: 'Google',
  social_twitter: 'X',
  social_linkedin: 'LinkedIn',
  social_youtube: 'YouTube',
  social_tiktok: 'TikTok',
  social_pinterest: 'Pinterest',
};

/**
 * Read a JSON file safely.
 */
function readJson(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Identify fixable data gaps from page-completeness results + scraped data.
 */
function identifyGaps(pageCompleteness, scrapedData) {
  const gaps = [];
  if (!pageCompleteness?.checks) return gaps;

  const failedChecks = pageCompleteness.checks.filter(c => !c.passed);

  for (const check of failedChecks) {
    // Social links missing in footer
    if (check.check === 'social_links' && check.page === '/footer') {
      const scrapedSocials = scrapedData
        ? Object.entries(SOCIAL_MAP).filter(([key]) => scrapedData[key])
        : [];
      if (scrapedSocials.length > 0) {
        gaps.push({
          type: 'social_links',
          fix: 'update_branding_socials',
          detail: `${scrapedSocials.length} social link(s) in scraped data but not in branding`,
          data: scrapedSocials.map(([key, label]) => ({ label, href: scrapedData[key] })),
        });
      }
    }

    // Business hours N/A on contact page
    if (check.check === 'no_na_text' && check.page === '/contact') {
      gaps.push({
        type: 'business_hours_na',
        fix: 'clear_business_hours',
        detail: 'Contact page shows literal N/A — clear business hours',
      });
    }

    // Favicon missing (homepage)
    if (check.check === 'favicon' || (check.check === 'has_headline' && check.detail?.includes('favicon'))) {
      gaps.push({
        type: 'favicon_missing',
        fix: 'set_favicon_from_logo',
        detail: 'No favicon — will set from logo URL if available',
      });
    }
  }

  // Check scraped data for social links even if page-completeness didn't flag it
  // (footer check might pass with partial socials)
  if (scrapedData) {
    const scrapedSocials = Object.entries(SOCIAL_MAP).filter(([key]) => scrapedData[key]);
    if (scrapedSocials.length > 0 && !gaps.find(g => g.type === 'social_links')) {
      // Check if branding already has them — we'll verify in applyFixes
      gaps.push({
        type: 'social_links_verify',
        fix: 'verify_branding_socials',
        detail: `Verify ${scrapedSocials.length} scraped social link(s) are in branding`,
        data: scrapedSocials.map(([key, label]) => ({ label, href: scrapedData[key] })),
      });
    }
  }

  return gaps;
}

/**
 * Apply data-gap fixes to Supabase admin_settings.
 * @returns {Promise<Array<{ fix: string, success: boolean, detail: string }>>}
 */
async function applyFixes(siteId, gaps) {
  const sb = getSupabase();
  const applied = [];

  for (const gap of gaps) {
    try {
      switch (gap.fix) {
        case 'update_branding_socials':
        case 'verify_branding_socials': {
          // Read current branding
          const { data: brandingRow } = await sb
            .from('admin_settings')
            .select('value')
            .eq('site_id', siteId)
            .eq('key', 'branding')
            .single();

          if (!brandingRow?.value) {
            applied.push({ fix: gap.type, success: false, detail: 'No branding row found' });
            break;
          }

          const branding = typeof brandingRow.value === 'string'
            ? JSON.parse(brandingRow.value)
            : brandingRow.value;

          const currentSocials = branding.socials || [];
          const currentLabels = new Set(currentSocials.map(s => s.label));

          // Add missing socials
          const newSocials = gap.data.filter(s => !currentLabels.has(s.label));
          if (newSocials.length === 0) {
            applied.push({ fix: gap.type, success: true, detail: 'All socials already present' });
            break;
          }

          branding.socials = [...currentSocials, ...newSocials];

          await sb
            .from('admin_settings')
            .update({ value: branding })
            .eq('site_id', siteId)
            .eq('key', 'branding');

          applied.push({
            fix: gap.type,
            success: true,
            detail: `Added ${newSocials.length} social link(s): ${newSocials.map(s => s.label).join(', ')}`,
          });
          break;
        }

        case 'clear_business_hours': {
          const { data: profileRow } = await sb
            .from('admin_settings')
            .select('value')
            .eq('site_id', siteId)
            .eq('key', 'company_profile')
            .single();

          if (!profileRow?.value) {
            applied.push({ fix: gap.type, success: false, detail: 'No company_profile row found' });
            break;
          }

          const profile = typeof profileRow.value === 'string'
            ? JSON.parse(profileRow.value)
            : profileRow.value;

          const naPatterns = ['n/a', 'na', 'not available', 'not specified', 'not applicable', 'unknown', 'none'];
          const hours = profile.businessHours || profile.business_hours || '';
          const hoursStr = typeof hours === 'string' ? hours : JSON.stringify(hours);

          if (naPatterns.some(p => hoursStr.toLowerCase().includes(p))) {
            // Clear business hours
            if (profile.businessHours) profile.businessHours = '';
            if (profile.business_hours) profile.business_hours = '';

            await sb
              .from('admin_settings')
              .update({ value: profile })
              .eq('site_id', siteId)
              .eq('key', 'company_profile');

            applied.push({ fix: gap.type, success: true, detail: 'Cleared N/A business hours' });
          } else {
            applied.push({ fix: gap.type, success: true, detail: 'Business hours not N/A — no change' });
          }
          break;
        }

        case 'set_favicon_from_logo': {
          const { data: brandingRow } = await sb
            .from('admin_settings')
            .select('value')
            .eq('site_id', siteId)
            .eq('key', 'branding')
            .single();

          if (!brandingRow?.value) {
            applied.push({ fix: gap.type, success: false, detail: 'No branding row found' });
            break;
          }

          const branding = typeof brandingRow.value === 'string'
            ? JSON.parse(brandingRow.value)
            : brandingRow.value;

          // Check company_profile for logoUrl as fallback
          const { data: profileRow } = await sb
            .from('admin_settings')
            .select('value')
            .eq('site_id', siteId)
            .eq('key', 'company_profile')
            .single();

          const profile = profileRow?.value || {};
          const logoUrl = branding.logoUrl || profile.logoUrl || '';

          if (logoUrl && !branding.faviconUrl) {
            branding.faviconUrl = logoUrl;

            await sb
              .from('admin_settings')
              .update({ value: branding })
              .eq('site_id', siteId)
              .eq('key', 'branding');

            applied.push({ fix: gap.type, success: true, detail: `Set faviconUrl from logo: ${logoUrl.slice(0, 60)}` });
          } else if (branding.faviconUrl) {
            applied.push({ fix: gap.type, success: true, detail: 'Favicon already set' });
          } else {
            applied.push({ fix: gap.type, success: false, detail: 'No logo URL available for favicon' });
          }
          break;
        }

        default:
          applied.push({ fix: gap.type, success: false, detail: `Unknown fix type: ${gap.fix}` });
      }
    } catch (e) {
      applied.push({ fix: gap.type, success: false, detail: e.message?.slice(0, 100) || 'Unknown error' });
    }
  }

  return applied;
}

/**
 * Run data-gap resolution cycle.
 * @param {string} siteId
 * @param {string} baseUrl
 * @param {object} options
 * @returns {Promise<{ fixes: object[], remainingGaps: number, attempts: number }>}
 */
export async function resolveDataGaps(siteId, baseUrl, options = {}) {
  const { resultsDir, scrapedDataPath } = options;

  const pcPath = resultsDir ? resolve(resultsDir, 'page-completeness.json') : null;
  const pageCompleteness = readJson(pcPath);
  const scrapedData = readJson(scrapedDataPath);

  if (!pageCompleteness) {
    logger.info(`[${siteId}] No page-completeness results — skipping data-gap resolution`);
    return { fixes: [], remainingGaps: 0, attempts: 0 };
  }

  if (pageCompleteness.passed) {
    logger.info(`[${siteId}] Page completeness passed — no data gaps to resolve`);
    return { fixes: [], remainingGaps: 0, attempts: 0 };
  }

  const allFixes = [];
  let attempt = 0;
  let lastGapCount = null;

  while (attempt < MAX_FIX_ATTEMPTS) {
    attempt++;
    logger.info(`[${siteId}] Data-gap resolution attempt ${attempt}/${MAX_FIX_ATTEMPTS}`);

    // Read current page-completeness (re-read on subsequent attempts)
    const currentPc = attempt === 1
      ? pageCompleteness
      : readJson(pcPath);

    if (!currentPc || currentPc.passed) {
      logger.info(`[${siteId}] All page completeness checks now pass`);
      break;
    }

    const gaps = identifyGaps(currentPc, scrapedData);
    if (gaps.length === 0) {
      logger.info(`[${siteId}] No fixable data gaps identified`);
      break;
    }

    // Plateau detection — same gap count as last attempt
    if (lastGapCount !== null && gaps.length >= lastGapCount) {
      logger.info(`[${siteId}] Gap plateau: ${gaps.length} gaps (same as last attempt). Stopping.`);
      break;
    }
    lastGapCount = gaps.length;

    logger.info(`[${siteId}] Found ${gaps.length} fixable gap(s)`);

    // Apply fixes
    const fixes = await applyFixes(siteId, gaps);
    allFixes.push(...fixes);

    for (const f of fixes) {
      const icon = f.success ? 'OK' : 'SKIP';
      logger.info(`  ${icon} ${f.fix}: ${f.detail}`);
    }

    // Re-run page-completeness to verify
    if (attempt < MAX_FIX_ATTEMPTS) {
      try {
        logger.info(`[${siteId}] Re-running page completeness to verify fixes...`);
        // Wait briefly for any edge caching
        await new Promise(r => setTimeout(r, 3000));

        const { runPageCompleteness } = await import('./page-completeness.mjs');
        await runPageCompleteness(baseUrl, siteId, { outputPath: resultsDir });
      } catch (e) {
        logger.warn(`[${siteId}] Page completeness re-run failed: ${e.message?.slice(0, 100)}`);
        break;
      }
    }
  }

  // Final gap count
  const finalPc = readJson(pcPath);
  const remainingGaps = finalPc?.checks?.filter(c => !c.passed).length || 0;

  // Write results
  if (resultsDir) {
    mkdirSync(resultsDir, { recursive: true });
    const resultPath = resolve(resultsDir, 'data-gap-resolution.json');
    writeFileSync(resultPath, JSON.stringify({
      site_id: siteId,
      attempts: attempt,
      fixes: allFixes,
      remaining_gaps: remainingGaps,
      resolved: remainingGaps === 0,
    }, null, 2));
    logger.info(`Data-gap resolution results: ${resultPath}`);
  }

  return { fixes: allFixes, remainingGaps, attempts: attempt };
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'data-gap-resolution.mjs') ||
   import.meta.url === `file://${resolve(process.argv[1])}`);

if (isDirectRun) {
  const { values: args } = parseArgs({
    options: {
      'site-id': { type: 'string' },
      url: { type: 'string' },
      'results-dir': { type: 'string' },
      'scraped-data': { type: 'string' },
      help: { type: 'boolean' },
    },
    strict: false,
  });

  if (args.help) {
    console.log(`Data Gap Resolution — fix data gaps found by page-completeness

Usage:
  node qa/data-gap-resolution.mjs --site-id example --url https://example.norbotsystems.com --results-dir ./results/
  node qa/data-gap-resolution.mjs --site-id ID --url URL --results-dir DIR --scraped-data ./scraped.json

Reads: page-completeness.json from results-dir, scraped.json (optional)
Writes: data-gap-resolution.json to results-dir`);
    process.exit(0);
  }

  if (!args['site-id'] || !args.url || !args['results-dir']) {
    console.error('Required: --site-id, --url, --results-dir');
    process.exit(1);
  }

  const result = await resolveDataGaps(args['site-id'], args.url, {
    resultsDir: args['results-dir'],
    scrapedDataPath: args['scraped-data'],
  });

  logger.summary({
    module: 'data-gap-resolution',
    site_id: args['site-id'],
    fixes: result.fixes.length,
    remaining_gaps: result.remainingGaps,
    attempts: result.attempts,
  });

  process.exit(result.remainingGaps > 0 ? 1 : 0);
}
