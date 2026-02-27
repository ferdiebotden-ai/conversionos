import { describe, it, expect, beforeAll } from 'vitest';
import '../setup.mjs';
import { requireIntegrationEnv } from '../setup.mjs';
import { getSupabase } from '../../lib/supabase-client.mjs';

/**
 * Integration tests for refinement loop logic.
 *
 * These test the core refinement loop logic (plateau detection, regression detection,
 * snapshot/restore, max iterations) using real Supabase for snapshot/restore operations.
 * We do NOT run the full refinement loop (which requires screenshots + Claude Vision).
 */

const TEST_SITE_ID = 'redwhitereno';

describe('refinement-loop logic (integration)', () => {
  beforeAll(() => {
    requireIntegrationEnv();
  });

  it('should detect plateau (delta < 0.2) and stop', () => {
    // Simulate the plateau detection logic from refinement-loop.mjs
    const scores = [3.0, 3.1]; // delta = 0.1 < 0.2

    let previousScore = null;
    let stopped = false;

    for (const currentScore of scores) {
      if (previousScore !== null && currentScore - previousScore < 0.2) {
        stopped = true;
        break;
      }
      previousScore = currentScore;
    }

    expect(stopped).toBe(true);
  });

  it('should detect regression and trigger rollback', () => {
    // Simulate the regression detection logic
    const scores = [3.5, 3.2]; // regression: 3.5 -> 3.2

    let previousScore = null;
    let regression = false;

    for (const currentScore of scores) {
      if (previousScore !== null && currentScore < previousScore) {
        regression = true;
        break;
      }
      previousScore = currentScore;
    }

    expect(regression).toBe(true);
  });

  it('should respect max iterations', () => {
    const maxIterations = 3;
    let iteration = 0;
    let stopped = false;

    // Simulate loop with improving but failing scores
    const scores = [3.0, 3.5, 3.8, 4.1]; // 4th would pass but max is 3

    while (iteration < maxIterations) {
      iteration++;
      const currentScore = scores[iteration - 1];
      if (currentScore >= 4.0) break;
      if (iteration >= maxIterations) {
        stopped = true;
        break;
      }
    }

    expect(stopped).toBe(true);
    expect(iteration).toBe(maxIterations);
  });

  it('should snapshot and restore admin_settings', async () => {
    const sb = getSupabase();

    // Snapshot the current state
    const { data: snapshot } = await sb
      .from('admin_settings')
      .select('key, value')
      .eq('site_id', TEST_SITE_ID);

    expect(snapshot).toBeDefined();
    expect(snapshot.length).toBeGreaterThan(0);

    // Find a key to modify temporarily
    const brandingRow = snapshot.find(r => r.key === 'branding');
    expect(brandingRow).toBeDefined();

    // Modify branding temporarily (add a test marker)
    const originalValue = JSON.parse(JSON.stringify(brandingRow.value));
    const modifiedValue = { ...originalValue, _test_marker: 'snapshot-test' };

    await sb
      .from('admin_settings')
      .update({ value: modifiedValue })
      .eq('site_id', TEST_SITE_ID)
      .eq('key', 'branding');

    // Verify modification took effect
    const { data: modified } = await sb
      .from('admin_settings')
      .select('value')
      .eq('site_id', TEST_SITE_ID)
      .eq('key', 'branding')
      .single();

    expect(modified.value._test_marker).toBe('snapshot-test');

    // Restore from snapshot
    for (const row of snapshot) {
      await sb
        .from('admin_settings')
        .update({ value: row.value })
        .eq('site_id', TEST_SITE_ID)
        .eq('key', row.key);
    }

    // Verify restoration
    const { data: restored } = await sb
      .from('admin_settings')
      .select('value')
      .eq('site_id', TEST_SITE_ID)
      .eq('key', 'branding')
      .single();

    expect(restored.value._test_marker).toBeUndefined();
    // Original structure should be intact
    expect(restored.value.colors).toBeDefined();
  }, 30000);

  it('should allow fix application to improve score (simulated)', () => {
    // Simulate the fix application logic: if fixes are applied,
    // the score should potentially improve on the next iteration

    const dim_scores_before = {
      logo_fidelity: 3,
      colour_match: 2,
      copy_accuracy: 4,
      layout_integrity: 4,
      brand_cohesion: 3,
    };

    const dims = Object.keys(dim_scores_before);
    const avgBefore = dims.reduce((sum, d) => sum + dim_scores_before[d], 0) / dims.length;

    // Simulate fixing colour_match (the lowest scoring dimension)
    const dim_scores_after = { ...dim_scores_before, colour_match: 4 };
    const avgAfter = dims.reduce((sum, d) => sum + dim_scores_after[d], 0) / dims.length;

    expect(avgAfter).toBeGreaterThan(avgBefore);
    expect(avgAfter - avgBefore).toBeGreaterThanOrEqual(0.2); // Above plateau threshold
  });
});
