/**
 * Shared Colour Utilities
 * OKLCH/sRGB colour conversion, Delta-E comparison, and WCAG contrast checks.
 * Extracted from content-integrity.mjs for reuse across QA modules.
 */

/**
 * Parse an OKLCH CSS value to components.
 * Accepts both "oklch(L C H)" and raw "L C H" formats.
 * @param {string} oklchStr
 * @returns {{ L: number, C: number, H: number } | null}
 */
export function parseOklch(oklchStr) {
  const match = oklchStr.match(/(?:oklch\(\s*)?([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!match) return null;
  return { L: parseFloat(match[1]), C: parseFloat(match[2]), H: parseFloat(match[3]) };
}

/**
 * Parse a hex colour string into { r, g, b } (0-255).
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function parseHex(hex) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

/**
 * Convert sRGB (0-255) to linear RGB.
 * @param {number} c — 0-255 channel value
 * @returns {number}
 */
export function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB to OKLAB { L, a, b }.
 * Uses the standard sRGB -> OKLAB conversion via LMS intermediary.
 */
export function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2220049174 * lg + 0.6896926208 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/**
 * Convert hex colour to OKLCH { L, C, H }.
 * @param {string} hex
 * @returns {{ L: number, C: number, H: number } | null}
 */
export function hexToOklch(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const lab = rgbToOklab(rgb.r, rgb.g, rgb.b);
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let H = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return { L: lab.L, C, H };
}

/**
 * Compute Delta-E (OKLCH) between two colours.
 * Uses simple Euclidean distance in OKLCH space with hue wrapping.
 * @param {{ L: number, C: number, H: number }} a
 * @param {{ L: number, C: number, H: number }} b
 * @returns {number} — distance (< 5 is a close match)
 */
export function deltaE_oklch(a, b) {
  const dL = (a.L - b.L) * 100;
  const dC = (a.C - b.C) * 100;
  let dH = a.H - b.H;
  if (dH > 180) dH -= 360;
  if (dH < -180) dH += 360;
  const avgC = (a.C + b.C) / 2;
  const hueWeight = avgC * 100 * (dH / 180);
  return Math.sqrt(dL * dL + dC * dC + hueWeight * hueWeight);
}

/**
 * Compute relative luminance from hex colour (WCAG 2.1 formula).
 * @param {string} hex
 * @returns {number} — 0-1
 */
export function relativeLuminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute WCAG contrast ratio between two hex colours.
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number} — ratio (1:1 to 21:1)
 */
export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Compute simple Levenshtein distance between two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}
