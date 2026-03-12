/**
 * Auto-generated custom section manifest.
 * Created by build-custom-sections.mjs — do not edit manually.
 */

import { registerSection } from '@/lib/section-registry';
import type { SectionId } from '@/lib/section-types';
import type { SectionComponent } from '@/lib/section-registry';

import { HeroSection, ServicesSection, AboutSection, Footer, Testimonials, OurProcess, WhyChooseUs } from './go-hard-corporation-sections';

// Register sections at module load time (side-effect import)
registerSection('custom:go-hard-corporation-hero' as SectionId, HeroSection as SectionComponent);
registerSection('custom:go-hard-corporation-services' as SectionId, ServicesSection as SectionComponent);
registerSection('custom:go-hard-corporation-about' as SectionId, AboutSection as SectionComponent);
registerSection('custom:go-hard-corporation-footer' as SectionId, Footer as SectionComponent);
registerSection('custom:go-hard-corporation-testimonials' as SectionId, Testimonials as SectionComponent);
registerSection('custom:go-hard-corporation-process' as SectionId, OurProcess as SectionComponent);
registerSection('custom:go-hard-corporation-why-us' as SectionId, WhyChooseUs as SectionComponent);
