import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeProxyFragment } from '../../provision/proxy-fragment.mjs';

const tmpResults = resolve(import.meta.dirname, '../../.test-tmp-results');

beforeEach(() => {
  rmSync(tmpResults, { recursive: true, force: true });
  mkdirSync(tmpResults, { recursive: true });
});

afterEach(() => {
  rmSync(tmpResults, { recursive: true, force: true });
});

describe('proxy-fragment', () => {
  it('should create fragment file with correct data', () => {
    writeProxyFragment('test-tenant', 'test-tenant.norbotsystems.com', {
      date: '2026-01-01',
      resultsDir: tmpResults,
    });

    const fragmentPath = resolve(tmpResults, '2026-01-01/proxy-fragments/test-tenant.json');
    expect(existsSync(fragmentPath)).toBe(true);

    const data = JSON.parse(readFileSync(fragmentPath, 'utf-8'));
    expect(data.domain).toBe('test-tenant.norbotsystems.com');
    expect(data.siteId).toBe('test-tenant');
  });

  it('should create directory structure recursively', () => {
    const nestedDir = resolve(tmpResults, 'deep/nested');
    writeProxyFragment('x', 'x.norbotsystems.com', {
      date: '2026-02-01',
      resultsDir: nestedDir,
    });

    expect(existsSync(resolve(nestedDir, '2026-02-01/proxy-fragments/x.json'))).toBe(true);
  });

  it('should default date to today', () => {
    const today = new Date().toISOString().slice(0, 10);
    writeProxyFragment('auto-date', 'auto-date.norbotsystems.com', {
      resultsDir: tmpResults,
    });

    expect(existsSync(resolve(tmpResults, `${today}/proxy-fragments/auto-date.json`))).toBe(true);
  });

  it('should overwrite existing fragment', () => {
    const opts = { date: '2026-01-01', resultsDir: tmpResults };

    writeProxyFragment('overwrite', 'old.norbotsystems.com', opts);
    writeProxyFragment('overwrite', 'new.norbotsystems.com', opts);

    const data = JSON.parse(readFileSync(
      resolve(tmpResults, '2026-01-01/proxy-fragments/overwrite.json'), 'utf-8'
    ));
    expect(data.domain).toBe('new.norbotsystems.com');
  });
});
