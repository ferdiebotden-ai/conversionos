/**
 * Palette Extractor — CSS Tokens to OKLCH Colour Palette
 *
 * Takes CSS tokens (from css-tokens.json extracted by Playwright) and
 * a Design Language Document, then produces a full OKLCH colour palette
 * ready to write to admin_settings as `globals_override`.
 *
 * The output object maps CSS custom property names to OKLCH values,
 * matching the variables consumed by the ConversionOS globals.css.
 *
 * @module palette-extractor
 */

import { hexToOklch, parseOklch } from './colour-utils.mjs';
import * as logger from './logger.mjs';

/**
 * @typedef {Object} CssTokens
 * @property {string} [primaryColor] - Primary brand colour (hex or oklch)
 * @property {string} [secondaryColor] - Secondary colour
 * @property {string} [accentColor] - Accent colour
 * @property {string} [backgroundColor] - Page background colour
 * @property {string} [textColor] - Primary text colour
 * @property {string} [headingColor] - Heading text colour
 * @property {string} [borderColor] - Border/separator colour
 * @property {string} [linkColor] - Link colour
 * @property {string} [mutedColor] - Muted/subtle text colour
 * @property {string} [cardBackground] - Card/surface background
 */

/**
 * @typedef {Object} DesignLanguageDoc
 * @property {Object} [palette] - Colour palette from Design Director
 * @property {string} [palette.primary] - Primary colour
 * @property {string} [palette.secondary] - Secondary colour
 * @property {string} [palette.accent] - Accent colour
 * @property {string} [palette.background] - Background colour
 * @property {string} [palette.text] - Text colour
 */

/**
 * @typedef {Object} GlobalsOverride
 * @property {string} --primary - OKLCH primary colour
 * @property {string} --primary-foreground - OKLCH foreground for primary
 * @property {string} --accent - OKLCH accent colour
 * @property {string} --ring - OKLCH ring/focus colour
 * @property {string} --border - OKLCH border colour
 * @property {string} --background - OKLCH background colour
 * @property {string} --foreground - OKLCH text foreground colour
 * @property {string} --muted - OKLCH muted background
 * @property {string} --muted-foreground - OKLCH muted text
 * @property {string} --card - OKLCH card background
 * @property {string} --card-foreground - OKLCH card text
 */

/**
 * Convert a colour value (hex or oklch string) to an OKLCH CSS value.
 * Returns null if the input cannot be parsed.
 *
 * @param {string} colour - Hex (#rrggbb) or OKLCH string
 * @returns {string | null} OKLCH CSS value like "oklch(0.588 0.108 180)"
 */
function toOklchCss(colour) {
  if (!colour || typeof colour !== 'string') return null;

  const trimmed = colour.trim();

  // Already an oklch() value — return as-is
  if (trimmed.startsWith('oklch(')) return trimmed;

  // Raw OKLCH triplet (e.g. "0.588 0.108 180")
  const oklch = parseOklch(trimmed);
  if (oklch) {
    return `oklch(${oklch.L.toFixed(3)} ${oklch.C.toFixed(3)} ${oklch.H.toFixed(1)})`;
  }

  // Hex colour
  if (trimmed.startsWith('#')) {
    const converted = hexToOklch(trimmed);
    if (converted) {
      return `oklch(${converted.L.toFixed(3)} ${converted.C.toFixed(3)} ${converted.H.toFixed(1)})`;
    }
  }

  return null;
}

/**
 * Derive a foreground colour from a background OKLCH value.
 * Light backgrounds (L > 0.6) get dark text; dark backgrounds get white text.
 *
 * @param {string} oklchCss - OKLCH CSS value
 * @returns {string} OKLCH CSS value for the foreground
 */
function deriveForeground(oklchCss) {
  const parsed = parseOklch(oklchCss);
  if (!parsed) return 'oklch(0.145 0 0)';
  return parsed.L > 0.6 ? 'oklch(0.145 0 0)' : 'oklch(0.985 0 0)';
}

/**
 * Derive a muted variant from a base colour.
 * Reduces chroma and shifts lightness toward mid-range.
 *
 * @param {string} oklchCss - Base OKLCH CSS value
 * @param {number} [lightnessTarget=0.92] - Target lightness for muted background
 * @returns {string} OKLCH CSS muted value
 */
