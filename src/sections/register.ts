/**
 * Section registration — side-effect import.
 * Imports all 50 section components and registers them with the section registry.
 * This file is imported by SectionRenderer as a side effect.
 */

import { registerSection } from '@/lib/section-registry';
import type { SectionId } from '@/lib/section-types';

// Hero sections (5)
import { FullBleedOverlayHero } from '@/sections/hero/full-bleed-overlay';
import { SplitImageTextHero } from '@/sections/hero/split-image-text';
import { EditorialCenteredHero } from '@/sections/hero/editorial-centered';
import { VideoBackgroundHero } from '@/sections/hero/video-background';
import { GradientTextHero } from '@/sections/hero/gradient-text';

// Navigation sections (4)
import { StickySimpleNav } from '@/sections/navigation/sticky-simple';
import { StickyTransparentNav } from '@/sections/navigation/sticky-transparent';
import { SplitLogoCenterNav } from '@/sections/navigation/split-logo-center';
import { HamburgerNav } from '@/sections/navigation/hamburger';

// Services sections (5)
import { ServicesGrid3Cards } from '@/sections/services/grid-3-cards';
import { ServicesGrid2Cards } from '@/sections/services/grid-2-cards';
import { ServicesAccordionList } from '@/sections/services/accordion-list';
import { ServicesAlternatingRows } from '@/sections/services/alternating-rows';
import { ServicesBento } from '@/sections/services/bento';

// Trust sections (4)
import { TrustBadgeStrip } from '@/sections/trust/badge-strip';
import { TrustStatsCounter } from '@/sections/trust/stats-counter';
import { TrustCertifications } from '@/sections/trust/certifications';
import { TrustReviewAggregate } from '@/sections/trust/review-aggregate';

// Testimonials sections (4)
import { TestimonialsCardsCarousel } from '@/sections/testimonials/cards-carousel';
import { TestimonialsSingleFeatured } from '@/sections/testimonials/single-featured';
import { TestimonialsMasonry } from '@/sections/testimonials/masonry';
import { TestimonialsMinimalQuotes } from '@/sections/testimonials/minimal-quotes';

// Gallery sections (4)
import { GalleryMasonryGrid } from '@/sections/gallery/masonry-grid';
import { GalleryBeforeAfterSlider } from '@/sections/gallery/before-after-slider';
import { GalleryLightbox } from '@/sections/gallery/lightbox';
import { GalleryEditorialFeatured } from '@/sections/gallery/editorial-featured';

// About sections (4)
import { AboutSplitImageCopy } from '@/sections/about/split-image-copy';
import { AboutTimeline } from '@/sections/about/timeline';
import { AboutTeamGrid } from '@/sections/about/team-grid';
import { AboutValuesCards } from '@/sections/about/values-cards';

// Contact sections (4)
import { ContactFormWithMap } from '@/sections/contact/form-with-map';
import { ContactFormSimple } from '@/sections/contact/form-simple';
import { ContactDetailsSidebar } from '@/sections/contact/details-sidebar';
import { ContactCards } from '@/sections/contact/contact-cards';

// CTA sections (4)
import { CTAFullWidthPrimary } from '@/sections/cta/full-width-primary';
import { CTASplitWithImage } from '@/sections/cta/split-with-image';
import { CTAFloatingBanner } from '@/sections/cta/floating-banner';
import { CTAInlineCard } from '@/sections/cta/inline-card';

// Footer sections (4)
import { FooterMultiColumn3 } from '@/sections/footer/multi-column-3';
import { FooterMultiColumn4 } from '@/sections/footer/multi-column-4';
import { FooterSimpleCentered } from '@/sections/footer/simple-centered';
import { FooterMinimalBar } from '@/sections/footer/minimal-bar';

// Misc sections (8)
import { MiscProcessSteps } from '@/sections/misc/process-steps';
import { MiscFAQAccordion } from '@/sections/misc/faq-accordion';
import { MiscServiceAreaMap } from '@/sections/misc/service-area-map';
import { MiscPartnerLogos } from '@/sections/misc/partner-logos';
import { MiscVisualizerTeaser } from '@/sections/misc/visualizer-teaser';
import { MiscBreadcrumbHero } from '@/sections/misc/breadcrumb-hero';
import { MiscMissionStatement } from '@/sections/misc/mission-statement';
import { MiscServiceArea } from '@/sections/misc/service-area';

