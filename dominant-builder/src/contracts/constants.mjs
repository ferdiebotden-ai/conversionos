export const REPLACEMENT_GATES = {
  successfulShadowRuns: '>= 90 percent across a 10-target pilot',
  manualPolishMedian: '<= 30 minutes',
  brandFidelityAverage: '>= 4.5 / 5',
  productIntegrity: 'zero critical regressions',
  qualityChecks: 'mobile, accessibility, and performance pass for every pilot build',
  exposure: 'private preview only until approval',
};

export const PLATFORM_EMBED_CONTRACT = {
  primaryEntryRoute: '/visualizer',
  secondaryEntryRoute: '/contact',
  adminRoute: '/admin',
  leadCaptureMode: 'inline-after-design-teaser',
  analyticsEvents: [
    'dominant_shell_cta_click',
    'dominant_shell_contact_submit',
    'platform_entry_visualizer',
  ],
};

export const OUTPUT_FILES = [
  'brand-research-bundle.json',
  'site-blueprint.json',
  'build-manifest.json',
  'acceptance-report.json',
  'shadow-brief.md',
];
