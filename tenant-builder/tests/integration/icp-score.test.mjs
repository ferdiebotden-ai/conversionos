import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import '../setup.mjs';
import { requireIntegrationEnv, TEST_TARGET_ID } from '../setup.mjs';
import { query, execute } from '../../lib/turso-client.mjs';
import { assertValidIcpScore } from '../helpers/assertions.mjs';

const ICP_SCRIPT = resolve(import.meta.dirname, '../../icp-score.mjs');
const DEMO_ROOT = resolve(import.meta.dirname, '../../../');

describe('ICP scoring (integration)', () => {
  let originalScore;
  let originalBreakdown;

  beforeAll(async () => {
    requireIntegrationEnv();
    // Save original values to restore after test
    const [row] = await query('SELECT icp_score, icp_breakdown FROM targets WHERE id = ?', [TEST_TARGET_ID]);
    originalScore = row?.icp_score;
    originalBreakdown = row?.icp_breakdown;
  });

  afterAll(async () => {
    // Restore original values
    await execute(
      'UPDATE targets SET icp_score = ?, icp_breakdown = ? WHERE id = ?',
      [originalScore, originalBreakdown, TEST_TARGET_ID]
    );
  });

  it('should score Red White Reno in expected range', async () => {
    // Clear existing score first
    await execute(
      'UPDATE targets SET icp_score = NULL, icp_breakdown = NULL WHERE id = ?',
      [TEST_TARGET_ID]
    );

    const stdout = execFileSync('node', [ICP_SCRIPT, '--target-id', String(TEST_TARGET_ID)], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Verify Turso was updated
    const [row] = await query('SELECT icp_score, icp_breakdown FROM targets WHERE id = ?', [TEST_TARGET_ID]);

    expect(row.icp_score).toBeDefined();
    expect(row.icp_score).toBeGreaterThanOrEqual(50);
    expect(row.icp_score).toBeLessThanOrEqual(90);

    assertValidIcpScore(row.icp_score, row.icp_breakdown);
  }, 180000);

  it('should respect --dry-run (no DB write)', async () => {
    // Set a known value
    await execute(
      'UPDATE targets SET icp_score = 99, icp_breakdown = ? WHERE id = ?',
      ['{"total":99}', TEST_TARGET_ID]
    );

    execFileSync('node', [ICP_SCRIPT, '--target-id', String(TEST_TARGET_ID), '--dry-run'], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Value should still be 99 (not overwritten)
    const [row] = await query('SELECT icp_score FROM targets WHERE id = ?', [TEST_TARGET_ID]);
    expect(row.icp_score).toBe(99);
  }, 180000);

  it('should emit PROGRESS and SUMMARY lines', () => {
    const stdout = execFileSync('node', [ICP_SCRIPT, '--target-id', String(TEST_TARGET_ID), '--dry-run'], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = stdout.split('\n');
    const progressLines = lines.filter(l => l.startsWith('[PROGRESS]'));
    const summaryLines = lines.filter(l => l.startsWith('[SUMMARY]'));

    expect(progressLines.length).toBeGreaterThanOrEqual(2); // start + complete
    expect(summaryLines.length).toBe(1);

    const summary = JSON.parse(summaryLines[0].replace('[SUMMARY] ', ''));
    expect(summary.total).toBe(1);
    expect(summary.succeeded).toBe(1);
  }, 180000);
});
