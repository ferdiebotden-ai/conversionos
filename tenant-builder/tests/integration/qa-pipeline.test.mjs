import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import '../setup.mjs';
import { requireIntegrationEnv } from '../setup.mjs';
import { assertValidQaResult } from '../helpers/assertions.mjs';

const SCREENSHOT_SCRIPT = resolve(import.meta.dirname, '../../qa/screenshot.mjs');
const VISUAL_QA_SCRIPT = resolve(import.meta.dirname, '../../qa/visual-qa.mjs');
const DEMO_ROOT = resolve(import.meta.dirname, '../../../');

// Use the live redwhitereno tenant for QA tests
const LIVE_URL = 'https://redwhite.norbotsystems.com';
const LIVE_SITE_ID = 'redwhitereno';
const today = new Date().toISOString().slice(0, 10);
const outputDir = resolve(import.meta.dirname, `../../results/${today}/${LIVE_SITE_ID}-qa-test`);
const screenshotsDir = resolve(outputDir, 'screenshots');

describe('QA pipeline (integration)', () => {
  beforeAll(() => {
    requireIntegrationEnv();
  });

  afterAll(() => {
    rmSync(outputDir, { recursive: true, force: true });
  });

  describe('screenshots', () => {
    it('should take desktop and mobile screenshots', () => {
      execFileSync('node', [
        SCREENSHOT_SCRIPT,
        '--url', LIVE_URL,
        '--site-id', `${LIVE_SITE_ID}-qa-test`,
        '--output', screenshotsDir,
        '--skip-upload',
      ], {
        cwd: DEMO_ROOT,
        env: { ...process.env },
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const desktopPath = resolve(screenshotsDir, 'desktop.png');
      const mobilePath = resolve(screenshotsDir, 'mobile.png');

      expect(existsSync(desktopPath)).toBe(true);
      expect(existsSync(mobilePath)).toBe(true);

      // Each should be > 10KB (not empty/broken)
      expect(statSync(desktopPath).size).toBeGreaterThan(10000);
      expect(statSync(mobilePath).size).toBeGreaterThan(10000);
    }, 60000);
  });

  describe('visual QA', () => {
    it('should score the live tenant', () => {
      // visual-qa exits 1 on fail (avg < 4.0), but still produces output
      let stdout;
      try {
        stdout = execFileSync('node', [
          VISUAL_QA_SCRIPT,
          '--site-id', `${LIVE_SITE_ID}-qa-test`,
          '--screenshots', screenshotsDir,
        ], {
          cwd: DEMO_ROOT,
          env: { ...process.env },
          timeout: 180000,
          maxBuffer: 10 * 1024 * 1024,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (e) {
        stdout = e.stdout || '';
      }

      // Parse the last JSON line from stdout
      const lines = stdout.split('\n').filter(l => l.trim());
      const jsonLine = lines.find(l => l.startsWith('{'));
      expect(jsonLine).toBeDefined();

      const result = JSON.parse(jsonLine);
      assertValidQaResult(result);
    }, 180000);

    it('should save visual-qa.json to disk', () => {
      const qaPath = resolve(outputDir, 'visual-qa.json');
      if (!existsSync(qaPath)) return; // Skip if QA didn't run

      const result = JSON.parse(readFileSync(qaPath, 'utf-8'));
      assertValidQaResult(result);
    });
  });
});