// ─── Register all sections ──────────────────────────────────────────────────

const sections: [SectionId, Parameters<typeof registerSection>[1]][] = [
  // Hero
  ['hero:full-bleed-overlay', FullBleedOverlayHero],
  ['hero:split-image-text', SplitImageTextHero],
  ['hero:editorial-centered', EditorialCenteredHero],
  ['hero:video-background', VideoBackgroundHero],
  ['hero:gradient-text', GradientTextHero],

  // Navigation
  ['nav:sticky-simple', StickySimpleNav],
  ['nav:sticky-transparent', StickyTransparentNav],
  ['nav:split-logo-center', SplitLogoCenterNav],
  ['nav:hamburger', HamburgerNav],

  // Services
  ['services:grid-3-cards', ServicesGrid3Cards],
  ['services:grid-2-cards', ServicesGrid2Cards],
  ['services:accordion-list', ServicesAccordionList],
  ['services:alternating-rows', ServicesAlternatingRows],
  ['services:bento', ServicesBento],

  // Trust
  ['trust:badge-strip', TrustBadgeStrip],
  ['trust:stats-counter', TrustStatsCounter],
  ['trust:certifications', TrustCertifications],
  ['trust:review-aggregate', TrustReviewAggregate],

  // Testimonials
  ['testimonials:cards-carousel', TestimonialsCardsCarousel],
  ['testimonials:single-featured', TestimonialsSingleFeatured],
  ['testimonials:masonry', TestimonialsMasonry],
  ['testimonials:minimal-quotes', TestimonialsMinimalQuotes],

  // Gallery
  ['gallery:masonry-grid', GalleryMasonryGrid],
  ['gallery:before-after-slider', GalleryBeforeAfterSlider],
  ['gallery:lightbox', GalleryLightbox],
  ['gallery:editorial-featured', GalleryEditorialFeatured],

  // About
  ['about:split-image-copy', AboutSplitImageCopy],
  ['about:timeline', AboutTimeline],
  ['about:team-grid', AboutTeamGrid],
  ['about:values-cards', AboutValuesCards],

  // Contact
  ['contact:form-with-map', ContactFormWithMap],
  ['contact:form-simple', ContactFormSimple],
  ['contact:details-sidebar', ContactDetailsSidebar],
  ['contact:contact-cards', ContactCards],

  // CTA
  ['cta:full-width-primary', CTAFullWidthPrimary],
  ['cta:split-with-image', CTASplitWithImage],
  ['cta:floating-banner', CTAFloatingBanner],
  ['cta:inline-card', CTAInlineCard],

  // Footer
  ['footer:multi-column-3', FooterMultiColumn3],
  ['footer:multi-column-4', FooterMultiColumn4],
  ['footer:simple-centered', FooterSimpleCentered],
  ['footer:minimal-bar', FooterMinimalBar],

  // Misc
  ['misc:process-steps', MiscProcessSteps],
  ['misc:faq-accordion', MiscFAQAccordion],
  ['misc:service-area-map', MiscServiceAreaMap],
  ['misc:partner-logos', MiscPartnerLogos],
  ['misc:visualizer-teaser', MiscVisualizerTeaser],
  ['misc:breadcrumb-hero', MiscBreadcrumbHero],
  ['misc:mission-statement', MiscMissionStatement],
  ['misc:service-area', MiscServiceArea],
];

for (const [id, component] of sections) {
  registerSection(id, component);
}

// ─── Custom section registry (auto-generated by build-custom-sections.mjs) ───
// This file is a no-op placeholder until custom sections are built.
// build-custom-sections.mjs overwrites it with actual tenant imports.
import './custom/registry';

// ─── Custom section loader (per-tenant dynamic import) ──────────────────────

/**
 * Register custom per-tenant sections from src/sections/custom/{siteId}/index.ts.
 * No-op until Phase 3 creates actual custom sections.
 */
export async function registerCustomSections(siteId: string) {
  try {
    const mod = await import(`./custom/${siteId}/index`);
    if (mod.registerAll) mod.registerAll();
  } catch {
    // No custom sections for this tenant — expected
  }
}
