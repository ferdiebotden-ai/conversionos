/**
 * Auto-generated custom section manifest.
 * Created by build-custom-sections.mjs — do not edit manually.
 */

import { registerSection } from '@/lib/section-registry';
import type { SectionId } from '@/lib/section-types';
import type { SectionComponent } from '@/lib/section-registry';

import { HeroSection, ServicesSection, AboutSection, Footer, ProjectGallery, WhyChooseUs } from './westmount-craftsmen-sections';

// Register sections at module load time (side-effect import)
registerSection('custom:westmount-craftsmen-hero' as SectionId, HeroSection as SectionComponent);
registerSection('custom:westmount-craftsmen-services' as SectionId, ServicesSection as SectionComponent);
registerSection('custom:westmount-craftsmen-about' as SectionId, AboutSection as SectionComponent);
registerSection('custom:westmount-craftsmen-footer' as SectionId, Footer as SectionComponent);
registerSection('custom:westmount-craftsmen-gallery' as SectionId, ProjectGallery as SectionComponent);
registerSection('custom:westmount-craftsmen-why-us' as SectionId, WhyChooseUs as SectionComponent);
