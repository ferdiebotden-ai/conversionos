# Design Brief — Cohesive Design System for Section Generation

You are generating a DESIGN BRIEF — a condensed design system specification that ensures
all homepage sections feel like they were designed by one senior designer, not assembled
from independent pieces.

## Inputs Available
- Design Language Document (from Design Director)
- CSS tokens (from original site)
- Brand colours (primary, neutrals)

## Output: Design Brief (JSON)

Produce a JSON object with these EXACT fields:

```json
{
  "neutralPalette": "warm-stone | cool-slate | taupe | sand",
  "neutralShades": {
    "darkest": "stone-950 | slate-950 | neutral-900",
    "dark": "stone-800 | slate-800 | neutral-700",
    "medium": "stone-600 | slate-500 | neutral-500",
    "light": "stone-200 | slate-200 | neutral-200",
    "lightest": "stone-50 | slate-50 | neutral-50"
  },
  "cardRadius": "rounded-xl | rounded-2xl | rounded-[28px] | rounded-3xl",
  "shadowFormula": "shadow-[0_Xpx_Ypx_rgba(R,G,B,A)]",
  "sectionEyebrow": {
    "fontSize": "text-xs | text-[11px]",
    "weight": "font-semibold | font-bold",
    "tracking": "tracking-[0.28em] | tracking-widest",
    "transform": "uppercase",
    "colour": "text-primary | text-primary/80"
  },
  "sectionPadding": {
    "desktop": "py-24 | py-28 | py-32",
    "mobile": "py-14 | py-16 | py-20"
  },
  "animationPreset": "fade-up-stagger | slide-in-directional | scale-reveal",
  "typographyPairing": {
    "headingFont": "font-heading (Poppins / Montserrat / etc.)",
    "bodyFont": "font-body (Inter / Source Sans / etc.)",
    "headingWeight": "font-semibold | font-bold",
    "headingSizeScale": "text-4xl md:text-5xl lg:text-6xl"
  },
  "sectionRhythm": "dark-light-dark | light-dark-light | gradient-transitions",
  "imageHoverEffect": "group-hover:scale-105 | group-hover:brightness-110",
  "cardHoverEffect": "hover:-translate-y-1 hover:shadow-xl | hover:scale-[1.02]"
}
```

## Rules
1. Choose ONE neutral palette (warm stone, cool slate, taupe, or sand) based on the original site's feel. Do NOT use generic neutral/gray.
2. All card radius values must be CONSISTENT across every section.
3. The shadow formula must be ONE formula used everywhere (not default Tailwind shadows).
4. The section eyebrow pattern appears on EVERY section — same style everywhere.
5. Typography pairing must avoid AI slop fonts (no Inter + Roboto, no Arial + Helvetica).
6. Section rhythm defines the dark/light alternation pattern for background colours.
