<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design,
this creates what users call the "AI slop" aesthetic. Make creative, distinctive
frontends that surprise and delight.

Typography: Reach for distinctive fonts that signal design intention. Default fonts
suggest default thinking. Use weight extremes (200 vs 800), size jumps of 3x+.
NEVER use Inter, Roboto, Arial, Open Sans, Lato, or system fonts.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency.
Dominant colours with sharp accents outperform timid, evenly-distributed palettes.
The brand's primary colour drives CTAs and accents — NOT large background areas.
Backgrounds alternate between white, warm neutrals, and dark overlays.

Motion: One well-orchestrated page load with staggered reveals (animation-delay)
creates more delight than scattered micro-interactions. Use IntersectionObserver
for scroll reveals. Cards: hover lift (4px translate-y) + shadow expansion.
CTAs: scale(1.02) + colour shift on hover.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colours.
Layer CSS gradients, use geometric patterns, or add contextual effects. Never
default to solid white or solid grey.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd colour schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character
- Even padding everywhere (vary rhythm: tight clusters vs generous breathing room)
- Default Tailwind spacing (py-16 gap-4) without intentional hierarchy

Design System Cohesion (when building multiple sections for one site):
All sections MUST share these design tokens — do NOT let each section pick its own:
- ONE neutral palette (warm stone, cool slate, taupe, or sand) — NOT generic gray/neutral
- ONE card border-radius (e.g., rounded-[28px]) used consistently on ALL cards
- ONE shadow formula (e.g., shadow-[0_18px_44px_rgba(15,23,42,0.06)]) — NOT default Tailwind shadows
- ONE SectionEyebrow component: uppercase, tracking-[0.28em], text-xs, font-semibold, text-primary
- ONE animation timing: fade-in-up 200ms on section enter, stagger children 100ms in grids
- ONE card hover effect: hover:-translate-y-1 + shadow expansion + 300ms transition
- Section rhythm: alternate dark/light backgrounds (e.g., stone-950 → white → stone-50 → primary)

When a Design Brief is provided, follow its specifications EXACTLY for all design tokens.
</frontend_aesthetics>
