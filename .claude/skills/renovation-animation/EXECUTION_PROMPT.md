# Build: Renovation Visualiser Teardown Animation

You are building a premium animation feature for ConversionOS — NorBot Systems' renovation contractor website platform.

## Vision

Enhance the existing before/after visualiser in the hero section with a construction teardown/assembly animation. When a homeowner interacts with the slider, instead of a simple opacity crossfade, the "before" image fragments apart like construction materials being removed, and the "after" image assembles from fragments flying into place.

The effect should be **subtle, elegant, and professional** — not dramatic or jarring. Think premium renovation marketing, not a video game. It must feel like the slider is "constructing" the renovation in real time.

## Where This Lives

- This is a **platform feature**, available to ALL builds (tenant-builder, warm-leads, showcase)
- It enhances the existing hero visualiser box — same dimensions, same layout, same style tabs
- The **slider interaction** (drag/touch) drives the animation — NOT page scroll
- Register as `hero:visualizer-teardown` alongside existing `hero:visualizer-showcase`
- The two hero variants coexist — tenants choose which one via their homepage layout config

## What Already Exists — Read These First

Before writing any code, read these files to understand the existing patterns:

1. **`src/sections/hero/visualizer-showcase.tsx`** — The current hero with opacity slider. THIS IS YOUR STARTING POINT. Same props interface, same image config, same style tabs, same CTA. You're enhancing the transition animation, not redesigning the section.

2. **`src/lib/fragment-utils.ts`** — Pre-built pure math for Voronoi fragment generation + scatter trajectories. Import `generateFragments()`, `interpolateFragment()`, and the `Fragment` type. You don't need to write the math — just use it.

3. **`src/components/motion.tsx`** — Framer Motion wrappers already in the project. Uses `useScroll`, `useTransform`, `useMotionValue`, `useInView`, `useReducedMotion`. Follow the same patterns.

4. **`src/lib/animations.ts`** — Existing animation variants (fadeInUp, staggerContainer, spring easing). Use these for consistent motion language.

5. **`.claude/skills/taste/SKILL.md`** — Premium design principles. READ THIS for the quality bar. Key rules: GPU-safe animations (transform+opacity only), no GSAP, spring physics for premium feel, anti-generic patterns.

6. **`.claude/skills/taste/norbot-overrides.md`** — NorBot-specific design constraints. MOTION_INTENSITY=7 (animations are our differentiator), VISUAL_DENSITY=3 (breathing room for imagery).

7. **`src/sections/register.ts`** — Where sections are registered. Add your new hero here.

## Design Constraints

- **Slider-driven:** The existing drag handle controls the animation. Slider position 0-100% maps to the teardown→assembly transition. Use `fragment-utils.ts` → `interpolateFragment(position, fragment, phase)`.
- **Existing hero box preserved:** Aspect ratio 16/10, max 600px on mobile. Same outer container. Same headline, badges, CTA placement.
- **Style tabs:** Modern, Farmhouse, Industrial tabs must work. Switching styles shows that style's assembly animation. The `HeroVisualizerImages` config provides `styles: Array<{label, after}>`.
- **Auto-intro on mount:** Same entrance as current — smooth reveal animation when above the fold.
- **`useReducedMotion()`** → Falls back to the current opacity slider (no fragments). This is non-negotiable.
- **Keyboard accessible:** Arrow keys (10% steps), Home (0%), End (100%). Same as current.
- **Mobile-friendly:** Touch drag, 60fps at 375px. No scroll interference.
- **GPU-safe:** Animate ONLY `transform` and `opacity`. Never animate `top`, `left`, `width`, `height`, `clip-path` dynamically. The `clip-path` on each fragment is STATIC (set once at mount). Only `transform` and `opacity` change during drag.
- **No GSAP:** Use Framer Motion only (already installed, v12.34.0).

## Image Configuration

```typescript
interface HeroVisualizerImages {
  before: string;           // "/images/hero/before-kitchen.png"
  styles: Array<{
    label: string;          // "Modern" | "Farmhouse" | "Industrial"
    after: string;          // "/images/hero/after-modern.png"
  }>;
}
```

Read from `config.heroVisualizerImages` (via `CompanyConfig`). Falls back to `DEFAULT_BEFORE` + `DEFAULT_STYLES` if not set (same hardcoded defaults as `visualizer-showcase.tsx`).

## Your Job

1. Read the reference files listed above
2. Design the animation — you are the design expert. I trust your judgment on fragment count, easing curves, visual style, and interaction polish. Make it premium.
3. Build `src/sections/hero/visualizer-teardown.tsx`
4. Register in `src/sections/register.ts` as `hero:visualizer-teardown`
5. `npm run build` must pass clean
6. Visual test: `npm run dev`, test at 375px, 768px, 1440px
7. Verify `useReducedMotion()` fallback works (should render standard opacity slider)
8. Test style tab switching — each tab should animate with correct after image

## Quality Bar

This is the HERO SECTION — the very first thing a contractor and their customers see when they land on the website. Apply taste-skill principles:

- Premium spring physics, not linear easing
- Tactile feedback on slider interaction
- Smooth state transitions between style tabs
- No AI slop: no generic shadows, no template feel, no default patterns
- The animation should make someone stop and say "wow, that's elegant" — not "wow, that's flashy"

When you're done, the animation should feel like it was hand-crafted by a senior motion designer, not generated by an AI.
