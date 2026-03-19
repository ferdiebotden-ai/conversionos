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
import { OurProcess } from './our-process';
import { WhyChooseUs } from './why-choose-us';

// Register sections at module load time (side-effect import)
registerSection('custom:bl-renovations-hero' as SectionId, HeroSection as SectionComponent);
registerSection('custom:bl-renovations-services' as SectionId, ServicesSection as SectionComponent);
registerSection('custom:bl-renovations-about' as SectionId, AboutSection as SectionComponent);
registerSection('custom:bl-renovations-footer' as SectionId, Footer as SectionComponent);
registerSection('custom:bl-renovations-gallery' as SectionId, ProjectGallery as SectionComponent);
registerSection('custom:bl-renovations-process' as SectionId, OurProcess as SectionComponent);
registerSection('custom:bl-renovations-why-us' as SectionId, WhyChooseUs as SectionComponent);
