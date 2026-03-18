/**
 * Theme configuration schema.
 * Validates per-tenant theme overrides stored in admin_settings.
 */

import { z } from 'zod';

export const ThemeSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
  }).optional(),
  typography: z.object({
    headingFont: z.string(),
    bodyFont: z.string(),
  }).optional(),
  borderRadius: z.string().optional(),
  spacing: z.enum(['compact', 'default', 'spacious']).optional(),
  animationPreset: z.enum(['fade-in-up', 'stagger-reveal', 'slide-in-left', 'none']).optional(),
});

export type ThemeConfig = z.infer<typeof ThemeSchema>;
