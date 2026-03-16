import { OUTPUT_FILES, PLATFORM_EMBED_CONTRACT, REPLACEMENT_GATES } from '../contracts/constants.mjs';

export function buildManifest({ bundle }) {
  return {
    version: '0.1.0',
    siteId: bundle.siteId,
    generatedAt: new Date().toISOString(),
    source: {
      url: bundle.sourceUrl,
      type: bundle.sourceType,
    },
    replacementGates: { ...REPLACEMENT_GATES },
    platformEmbedContract: { ...PLATFORM_EMBED_CONTRACT },
    artifacts: [...OUTPUT_FILES],
    status: 'shadow_preview',
  };
}
