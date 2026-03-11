#!/usr/bin/env node
/**
 * Mark a tenant's polish queue item complete without applying a patch.
 * Useful when Codex determines the tenant needs no changes, or when
 * manual review is complete and outreach can proceed.
 *
 * Usage:
 *   node scripts/polish/complete-polish.mjs --site-id <id>
 *   node scripts/polish/complete-polish.mjs --site-id <id> --note "No changes needed"
 */

import { parseArgs } from 'node:util';
import { archiveQueueItem } from './queue-utils.mjs';

const { values } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    note: { type: 'string' },
  },
});

const siteId = values['site-id'];
if (!siteId) {
  console.error('Usage: node scripts/polish/complete-polish.mjs --site-id <id> [--note "..."]');
  process.exit(1);
}

const donePath = archiveQueueItem(siteId, {
  resolution: 'manual_complete',
  note: values.note || 'Polish completed without patch application',
});

if (!donePath) {
  console.error(`No active polish queue item found for ${siteId}`);
  process.exit(1);
}

console.log(`Marked polish complete for ${siteId} → ${donePath}`);
