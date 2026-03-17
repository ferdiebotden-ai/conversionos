# NorBot Brand Overrides for taste-skill

These override taste-skill defaults for ConversionOS contractor website builds.

## Dial Adjustments

| Dial | Default | NorBot | Reason |
|------|---------|--------|--------|
| DESIGN_VARIANCE | 8 | 5 | Contractor sites need professional, not artsy. Their customers are homeowners, not designers. |
| MOTION_INTENSITY | 6 | 7 | Our animation features ARE the product differentiator. The visualiser, voice agent, and scroll effects sell the platform. |
| VISUAL_DENSITY | 4 | 3 | Renovation sites need breathing room for high-quality project imagery. Let the photos speak. |

## Brand Rules (Override taste-skill)

- **Primary accent:** teal #0D9488 (OKLCH 0.55 0.15 170). This IS our colour. Not subject to the "Lila Ban" — teal is neither purple nor blue.
- **Centred heroes ARE allowed.** Many contractor brands expect centred layouts. Override taste-skill's anti-centre bias when the contractor's original site uses centred design. Only use asymmetric when brand warrants it.
- **Canadian spelling:** colour, centre, favourite, visualiser, licence, defence. Non-negotiable across all copy.
- **Inter font ban:** KEEP. We use per-tenant brand fonts extracted via Firecrawl branding. If no brand font detected, use the tenant's closest Google Font match — never default to Inter.
- **Serif constraint:** RELAX for editorial/luxury renovation brands. Some high-end contractors (e.g., custom home builders) benefit from serif headings. Evaluate per-brand.
- **3-column card ban:** RELAX for services sections. Contractors typically have 3-6 core services. A clean 3-column grid IS appropriate here — taste-skill's zig-zag alternative can feel forced.

## ConversionOS-Specific Rules

- **Never use placeholder images.** Every image must come from the contractor's scraped portfolio, AI generation (Gemini), or Supabase Storage. No Unsplash, no picsum.photos.
- **Demo leakage is a P0 bug.** "NorBot", "ConversionOS", "Lorem ipsum", "placeholder", "TODO" must NEVER appear on a tenant site.
- **AI features are the hero.** The visualiser before/after animation, voice widget, and quote engine are what differentiate us. Give them visual prominence.
- **CASL compliance.** All CTAs must comply with Canadian Anti-Spam Legislation. No misleading button text.

## When to Apply These Overrides

Load `norbot-overrides.md` alongside `taste/SKILL.md` whenever building or reviewing ConversionOS tenant websites. The overrides take precedence where they conflict with taste-skill defaults.
