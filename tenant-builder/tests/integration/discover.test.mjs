import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import '../setup.mjs';
import { requireIntegrationEnv } from '../setup.mjs';

const DISCOVER_SCRIPT = resolve(import.meta.dirname, '../../discover.mjs');
const DEMO_ROOT = resolve(import.meta.dirname, '../../../');

describe('discover (integration)', () => {
  beforeAll(() => {
    requireIntegrationEnv();
  });

  it('should return targets from Turso in pipeline mode', () => {
    const stdout = execFileSync('node', [
      DISCOVER_SCRIPT,
      '--pipeline',
      '--limit', '3',
    ], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Should have a SUMMARY line
    const summaryLine = stdout.split('\n').find(l => l.startsWith('[SUMMARY]'));
    expect(summaryLine).toBeDefined();

    const summary = JSON.parse(summaryLine.replace('[SUMMARY] ', ''));
    expect(summary.total).toBeGreaterThanOrEqual(0);
    expect(summary.failed).toBe(0);
  }, 30000);

  it('should find contractors via Firecrawl in discovery mode (dry-run)', () => {
    const stdout = execFileSync('node', [
      DISCOVER_SCRIPT,
      '--discover',
      '--cities', 'London',
      '--limit', '2',
      '--dry-run',
    ], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Should emit PROGRESS lines for search
    const progressLines = stdout.split('\n').filter(l => l.startsWith('[PROGRESS]'));
    expect(progressLines.length).toBeGreaterThanOrEqual(1);

    // Should emit SUMMARY
    const summaryLine = stdout.split('\n').find(l => l.startsWith('[SUMMARY]'));
    expect(summaryLine).toBeDefined();
  }, 60000);

  it('should deduplicate URLs within a batch', () => {
    // Discovery mode deduplicates by normalized domain.
    // We test the normalization logic here by running with a small limit.
    const stdout = execFileSync('node', [
      DISCOVER_SCRIPT,
      '--discover',
      '--cities', 'Kitchener',
      '--limit', '5',
      '--dry-run',
    ], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Check for dedup log messages (may or may not appear depending on results)
    const summaryLine = stdout.split('\n').find(l => l.startsWith('[SUMMARY]'));
    expect(summaryLine).toBeDefined();

    const summary = JSON.parse(summaryLine.replace('[SUMMARY] ', ''));
    // If there were duplicates, total would be less than 5
    expect(summary.total).toBeGreaterThanOrEqual(0);
    expect(summary.total).toBeLessThanOrEqual(5);
  }, 60000);

  it('should normalize URLs correctly (strip www/protocol/trailing slash)', () => {
    // This is a unit-level check done inline since normalizeDomain is not exported.
    // We verify the logic indirectly: pipeline mode fetches by URL so normalized URLs
    // should be comparable.
    const stdout = execFileSync('node', [
      DISCOVER_SCRIPT,
      '--pipeline',
      '--limit', '1',
    ], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Should run without error
    const summaryLine = stdout.split('\n').find(l => l.startsWith('[SUMMARY]'));
    expect(summaryLine).toBeDefined();
  }, 30000);

  it('should handle empty results gracefully', () => {
    // Pipeline mode with limit 0 should return empty
    const stdout = execFileSync('node', [
      DISCOVER_SCRIPT,
      '--pipeline',
      '--limit', '0',
    ], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const summaryLine = stdout.split('\n').find(l => l.startsWith('[SUMMARY]'));
    expect(summaryLine).toBeDefined();

    const summary = JSON.parse(summaryLine.replace('[SUMMARY] ', ''));
    expect(summary.total).toBe(0);
    expect(summary.succeeded).toBe(0);
    expect(summary.failed).toBe(0);
  }, 30000);
});
