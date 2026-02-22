#!/usr/bin/env node
/**
 * Convert hex colour to OKLCH string for CSS --primary variable.
 * Usage: node convert-color.mjs "#D60000"
 * Output: 0.50 0.22 27
 */

import { parse, converter } from 'culori';

const toOklch = converter('oklch');

export function hexToOklch(hex) {
  const parsed = parse(hex);
  if (!parsed) throw new Error(`Invalid colour: ${hex}`);
  const oklch = toOklch(parsed);
  // Format as "L C H" string (2 decimals for L and C, 0 for H)
  const l = oklch.l.toFixed(2);
  const c = (oklch.c || 0).toFixed(2);
  const h = Math.round(oklch.h || 0);
  return `${l} ${c} ${h}`;
}

// CLI mode
if (process.argv[1] && process.argv[1].endsWith('convert-color.mjs')) {
  const hex = process.argv[2];
  if (!hex) {
    console.error('Usage: node convert-color.mjs "#D60000"');
    process.exit(1);
  }
  console.log(hexToOklch(hex));
}
