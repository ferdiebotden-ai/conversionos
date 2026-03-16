import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function renderBrief(bundle, blueprint, acceptanceReport) {
  return [
    `# ${bundle.identity.name} shadow brief`,
    '',
    `- Site ID: \`${bundle.siteId}\``,
    `- Source URL: ${bundle.sourceUrl}`,
    `- Launch exposure: ${acceptanceReport.launchExposure}`,
    `- Hero layout: ${blueprint.componentChoices.hero}`,
    `- Services detected: ${bundle.services.map((item) => item.name).join(', ') || 'none'}`,
    `- Trust markers: ${bundle.trustMarkers.join(' | ') || 'none'}`,
    '',
    '## Next actions',
    ...acceptanceReport.nextActions.map((item) => `- ${item}`),
    '',
  ].join('\n');
}

export async function writeShadowResult({ outDir, bundle, blueprint, manifest, acceptanceReport }) {
  const resultDir = path.join(outDir, bundle.siteId);
  await mkdir(resultDir, { recursive: true });

  const fileMap = {
    'brand-research-bundle.json': JSON.stringify(bundle, null, 2),
    'site-blueprint.json': JSON.stringify(blueprint, null, 2),
    'build-manifest.json': JSON.stringify(manifest, null, 2),
    'acceptance-report.json': JSON.stringify(acceptanceReport, null, 2),
    'shadow-brief.md': renderBrief(bundle, blueprint, acceptanceReport),
  };

  for (const [name, contents] of Object.entries(fileMap)) {
    await writeFile(path.join(resultDir, name), contents, 'utf8');
  }

  return {
    resultDir,
    files: Object.keys(fileMap),
  };
}