function deriveMuted(oklchCss, lightnessTarget = 0.92) {
  const parsed = parseOklch(oklchCss);
  if (!parsed) return `oklch(${lightnessTarget} 0.01 0)`;
  return `oklch(${lightnessTarget.toFixed(3)} ${Math.max(parsed.C * 0.15, 0.005).toFixed(3)} ${parsed.H.toFixed(1)})`;
}

/**
 * Derive a ring/focus colour from the primary — slightly lighter with reduced chroma.
 *
 * @param {string} primaryOklch - Primary OKLCH CSS value
 * @returns {string} OKLCH CSS ring value
 */
function deriveRing(primaryOklch) {
  const parsed = parseOklch(primaryOklch);
  if (!parsed) return 'oklch(0.6 0.1 180)';
  const ringL = Math.min(parsed.L + 0.1, 0.85);
  const ringC = parsed.C * 0.7;
  return `oklch(${ringL.toFixed(3)} ${ringC.toFixed(3)} ${parsed.H.toFixed(1)})`;
}

/**
 * Derive a border colour — very subtle, low-chroma version of primary hue.
 *
 * @param {string} primaryOklch - Primary OKLCH CSS value
 * @returns {string} OKLCH CSS border value
 */
function deriveBorder(primaryOklch) {
  const parsed = parseOklch(primaryOklch);
  if (!parsed) return 'oklch(0.88 0.01 0)';
  return `oklch(0.88 ${Math.max(parsed.C * 0.08, 0.003).toFixed(3)} ${parsed.H.toFixed(1)})`;
}

/**
 * Extract a full OKLCH colour palette from CSS tokens and a Design Language Document.
 *
 * Priority: Design Language Document values > CSS tokens > derived defaults.
 * All outputs are OKLCH CSS values ready for globals_override injection.
 *
 * @param {CssTokens} cssTokens - CSS tokens from Playwright extraction
 * @param {DesignLanguageDoc} [designLanguage={}] - Design Language Document from Design Director
 * @returns {GlobalsOverride} globals_override JSON ready for admin_settings
 */
export function extractPalette(cssTokens = {}, designLanguage = {}) {
  const dld = designLanguage.palette || {};

  // ── Resolve primary ────────────────────────────────────────────────
  const primary = toOklchCss(dld.primary)
    || toOklchCss(cssTokens.primaryColor)
    || toOklchCss(cssTokens.linkColor)
    || 'oklch(0.588 0.108 180)'; // ConversionOS teal default

  // ── Resolve accent ─────────────────────────────────────────────────
  const accent = toOklchCss(dld.accent)
    || toOklchCss(cssTokens.accentColor)
    || toOklchCss(cssTokens.secondaryColor)
    || primary; // fall back to primary if no accent detected

  // ── Resolve background ─────────────────────────────────────────────
  const background = toOklchCss(dld.background)
    || toOklchCss(cssTokens.backgroundColor)
    || 'oklch(0.985 0 0)'; // near-white default

  // ── Resolve foreground ─────────────────────────────────────────────
  const foreground = toOklchCss(dld.text)
    || toOklchCss(cssTokens.textColor)
    || toOklchCss(cssTokens.headingColor)
    || deriveForeground(background);

  // ── Derive remaining colours ───────────────────────────────────────
  const primaryForeground = deriveForeground(primary);
  const muted = toOklchCss(cssTokens.mutedColor)
    ? deriveMuted(toOklchCss(cssTokens.mutedColor))
    : deriveMuted(primary);
  const mutedForeground = deriveForeground(muted);
  const card = toOklchCss(cssTokens.cardBackground) || background;
  const cardForeground = deriveForeground(card);
  const ring = deriveRing(primary);
  const border = toOklchCss(cssTokens.borderColor) || deriveBorder(primary);

  const result = {
    '--primary': primary,
    '--primary-foreground': primaryForeground,
    '--accent': accent,
    '--ring': ring,
    '--border': border,
    '--background': background,
    '--foreground': foreground,
    '--muted': muted,
    '--muted-foreground': mutedForeground,
    '--card': card,
    '--card-foreground': cardForeground,
  };

  logger.info('Palette extracted', {
    primary,
    accent,
    background,
    foreground,
    variableCount: Object.keys(result).length,
  });

  return result;
}
