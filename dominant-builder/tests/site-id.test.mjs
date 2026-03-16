import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSiteId, normalizeSiteId } from '../src/lib/site-id.mjs';

test('normalizeSiteId strips punctuation and normalizes separators', () => {
  assert.equal(normalizeSiteId('Oak & Stone Build Co.'), 'oak-and-stone-build-co');
});

test('deriveSiteId prefers explicit site id', () => {
  assert.equal(
    deriveSiteId({ siteId: 'Dominant Prospect', sourceUrl: 'https://example.com', name: 'Ignored' }),
    'dominant-prospect'
  );
});

test('deriveSiteId falls back to hostname', () => {
  assert.equal(
    deriveSiteId({ sourceUrl: 'https://www.oakandstonebuild.ca', name: '' }),
    'oakandstonebuild'
  );
});
