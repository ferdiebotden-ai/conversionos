#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildAcceptanceReport } from '../lib/build-acceptance-report.mjs';
import { buildBrandResearchBundle } from '../lib/build-brand-research-bundle.mjs';
import { buildManifest } from '../lib/build-manifest.mjs';
import { buildSiteBlueprint } from '../lib/build-site-blueprint.mjs';
import { deriveSiteId } from '../lib/site-id.mjs';
import { writeShadowResult } from '../lib/write-shadow-result.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    args[key] = value;
    if (value !== 'true') {
      i += 1;
    }
  }
  return args;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'NorBot Dominant Builder Shadow/0.1',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUrl = args.url || args['source-url'];
  const htmlFile = args['html-file'];

  if (!sourceUrl && !htmlFile) {
    throw new Error('Pass --url <url> or --html-file <path>.');
  }

  const resolvedSourceUrl = sourceUrl || 'https://example.com';
  const html = htmlFile
    ? await readFile(path.resolve(process.cwd(), htmlFile), 'utf8')
    : await fetchHtml(resolvedSourceUrl);

  const siteId = deriveSiteId({
    siteId: args['site-id'],
    sourceUrl: resolvedSourceUrl,
    name: args.name || '',
  });

  const bundle = buildBrandResearchBundle({
    html,
    sourceUrl: resolvedSourceUrl,
    siteId,
    capturedAt: new Date().toISOString(),
    sourceType: htmlFile ? 'html_file' : 'live_fetch',
  });
  const blueprint = buildSiteBlueprint(bundle);
  const manifest = buildManifest({ bundle });
  const acceptanceReport = buildAcceptanceReport({ bundle, blueprint, manifest });
  const outDir = path.resolve(process.cwd(), args['out-dir'] || 'results');
  const { resultDir, files } = await writeShadowResult({ outDir, bundle, blueprint, manifest, acceptanceReport });

  console.log(`[shadow-build] ${bundle.identity.name} -> ${resultDir}`);
  for (const file of files) {
    console.log(`- ${file}`);
  }
}

main().catch((error) => {
  console.error(`[shadow-build] ${error.message}`);
  process.exitCode = 1;
});
