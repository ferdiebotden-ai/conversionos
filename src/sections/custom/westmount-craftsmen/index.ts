/**
 * Auto-generated custom section manifest.
 * Created by build-custom-sections.mjs — do not edit manually.
 */

import { registerSection } from '@/lib/section-registry';
import type { SectionId } from '@/lib/section-types';
import type { SectionComponent } from '@/lib/section-registry';

import { NavigationBar } from './navigation-bar';
import { HeroSection } from './hero-section';
import { TrustBadgeBar } from './trust-badge-bar';
import { ServicesGrid } from './services-grid';
import { AboutSplitSection } from './about-split-section';
import { PortfolioGalleryMosaic } from './portfolio-gallery-mosaic';
import { TestimonialSection } from './testimonial-section';
import { Footer } from './footer';
import { AboutStorySection } from './about-story-section';
import { CompanyValuesSection } from './company-values-section';
import { ServicesDetailList } from './services-detail-list';
import { ContactSplitSection } from './contact-split-section';
import { PortfolioGridFull } from './portfolio-grid-full';

// Register sections at module load time (side-effect import)
registerSection('custom:westmount-craftsmen-nav' as SectionId, NavigationBar as SectionComponent);
registerSection('custom:westmount-craftsmen-hero' as SectionId, HeroSection as SectionComponent);
registerSection('custom:westmount-craftsmen-trust-bar' as SectionId, TrustBadgeBar as SectionComponent);
registerSection('custom:westmount-craftsmen-services-grid' as SectionId, ServicesGrid as SectionComponent);
registerSection('custom:westmount-craftsmen-about-split' as SectionId, AboutSplitSection as SectionComponent);
registerSection('custom:westmount-craftsmen-gallery-mosaic' as SectionId, PortfolioGalleryMosaic as SectionComponent);
registerSection('custom:westmount-craftsmen-testimonial' as SectionId, TestimonialSection as SectionComponent);
registerSection('custom:westmount-craftsmen-footer' as SectionId, Footer as SectionComponent);
registerSection('custom:westmount-craftsmen-about-story' as SectionId, AboutStorySection as SectionComponent);
registerSection('custom:westmount-craftsmen-values' as SectionId, CompanyValuesSection as SectionComponent);
registerSection('custom:westmount-craftsmen-services-detail' as SectionId, ServicesDetailList as SectionComponent);
registerSection('custom:westmount-craftsmen-contact-split' as SectionId, ContactSplitSection as SectionComponent);
registerSection('custom:westmount-craftsmen-portfolio-grid' as SectionId, PortfolioGridFull as SectionComponent);
