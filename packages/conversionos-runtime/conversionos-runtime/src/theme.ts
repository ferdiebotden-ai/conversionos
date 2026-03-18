/**
 * Theme token resolution.
 * Reads per-tenant theme overrides from admin_settings,
 * validates with Zod, and merges with sensible defaults.
 */

import { createServiceClient } from './db/server';
import { getSiteIdAsync } from './db/site';
import { ThemeSchema, type ThemeConfig } from './schemas/theme';
import type { DesignTokens } from './section-types';

const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    primary: '0.588 0.108 180',
    secondary: '0.7 0.05 180',
    accent: '0.65 0.12 45',
    background: '0.985 0 0',
    foreground: '0.145 0 0',
    muted: '0.9 0.01 180',
  },
  typography: { headingFont: 'Plus Jakarta Sans', bodyFont: 'DM Sans' },
  borderRadius: '0.75rem',
  spacing: 'default',
  animationPreset: 'fade-in-up',
};

export async function getDesignTokens(siteId?: string): Promise<DesignTokens> {
  try {
    const resolvedSiteId = siteId ?? await getSiteIdAsync();
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('site_id', resolvedSiteId)
      .eq('key', 'theme')
      .single();
    if (!data?.value) return DEFAULT_TOKENS;
    const parsed = ThemeSchema.safeParse(data.value);
    if (!parsed.success) return DEFAULT_TOKENS;
    return mergeWithDefaults(parsed.data);
  } catch {
    return DEFAULT_TOKENS;
  }
}

function mergeWithDefaults(theme: ThemeConfig): DesignTokens {
  return {
    colors: {
      primary: theme.colors?.primary ?? DEFAULT_TOKENS.colors.primary,
      secondary: theme.colors?.secondary ?? DEFAULT_TOKENS.colors.secondary,
      accent: theme.colors?.accent ?? DEFAULT_TOKENS.colors.accent,
      background: DEFAULT_TOKENS.colors.background,
      foreground: DEFAULT_TOKENS.colors.foreground,
      muted: DEFAULT_TOKENS.colors.muted,
    },
    typography: {
      headingFont: theme.typography?.headingFont ?? DEFAULT_TOKENS.typography.headingFont,
      bodyFont: theme.typography?.bodyFont ?? DEFAULT_TOKENS.typography.bodyFont,
    },
    borderRadius: theme.borderRadius ?? DEFAULT_TOKENS.borderRadius,
    spacing: theme.spacing ?? DEFAULT_TOKENS.spacing,
    animationPreset: theme.animationPreset ?? DEFAULT_TOKENS.animationPreset,
  };
}

export { DEFAULT_TOKENS };
