/**
 * Auto-generated custom section manifest.
 * Created by build-custom-sections.mjs — do not edit manually.
 */

import { registerSection } from '@/lib/section-registry';
import type { SectionId } from '@/lib/section-types';
import type { SectionComponent } from '@/lib/section-registry';

import { StickyNavigationBar } from './sticky-navigation-bar';
import { FullWidthHeroWithDarkOverlay } from './full-width-hero-with-dark-overlay';
import { CompanyIntroductionBand } from './company-introduction-band';
import { ServicesCardGrid } from './services-card-grid';
import { PortfolioShowcaseStrip } from './portfolio-showcase-strip';
import { AboutPageCompanyStory } from './about-page-company-story';
import { AboutPageValuesWhyChooseUs } from './about-page-values-why-choose-us';
import { ServicesPageDetailedServiceBlocks } from './services-page-detailed-service-blocks';
import { ContactPageSplitLayout } from './contact-page-split-layout';
import { ProjectsPageFilterableGallery } from './projects-page-filterable-gallery';
import { SiteFooter } from './site-footer';

// Register sections at module load time (side-effect import)
registerSection('custom:md-construction-navbar' as SectionId, StickyNavigationBar as SectionComponent);
registerSection('custom:md-construction-hero' as SectionId, FullWidthHeroWithDarkOverlay as SectionComponent);
registerSection('custom:md-construction-intro-strip' as SectionId, CompanyIntroductionBand as SectionComponent);
registerSection('custom:md-construction-services-grid' as SectionId, ServicesCardGrid as SectionComponent);
registerSection('custom:md-construction-portfolio-showcase' as SectionId, PortfolioShowcaseStrip as SectionComponent);
registerSection('custom:md-construction-about-story' as SectionId, AboutPageCompanyStory as SectionComponent);
registerSection('custom:md-construction-values-grid' as SectionId, AboutPageValuesWhyChooseUs as SectionComponent);
registerSection('custom:md-construction-services-detail' as SectionId, ServicesPageDetailedServiceBlocks as SectionComponent);
registerSection('custom:md-construction-contact-split' as SectionId, ContactPageSplitLayout as SectionComponent);
registerSection('custom:md-construction-portfolio-gallery' as SectionId, ProjectsPageFilterableGallery as SectionComponent);
registerSection('custom:md-construction-footer' as SectionId, SiteFooter as SectionComponent);
