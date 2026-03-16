export interface BrandResearchBundle {
  version: string;
  siteId: string;
  sourceUrl: string;
  capturedAt: string;
  sourceType: 'live_fetch' | 'html_file';
  identity: {
    name: string;
    domain: string;
    titleTag: string;
    heroHeading: string;
    metaDescription: string;
    phone: string | null;
    email: string | null;
  };
  visualTokens: {
    colours: string[];
    logoCandidates: string[];
    heroImages: string[];
  };
  layoutPatterns: {
    navigationLabels: string[];
    sectionHeadings: string[];
    preferredHeroLayout: string;
  };
  copyTone: {
    descriptors: string[];
    sampleLines: string[];
  };
  trustMarkers: string[];
  services: Array<{
    name: string;
    confidence: 'high' | 'medium' | 'low';
    evidence: string;
  }>;
  proofAssets: {
    heroImages: string[];
    galleryImages: string[];
    testimonialSnippets: string[];
    socialLinks: Array<{ label: string; href: string }>;
  };
  ctaPatterns: Array<{
    label: string;
    href: string | null;
    placement: 'hero' | 'nav' | 'body' | 'footer' | 'unknown';
  }>;
}

export interface SiteBlueprint {
  version: string;
  siteId: string;
  sourceUrl: string;
  pageMap: Array<{
    slug: string;
    purpose: string;
    sections: string[];
  }>;
  componentChoices: {
    hero: string;
    proofRail: string;
    gallery: string;
    navigation: string;
  };
  animationRules: string[];
  contentPlan: {
    heroHeadlineSource: string;
    heroSupportSource: string;
    serviceSource: string;
    proofSource: string;
  };
  platformEntryPlacement: PlatformEmbedContract;
}

export interface PlatformEmbedContract {
  primaryEntryRoute: string;
  secondaryEntryRoute: string;
  adminRoute: string;
  leadCaptureMode: string;
  analyticsEvents: string[];
}

export interface BuildManifest {
  version: string;
  siteId: string;
  generatedAt: string;
  source: {
    url: string;
    type: 'live_fetch' | 'html_file';
  };
  replacementGates: Record<string, string>;
  platformEmbedContract: PlatformEmbedContract;
  artifacts: string[];
  status: 'shadow_preview';
}

export interface AcceptanceReport {
  version: string;
  siteId: string;
  generatedAt: string;
  launchExposure: 'private_preview_only';
  automatedChecks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  replacementScorecard: {
    brandFidelity: null;
    operatorTimeMinutes: null;
    productIntegrity: null;
    accessibility: null;
    performance: null;
  };
  manualReviewRequired: true;
  nextActions: string[];
}
