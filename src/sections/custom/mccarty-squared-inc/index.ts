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
import { Testimonials } from './testimonials';
import { OurProcess } from './our-process';
import { WhyChooseUs } from './why-choose-us';

// Register sections at module load time (side-effect import)
registerSection('custom:mccarty-squared-inc-hero' as SectionId, HeroSection as SectionComponent);
registerSection('custom:mccarty-squared-inc-services' as SectionId, ServicesSection as SectionComponent);
registerSection('custom:mccarty-squared-inc-about' as SectionId, AboutSection as SectionComponent);
registerSection('custom:mccarty-squared-inc-testimonials' as SectionId, Testimonials as SectionComponent);
registerSection('custom:mccarty-squared-inc-process' as SectionId, OurProcess as SectionComponent);
registerSection('custom:mccarty-squared-inc-why-us' as SectionId, WhyChooseUs as SectionComponent);
