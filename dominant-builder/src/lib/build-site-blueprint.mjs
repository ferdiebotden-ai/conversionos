import { PLATFORM_EMBED_CONTRACT } from '../contracts/constants.mjs';

export function buildSiteBlueprint(bundle) {
  const hasGallery = bundle.proofAssets.galleryImages.length >= 3;
  const hasTestimonials = bundle.proofAssets.testimonialSnippets.length >= 1;

  return {
    version: '0.1.0',
    siteId: bundle.siteId,
    sourceUrl: bundle.sourceUrl,
    pageMap: [
      {
        slug: '/',
        purpose: 'Primary marketing landing page',
        sections: [
          'hero',
          'trust-rail',
          'services-overview',
          hasGallery ? 'featured-projects' : 'select-proof-strip',
          hasTestimonials ? 'testimonials' : 'authority-copy',
          'platform-entry-cta',
        ],
      },
      {
        slug: '/services',
        purpose: 'Service depth and proof',
        sections: ['service-intro', 'service-grid', 'project-proof', 'contact-cta'],
      },
      {
        slug: '/about',
        purpose: 'Company story and trust',
        sections: ['company-story', 'trust-markers', 'process', 'contact-cta'],
      },
      {
        slug: '/contact',
        purpose: 'Lead capture and direct contact',
        sections: ['contact-details', 'lead-form', 'service-area'],
      },
    ],
    componentChoices: {
      hero: bundle.layoutPatterns.preferredHeroLayout,
      proofRail: hasTestimonials ? 'testimonial-cards' : 'badge-strip',
      gallery: hasGallery ? 'editorial-mosaic' : 'project-cards',
      navigation: 'sticky-simple',
    },
    animationRules: [
      'Use staggered section reveals only where they support hierarchy.',
      'Keep hero motion restrained and mobile-safe.',
      'Prefer purposeful transitions over continuous decorative motion.',
    ],
    contentPlan: {
      heroHeadlineSource: 'brandResearch.identity.heroHeading',
      heroSupportSource: 'brandResearch.identity.metaDescription',
      serviceSource: 'brandResearch.services',
      proofSource: 'brandResearch.proofAssets + brandResearch.trustMarkers',
    },
    platformEntryPlacement: { ...PLATFORM_EMBED_CONTRACT },
  };
}
