# ConversionOS Integration Specification

Every bespoke section MUST follow these rules for seamless ConversionOS integration.

## Component Pattern

```tsx
'use client';

import type { SectionBaseProps } from '@/lib/section-types';

export function SectionName({ branding, config, tokens, className }: SectionBaseProps) {
  // Helper to safely read string fields from config
  function str(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }

  // Dual-lookup: provisioner stores camelCase, but guard against snake_case too
  const headline = str(config['heroHeadline']) || str(config['hero_headline']);

  return (
    <section className={`py-12 md:py-20 ${className ?? ''}`}>
      {/* Section content */}
    </section>
  );
}
```

## Required

- `'use client'` directive at top of file
- Named export (not default export)
- Accept `SectionBaseProps` — use `branding`, `config`, `tokens` for tenant data
- `config` is typed as `CompanyConfig` (alias for `Record<string, unknown>`) — always access via bracket notation
- Use Tailwind CSS v4 for all styling
- Mobile-first responsive: base → `sm:` → `md:` → `lg:` → `xl:`
- **Never return `null` for missing images** — use gradient fallback (see Graceful Image Fallbacks)
- Only return `null` if the section has zero usable data (no text, no images, no config at all)
- Do NOT import external packages — only use project imports

## Branding Data Access

```tsx
// Company info — from branding prop
branding.name          // "MD Construction"
branding.phone         // "(519) 555-1234" — may be null, always guard
branding.email         // "info@mdconstruction.com"
branding.address       // "123 Main St, Stratford, ON"
branding.logo_url      // URL to logo image

// Company profile data — from config prop (Record<string, unknown>)
// IMPORTANT: The provisioner stores fields in camelCase.
// Always use the str() helper and dual-lookup pattern:
const heroHeadline    = str(config['heroHeadline'])    || str(config['hero_headline']);
const heroSubheadline = str(config['heroSubheadline']) || str(config['hero_subheadline']);
const heroImageUrl    = str(config['heroImageUrl'])    || str(config['hero_image_url']);
const aboutCopy       = str(config['aboutCopy'])       || str(config['about_copy']) || str(config['about_text']);
const aboutImageUrl   = str(config['aboutImageUrl'])   || str(config['about_image_url']);
const logoUrl         = str(config['logoUrl'])         || str(config['logo_url']);
const serviceArea     = str(config['serviceArea'])     || str(config['service_area']);
const hours           = str(config['hours']);
const mission         = str(config['mission']);
const principals      = str(config['principals']);

// Array fields — always default to empty array
const services       = Array.isArray(config['services'])       ? config['services']       : [];
const testimonials   = Array.isArray(config['testimonials'])   ? config['testimonials']   : [];
const portfolio      = Array.isArray(config['portfolio'])      ? config['portfolio']      : [];
const whyChooseUs    = Array.isArray(config['whyChooseUs'])    ? config['whyChooseUs']    : [];
const certifications = Array.isArray(config['certifications']) ? config['certifications'] : [];

// Object fields
const trustMetrics   = (config['trustMetrics'] && typeof config['trustMetrics'] === 'object')
                       ? config['trustMetrics'] as Record<string, unknown>
                       : null;

// Design tokens — from tokens prop
tokens?.colors?.primary       // OKLCH colour string
tokens?.typography?.headingFont  // "Plus Jakarta Sans"
tokens?.typography?.bodyFont     // "DM Sans"
tokens?.borderRadius            // "0.75rem"
tokens?.spacing                 // "compact" | "default" | "spacious"
tokens?.animationPreset         // "fade-in-up" | "stagger-reveal" | "none"
```

## Field Name Reference

All `company_profile` fields stored by the provisioner. **Primary names are camelCase.**

| Field | Type | Example |
|-------|------|---------|
| `heroHeadline` | string | "Building Your Dream Home" |
| `heroSubheadline` | string | "Ontario's Trusted Renovation Experts" |
| `heroImageUrl` | string | URL to hero background image |
| `aboutCopy` | string | Multi-paragraph about text |
| `aboutImageUrl` | string | URL to about section image |
| `logoUrl` | string | URL to company logo |
| `services` | array | `[{ name, description, image_urls }]` |
| `testimonials` | array | `[{ author, quote, rating }]` |
| `portfolio` | array | `[{ title, description, image_url }]` |
| `trustMetrics` | object | `{ yearsInBusiness, projectsCompleted, satisfaction }` |
| `whyChooseUs` | array | `["Licensed & Insured", "25+ Years Experience"]` |
| `principals` | string | "John Smith, Master Builder" |
| `certifications` | array | `["WSIB", "Licensed Contractor"]` |
| `serviceArea` | string | "Stratford, Kitchener-Waterloo, and surrounding areas" |
| `hours` | string | "Mon-Fri 8am-5pm" |
| `mission` | string | Company mission statement |

## Mandatory Dual-Lookup Pattern

Because `config` is `Record<string, unknown>`, always use this helper and dual-lookup:

