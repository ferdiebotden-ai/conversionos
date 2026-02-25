import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import '../setup.mjs';
import { requireIntegrationEnv } from '../setup.mjs';

const ORCHESTRATE_SCRIPT = resolve(import.meta.dirname, '../../orchestrate.mjs');
const DEMO_ROOT = resolve(import.meta.dirname, '../../../');

describe('orchestrator CLI flags (integration)', () => {
  beforeAll(() => {
    requireIntegrationEnv();
  });

  it('should show help text with --help', () => {
    const stdout = execFileSync('node', [ORCHESTRATE_SCRIPT, '--help'], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    expect(stdout).toContain('Tenant Builder Orchestrator');
    expect(stdout).toContain('--batch');
    expect(stdout).toContain('--target-id');
    expect(stdout).toContain('--dry-run');
  });

  it('should exit with error when no mode specified', () => {
    try {
      execFileSync('node', [ORCHESTRATE_SCRIPT], {
        cwd: DEMO_ROOT,
        env: { ...process.env },
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e.status).toBeGreaterThan(0);
    }
  });

  it('should exit with error for non-existent target ID', () => {
    try {
      execFileSync('node', [ORCHESTRATE_SCRIPT, '--target-id', '999999'], {
        cwd: DEMO_ROOT,
        env: { ...process.env },
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e.status).toBeGreaterThan(0);
      const stderr = e.stderr || '';
      const stdout = e.stdout || '';
      const output = stderr + stdout;
      expect(output).toContain('not found');
    }
  });

  it('should require --site-id with --url', () => {
    try {
      execFileSync('node', [ORCHESTRATE_SCRIPT, '--url', 'https://example.com'], {
        cwd: DEMO_ROOT,
        env: { ...process.env },
        timeout: 10000,
        maxBuffer: 1024 * 1024,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e.status).toBeGreaterThan(0);
    }
  });
});
