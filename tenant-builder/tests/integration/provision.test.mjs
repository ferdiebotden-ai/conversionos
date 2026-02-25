import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import '../setup.mjs';
import { requireIntegrationEnv, TEST_SITE_ID, TEST_DOMAIN, TEST_TIER } from '../setup.mjs';
import { getSupabase } from '../../lib/supabase-client.mjs';
import { assertValidProvision } from '../helpers/assertions.mjs';
import { mockScrapedData } from '../helpers/fixtures.mjs';

const PROVISION_SCRIPT = resolve(import.meta.dirname, '../../provision/provision-tenant.mjs');
const DEMO_ROOT = resolve(import.meta.dirname, '../../../');
const today = new Date().toISOString().slice(0, 10);
const testDataDir = resolve(import.meta.dirname, `../../results/${today}/${TEST_SITE_ID}-prov-test`);
const testDataPath = resolve(testDataDir, 'scraped.json');

describe('provision-tenant (integration)', () => {
  beforeAll(async () => {
    requireIntegrationEnv();

    // Create test data directory and mock scraped data
    mkdirSync(testDataDir, { recursive: true });
    writeFileSync(testDataPath, JSON.stringify({
      ...mockScrapedData,
      business_name: 'Integration Test Reno',
      primary_color_hex: '#ff0000',
    }, null, 2));

    // Clean up any existing test tenant
    const sb = getSupabase();
    await sb.from('admin_settings').delete().eq('site_id', `${TEST_SITE_ID}-prov-test`);
    await sb.from('tenants').delete().eq('site_id', `${TEST_SITE_ID}-prov-test`);
  });

  afterAll(async () => {
    // Cleanup
    const sb = getSupabase();
    await sb.from('admin_settings').delete().eq('site_id', `${TEST_SITE_ID}-prov-test`);
    await sb.from('tenants').delete().eq('site_id', `${TEST_SITE_ID}-prov-test`);

    // Remove proxy.ts entry
    const proxyPath = resolve(DEMO_ROOT, 'src/proxy.ts');
    const domain = `${TEST_SITE_ID}-prov-test.norbotsystems.com`;
    try {
      const content = readFileSync(proxyPath, 'utf-8');
      if (content.includes(`'${domain}'`)) {
        const lines = content.split('\n').filter(l => !l.includes(`'${domain}'`));
        writeFileSync(proxyPath, lines.join('\n'));
      }
    } catch { /* ignore */ }

    rmSync(testDataDir, { recursive: true, force: true });
  });

  it('should provision a test tenant in Supabase', () => {
    execFileSync('node', [
      PROVISION_SCRIPT,
      '--site-id', `${TEST_SITE_ID}-prov-test`,
      '--data', testDataPath,
      '--domain', `${TEST_SITE_ID}-prov-test.norbotsystems.com`,
      '--tier', TEST_TIER,
    ], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }, 180000);

  it('should have valid DB state after provisioning', async () => {
    const sb = getSupabase();
    await assertValidProvision(`${TEST_SITE_ID}-prov-test`, sb);
  });

  it('should be idempotent (no duplicates on re-provision)', async () => {
    // Run provision again
    execFileSync('node', [
      PROVISION_SCRIPT,
      '--site-id', `${TEST_SITE_ID}-prov-test`,
      '--data', testDataPath,
      '--domain', `${TEST_SITE_ID}-prov-test.norbotsystems.com`,
      '--tier', TEST_TIER,
    ], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Should still have exactly 4 admin_settings rows
    const sb = getSupabase();
    const { data } = await sb.from('admin_settings').select('key').eq('site_id', `${TEST_SITE_ID}-prov-test`);
    expect(data.length).toBe(4);

    // Should still have exactly 1 tenants row
    const { data: tenants } = await sb.from('tenants').select('*').eq('site_id', `${TEST_SITE_ID}-prov-test`);
    expect(tenants.length).toBe(1);
  }, 180000);

  it('should respect --dry-run (no DB writes)', async () => {
    const newSiteId = `${TEST_SITE_ID}-dryrun-test`;
    const sb = getSupabase();

    try {
      execFileSync('node', [
        PROVISION_SCRIPT,
        '--site-id', newSiteId,
        '--data', testDataPath,
        '--domain', `${newSiteId}.norbotsystems.com`,
        '--tier', TEST_TIER,
        '--dry-run',
      ], {
        cwd: DEMO_ROOT,
        env: { ...process.env },
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Should NOT have any DB rows
      const { data } = await sb.from('admin_settings').select('key').eq('site_id', newSiteId);
      expect(data.length).toBe(0);
    } finally {
      // Cleanup just in case
      await sb.from('admin_settings').delete().eq('site_id', newSiteId);
      await sb.from('tenants').delete().eq('site_id', newSiteId);
    }
  }, 60000);
});