```tsx
// Define inside the component function
function str(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }

// String fields — check camelCase first (canonical), then snake_case (fallback)
const headline = str(config['heroHeadline']) || str(config['hero_headline']);

// Array fields — always default to empty array
const services = Array.isArray(config['services']) ? config['services'] : [];

// Object fields — type-guard before accessing
const trustMetrics = (config['trustMetrics'] && typeof config['trustMetrics'] === 'object')
  ? config['trustMetrics'] as Record<string, unknown>
  : null;
```

## ConversionOS Feature Integration

### Contact/Quote Forms
Replace ALL contact forms and "Get a Quote" buttons with links to the AI Design Studio:

```tsx
import Link from 'next/link';

<Link href="/visualizer" className="...">
  Get Your Free Design Estimate
</Link>
```

### CTA Buttons
Any "Contact Us", "Request Estimate", "Get Started" CTAs should link to `/visualizer`:

```tsx
<Link href="/visualizer">Start Your Project</Link>
```

### Emma Chat Widget
Do NOT add chat widget code — it is auto-injected by the layout. No section-level action needed.

### Voice Agent
Do NOT add voice agent code — it is auto-injected by the layout.

## Colour Usage

Use CSS custom properties for brand colours:

```tsx
// Primary brand colour
className="bg-primary text-primary-foreground"

// Muted backgrounds
className="bg-muted text-muted-foreground"

// Foreground text
className="text-foreground"

// Borders
className="border-border"
```

For custom colours from css-tokens, use inline styles with OKLCH:

```tsx
style={{ backgroundColor: 'oklch(48.7% 0.17 250.55)' }}
```

## Typography

Use the heading and body fonts from tokens:

```tsx
// Headings — use Tailwind font classes
className="font-heading text-3xl font-bold"

// Body text
className="font-body text-base"
```

## Animations

Import motion components from the project's animation library:

```tsx
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';
```

### Prescribed Animation Patterns

| Section Type | Component | Usage |
|-------------|-----------|-------|
| Hero | `StaggerContainer` + `FadeInUp` | Wrap text block in StaggerContainer, each line in FadeInUp |
| Services | `StaggerContainer` + `StaggerItem` | Wrap card grid in StaggerContainer, each card in StaggerItem |
| Gallery / Portfolio | `ScaleIn` | Wrap each image/card in ScaleIn |
| About / Story | `FadeIn` | Wrap text and image blocks in FadeIn |
| CTA | `FadeInUp` | Wrap the entire CTA block in FadeInUp |
| Testimonials | `StaggerContainer` + `StaggerItem` | Wrap carousel/grid in StaggerContainer, each card in StaggerItem |

Example:
```tsx
<StaggerContainer className="grid gap-6 md:grid-cols-3">
  {services.map((svc: Record<string, unknown>, i: number) => (
    <StaggerItem key={i}>
      <div className="rounded-xl border border-border bg-card p-6 hover:scale-[1.02] transition-transform duration-300">
        <h3 className="font-heading text-lg font-semibold">{str(svc['name'])}</h3>
        <p className="mt-2 text-muted-foreground">{str(svc['description'])}</p>
      </div>
    </StaggerItem>
  ))}
</StaggerContainer>
```

## Premium Interactions

Add subtle hover/transition effects for a polished feel:

```tsx
// Cards — slight lift on hover
className="hover:scale-[1.02] transition-transform duration-300"

// Gallery images — brightness boost on hover
className="hover:brightness-110 transition-all duration-300"

// Buttons — shadow lift + active press
className="hover:shadow-lg active:scale-95 transition-all duration-200"

// Image overlay gradient (for text readability over images)
<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

// Stat/metric cards — border highlight on hover
className="hover:border-primary transition-colors duration-300"
```

## Graceful Image Fallbacks

Sections must NEVER return `null` just because an image URL is missing. Use a gradient fallback instead:

```tsx
// Hero image with gradient fallback
<div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
  {heroImageUrl ? (
    <Image src={heroImageUrl} alt={branding.name} fill className="object-cover" />
  ) : (
    <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
  )}
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
  <div className="relative z-10 flex h-full items-end pb-16">
    {/* Text content over image */}
  </div>
</div>

// Service/portfolio card image with gradient fallback
<div className="relative aspect-video overflow-hidden rounded-lg">
  {imageUrl ? (
    <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
  ) : (
    <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/70" />
  )}
</div>
```

## Image Handling

- Use `next/image` for optimised images: `import Image from 'next/image'`
- Always provide meaningful `alt` text
- Use `fill` prop with `object-cover` for background/cover images
- Use responsive sizes: `sizes="(max-width: 768px) 100vw, 50vw"`
- Always wrap `fill` images in a parent with `relative` and explicit height

## Accessibility

- All images need meaningful `alt` text (use `branding.name` or service name, not "image")
- Interactive elements need focus styles: `focus:ring-2 focus:ring-primary focus:ring-offset-2`
- Colour contrast must meet WCAG AA (4.5:1 for normal text)
- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Links must have descriptive text (not "click here")
