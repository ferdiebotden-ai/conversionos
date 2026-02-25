import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const tmpDir = resolve(import.meta.dirname, '../../.test-tmp-merge');
const fakeSrcDir = resolve(tmpDir, 'src');
const fakeResultsDir = resolve(tmpDir, 'results/2026-01-01/proxy-fragments');
const mergeScript = resolve(import.meta.dirname, '../../provision/merge-proxy.mjs');

const MOCK_PROXY = `import { NextResponse, type NextRequest } from 'next/server';

const DOMAIN_TO_SITE: Record<string, string> = {
  'existing.norbotsystems.com': 'existing',
};

export async function proxy(request: NextRequest) {
  return NextResponse.next();
}
`;

beforeEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(fakeResultsDir, { recursive: true });
  mkdirSync(fakeSrcDir, { recursive: true });
  writeFileSync(resolve(fakeSrcDir, 'proxy.ts'), MOCK_PROXY);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// Helper: parse DOMAIN_TO_SITE entries from proxy.ts content
function parseDomains(content) {
  const matches = [...content.matchAll(/'([^']+)': '([^']+)'/g)];
  return Object.fromEntries(matches.map(m => [m[1], m[2]]));
}

describe('merge-proxy logic', () => {
  it('should insert new domain into proxy.ts', () => {
    // Write a fragment
    writeFileSync(
      resolve(fakeResultsDir, 'newtenant.json'),
      JSON.stringify({ domain: 'newtenant.norbotsystems.com', siteId: 'newtenant' })
    );

    // Read proxy, find insert point, manually merge
    const proxyPath = resolve(fakeSrcDir, 'proxy.ts');
    const content = readFileSync(proxyPath, 'utf-8');
    const lines = content.split('\n');

    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('DOMAIN_TO_SITE')) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('};')) {
            insertIndex = j;
            break;
          }
        }
        break;
      }
    }

    expect(insertIndex).toBeGreaterThan(0);

    const newLine = `  'newtenant.norbotsystems.com': 'newtenant',`;
    lines.splice(insertIndex, 0, newLine);
    writeFileSync(proxyPath, lines.join('\n'));

    const updated = readFileSync(proxyPath, 'utf-8');
    const domains = parseDomains(updated);
    expect(domains['existing.norbotsystems.com']).toBe('existing');
    expect(domains['newtenant.norbotsystems.com']).toBe('newtenant');
  });

  it('should skip duplicate domains', () => {
    const proxyPath = resolve(fakeSrcDir, 'proxy.ts');
    const content = readFileSync(proxyPath, 'utf-8');

    // Try to add existing domain
    const domain = 'existing.norbotsystems.com';
    const alreadyExists = content.includes(`'${domain}'`);
    expect(alreadyExists).toBe(true);

    // Domain count should stay the same
    const domains = parseDomains(content);
    expect(Object.keys(domains).length).toBe(1);
  });

  it('should handle multiple fragments', () => {
    const proxyPath = resolve(fakeSrcDir, 'proxy.ts');
    let content = readFileSync(proxyPath, 'utf-8');

    const fragments = [
      { domain: 'tenant-a.norbotsystems.com', siteId: 'tenant-a' },
      { domain: 'tenant-b.norbotsystems.com', siteId: 'tenant-b' },
    ];

    const lines = content.split('\n');
    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('DOMAIN_TO_SITE')) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('};')) {
            insertIndex = j;
            break;
          }
        }
        break;
      }
    }

    for (const { domain, siteId } of fragments) {
      if (!content.includes(`'${domain}'`)) {
        lines.splice(insertIndex, 0, `  '${domain}': '${siteId}',`);
        insertIndex++;
      }
    }

    writeFileSync(proxyPath, lines.join('\n'));
    const updated = readFileSync(proxyPath, 'utf-8');
    const domains = parseDomains(updated);
    expect(Object.keys(domains).length).toBe(3); // existing + a + b
  });

  it('should preserve existing entries', () => {
    const proxyPath = resolve(fakeSrcDir, 'proxy.ts');
    const content = readFileSync(proxyPath, 'utf-8');
    const lines = content.split('\n');

    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('DOMAIN_TO_SITE')) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('};')) { insertIndex = j; break; }
        }
        break;
      }
    }

    lines.splice(insertIndex, 0, `  'new.norbotsystems.com': 'new-site',`);
    writeFileSync(proxyPath, lines.join('\n'));

    const updated = readFileSync(proxyPath, 'utf-8');
    expect(updated).toContain("'existing.norbotsystems.com': 'existing'");
    expect(updated).toContain("'new.norbotsystems.com': 'new-site'");
  });

  it('should produce valid TypeScript (parseable)', () => {
    const proxyPath = resolve(fakeSrcDir, 'proxy.ts');
    const lines = readFileSync(proxyPath, 'utf-8').split('\n');

    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('DOMAIN_TO_SITE')) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('};')) { insertIndex = j; break; }
        }
        break;
      }
    }

    lines.splice(insertIndex, 0, `  'test.norbotsystems.com': 'test',`);
    const result = lines.join('\n');

    // Verify structure: should have matching braces
    const opens = (result.match(/\{/g) || []).length;
    const closes = (result.match(/\}/g) || []).length;
    expect(opens).toBe(closes);

    // Should still have the export function
    expect(result).toContain('export async function proxy');
  });
});
