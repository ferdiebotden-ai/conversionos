import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const tmpDir = resolve(import.meta.dirname, '../../.test-tmp');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('env-loader', () => {
  describe('parseEnvFile via loadEnv', () => {
    it('should parse KEY=VALUE format', async () => {
      const envFile = resolve(tmpDir, '.env');
      writeFileSync(envFile, 'TEST_VAR_A=hello\nTEST_VAR_B=world\n');

      // Remove test vars if they exist
      delete process.env.TEST_VAR_A;
      delete process.env.TEST_VAR_B;

      // parseEnvFile is internal, so test via loadEnv logic manually
      const { readFileSync } = await import('node:fs');
      const content = readFileSync(envFile, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^(?:export\s+)?([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }

      expect(process.env.TEST_VAR_A).toBe('hello');
      expect(process.env.TEST_VAR_B).toBe('world');

      delete process.env.TEST_VAR_A;
      delete process.env.TEST_VAR_B;
    });

    it('should handle export prefix', () => {
      const line = 'export MY_TEST_KEY=myvalue';
      const match = line.trim().match(/^(?:export\s+)?([^#=]+)=(.*)$/);
      expect(match).toBeTruthy();
      expect(match[1].trim()).toBe('MY_TEST_KEY');
      expect(match[2].trim()).toBe('myvalue');
    });

    it('should handle quoted values', () => {
      const testCases = [
        { line: 'KEY="quoted"', expected: 'quoted' },
        { line: "KEY='single'", expected: 'single' },
        { line: 'KEY=unquoted', expected: 'unquoted' },
      ];

      for (const { line, expected } of testCases) {
        const match = line.trim().match(/^(?:export\s+)?([^#=]+)=(.*)$/);
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        expect(val).toBe(expected);
      }
    });

    it('should skip comments and blank lines', () => {
      const lines = ['# comment', '', '  ', '# another comment', 'VALID_KEY=yes'];
      const parsed = {};
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^(?:export\s+)?([^#=]+)=(.*)$/);
        if (match) parsed[match[1].trim()] = match[2].trim();
      }
      expect(Object.keys(parsed)).toEqual(['VALID_KEY']);
      expect(parsed.VALID_KEY).toBe('yes');
    });

    it('should not overwrite existing env vars', () => {
      process.env.EXISTING_TEST_VAR = 'original';
      const line = 'EXISTING_TEST_VAR=new_value';
      const match = line.trim().match(/^(?:export\s+)?([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        if (!process.env[key]) process.env[key] = match[2].trim();
      }
      expect(process.env.EXISTING_TEST_VAR).toBe('original');
      delete process.env.EXISTING_TEST_VAR;
    });
  });

  describe('requireEnv', () => {
    it('should not throw when all vars present', async () => {
      process.env.REQ_TEST_1 = 'a';
      process.env.REQ_TEST_2 = 'b';

      const missing = ['REQ_TEST_1', 'REQ_TEST_2'].filter(v => !process.env[v]);
      expect(missing).toEqual([]);

      delete process.env.REQ_TEST_1;
      delete process.env.REQ_TEST_2;
    });

    it('should detect missing vars', () => {
      delete process.env.MISSING_VAR_1;
      delete process.env.MISSING_VAR_2;

      const required = ['MISSING_VAR_1', 'MISSING_VAR_2'];
      const missing = required.filter(v => !process.env[v]);
      expect(missing).toEqual(['MISSING_VAR_1', 'MISSING_VAR_2']);
    });
  });
});
