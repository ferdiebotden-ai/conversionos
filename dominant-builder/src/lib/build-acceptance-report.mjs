export function buildAcceptanceReport({ bundle, blueprint }) {
  const automatedChecks = [
    {
      name: 'identity_captured',
      passed: Boolean(bundle.identity.name && bundle.identity.heroHeading),
      detail: 'Business name and hero heading were captured from the source.',
    },
    {
      name: 'contact_signal_present',
      passed: Boolean(bundle.identity.phone || bundle.identity.email),
      detail: 'At least one direct contact signal was captured.',
    },
    {
      name: 'services_detected',
      passed: bundle.services.length >= 1,
      detail: 'At least one service was detected from headings or copy.',
    },
    {
      name: 'platform_entry_defined',
      passed: Boolean(blueprint.platformEntryPlacement.primaryEntryRoute),
      detail: 'The shared platform-entry handoff is explicit in the blueprint.',
    },
    {
      name: 'private_preview_policy',
      passed: true,
      detail: 'Every run remains private-preview only until approval.',
    },
  ];

  return {
    version: '0.1.0',
    siteId: bundle.siteId,
    generatedAt: new Date().toISOString(),
    launchExposure: 'private_preview_only',
    automatedChecks,
    replacementScorecard: {
      brandFidelity: null,
      operatorTimeMinutes: null,
      productIntegrity: null,
      accessibility: null,
      performance: null,
    },
    manualReviewRequired: true,
    nextActions: [
      'Review the bundle against the original site visually.',
      'Compare this blueprint with the current tenant-builder output.',
      'Record verdicts in the decision log and experiment ledger before any cutover recommendation.',
    ],
  };
}
