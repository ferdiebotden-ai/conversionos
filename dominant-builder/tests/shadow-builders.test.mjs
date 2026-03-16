import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildAcceptanceReport } from '../src/lib/build-acceptance-report.mjs';
import { buildBrandResearchBundle } from '../src/lib/build-brand-research-bundle.mjs';
import { buildManifest } from '../src/lib/build-manifest.mjs';
import { buildSiteBlueprint } from '../src/lib/build-site-blueprint.mjs';

const fixtureHtml = await readFile(new URL('./fixtures/source.html', import.meta.url), 'utf8');

test('buildBrandResearchBundle captures core brand signals', () => {
  const bundle = buildBrandResearchBundle({
    html: fixtureHtml,
    sourceUrl: 'https://oakandstonebuild.ca',
    siteId: 'oak-and-stone',
    capturedAt: '2026-03-06T12:00:00.000Z',
    sourceType: 'html_file',
  });

  assert.equal(bundle.identity.name, 'Oak & Stone Build Co.');
  assert.equal(bundle.identity.phone, '(226) 555-0148');
  assert.ok(bundle.visualTokens.colours.includes('#143642'));
  assert.ok(bundle.services.some((item) => item.name === 'Kitchen renovations'));
  assert.ok(bundle.ctaPatterns.some((item) => item.label === 'Book a consultation'));
});

test('blueprint and acceptance report stay private-preview only', () => {
  const bundle = buildBrandResearchBundle({
    html: fixtureHtml,
    sourceUrl: 'https://oakandstonebuild.ca',
    siteId: 'oak-and-stone',
    capturedAt: '2026-03-06T12:00:00.000Z',
    sourceType: 'html_file',
  });
  const blueprint = buildSiteBlueprint(bundle);
  const manifest = buildManifest({ bundle, blueprint });
  const report = buildAcceptanceReport({ bundle, blueprint, manifest });

  assert.equal(blueprint.platformEntryPlacement.primaryEntryRoute, '/visualizer');
  assert.equal(report.launchExposure, 'private_preview_only');
  assert.equal(report.manualReviewRequired, true);
  assert.ok(report.automatedChecks.every((check) => typeof check.passed === 'boolean'));
});
