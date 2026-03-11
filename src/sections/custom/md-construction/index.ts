/**
 * Auto-generated custom section manifest.
 * Created by build-custom-sections.mjs — do not edit manually.
 */

import { registerSection } from '@/lib/section-registry';
import type { SectionId } from '@/lib/section-types';
import type { SectionComponent } from '@/lib/section-registry';

import { HeroSection } from './hero-section';
import { ServicesSection } from './services-section';
import { AboutSection } from './about-section';
import { Footer } from './footer';
import { ProjectGallery } from './project-gallery';

// Register sections at module load time (side-effect import)
registerSection('custom:md-construction-hero' as SectionId, HeroSection as SectionComponent);
registerSection('custom:md-construction-services' as SectionId, ServicesSection as SectionComponent);
registerSection('custom:md-construction-about' as SectionId, AboutSection as SectionComponent);
registerSection('custom:md-construction-footer' as SectionId, Footer as SectionComponent);
registerSection('custom:md-construction-gallery' as SectionId, ProjectGallery as SectionComponent);
