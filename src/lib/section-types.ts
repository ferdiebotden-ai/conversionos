import type { Branding } from './branding';
import type { CompanyConfig } from './ai/knowledge/company';

/** Design tokens derived from the tenant's brand */
export interface DesignTokens {
  colors: {
    primary: string;      // OKLCH
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  borderRadius: string;
  spacing: 'compact' | 'default' | 'spacious';
  animationPreset: 'fade-in-up' | 'stagger-reveal' | 'slide-in-left' | 'none';
}

/** Base props every section receives */
export interface SectionBaseProps {
  branding: Branding;
  config: CompanyConfig;
  tokens?: DesignTokens | undefined;
  animationPreset?: 'fade-in-up' | 'stagger-reveal' | 'slide-in-left' | 'none' | undefined;
  className?: string | undefined;
}

/** Section identifier: "category:variant" e.g. "hero:full-bleed-overlay" */
export type SectionId = `${string}:${string}`;

/** Page layout config stored in admin_settings */
export interface PageLayout {
  [pageSlug: string]: SectionId[];
}
