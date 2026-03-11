/**
 * SiteBlueprint v2 — Zod validation for architect output.
 *
 * Validates the JSON produced by the Opus 4.6 architect module.
 * Used by architect.mjs to verify AI output before writing to disk.
 */

import { z } from 'zod';

const SectionEntrySchema = z.object({
  sectionId: z.string().regex(/^[a-z]+:[a-z0-9-]+$/),
  customRequired: z.boolean().optional().default(false),
  customSpec: z.string().optional(),
});

const PageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  sections: z.array(SectionEntrySchema),
});

const ThemeColorsSchema = z.object({
  primary: z.string().nullable().optional(),
  secondary: z.string().nullable().optional(),
  accent: z.string().nullable().optional(),
});

const ThemeTypographySchema = z.object({
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
});

const ThemeSchema = z.object({
  colors: ThemeColorsSchema.optional(),
  typography: ThemeTypographySchema.optional(),
  borderRadius: z.string().optional(),
  spacing: z.enum(['compact', 'default', 'spacious']).optional(),
  animationPreset: z.enum(['fade-in-up', 'stagger-reveal', 'slide-in-left', 'none']).optional(),
});

const CustomSectionSchema = z.object({
  name: z.string(),
  sectionId: z.string(),
  spec: z.string(),
  dataSource: z.string().optional(),
  referenceSection: z.string().optional(),
  // Bespoke fields — produced by bespoke-architect, consumed by build-custom-sections
  cssHints: z.string().optional(),
  contentMapping: z.string().optional(),
  integrationNotes: z.string().optional(),
});

const ContentElevationSchema = z.object({
  field: z.string().optional().default('unknown'),
  current: z.coerce.string().optional(),
  suggested: z.coerce.string().optional(),
  reason: z.string().optional(),
}).passthrough();

export const SiteBlueprintV2Schema = z.object({
  pages: z.array(PageSchema),
  theme: ThemeSchema,
  customSections: z.array(CustomSectionSchema).max(15).optional(),
  contentElevation: z.array(ContentElevationSchema).optional(),
});

/**
 * Validate a parsed object against the SiteBlueprint v2 schema.
 * @param {unknown} data - The data to validate
 * @returns {{ success: true, data: object } | { success: false, error: { message: string } }}
 */
export function validateBlueprint(data) {
  const result = SiteBlueprintV2Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: { message: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') },
  };
}
