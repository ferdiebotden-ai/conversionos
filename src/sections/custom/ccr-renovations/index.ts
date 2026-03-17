/**
 * CCR Renovations — custom section manifest.
 * Warm-lead bespoke build.
 */

import { registerSection } from '@/lib/section-registry';
import type { SectionId } from '@/lib/section-types';
import type { SectionComponent } from '@/lib/section-registry';

import { HeroSlider } from './hero-slider';
import { IntroHeadline } from './intro-headline';
import { ServicesCarousel } from './services-carousel';
import { TestimonialBand } from './testimonial-band';
import { FeaturedProjects } from './featured-projects';
import { TeamRow } from './team-row';
import { TrustExperience } from './trust-experience';
import { ContactCtaBand } from './contact-cta-band';
import { AboutStory } from './about-story';
import { ServicesGrid } from './services-grid';
import { ContactSplit } from './contact-split';
import { PageHeader } from './page-header';

// Homepage sections
registerSection('custom:ccr-hero-slider' as SectionId, HeroSlider as SectionComponent);
registerSection('custom:ccr-intro-headline' as SectionId, IntroHeadline as SectionComponent);
registerSection('custom:ccr-services-carousel' as SectionId, ServicesCarousel as SectionComponent);
registerSection('custom:ccr-testimonial-band' as SectionId, TestimonialBand as SectionComponent);
registerSection('custom:ccr-featured-projects' as SectionId, FeaturedProjects as SectionComponent);
registerSection('custom:ccr-team-row' as SectionId, TeamRow as SectionComponent);
registerSection('custom:ccr-trust-experience' as SectionId, TrustExperience as SectionComponent);
registerSection('custom:ccr-contact-cta-band' as SectionId, ContactCtaBand as SectionComponent);

// Inner page sections
registerSection('custom:ccr-about-story' as SectionId, AboutStory as SectionComponent);
registerSection('custom:ccr-services-grid' as SectionId, ServicesGrid as SectionComponent);
registerSection('custom:ccr-contact-split' as SectionId, ContactSplit as SectionComponent);
registerSection('custom:ccr-page-header' as SectionId, PageHeader as SectionComponent);

// Reuse sections across pages (only aliases that map to DIFFERENT content)
registerSection('custom:ccr-team-expanded' as SectionId, TeamRow as SectionComponent);
registerSection('custom:ccr-seen-on-tv' as SectionId, TrustExperience as SectionComponent);
