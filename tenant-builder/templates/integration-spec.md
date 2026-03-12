# ConversionOS Integration Cheat Sheet

## Component Pattern
```tsx
'use client';
import type { SectionBaseProps } from '@/lib/section-types';

export function SectionName({ branding, config, tokens, className }: SectionBaseProps) {
  function str(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }

  const headline = str(config['heroHeadline']) || str(config['hero_headline']);
  const services = Array.isArray(config['services']) ? config['services'] : [];

  return (
    <section className={`py-12 md:py-20 ${className ?? ''}`}>
      {/* content */}
    </section>
  );
}
```

## Field Reference (camelCase primary)
| Field | Type | Access Pattern |
|-------|------|---------------|
| heroHeadline | string | `str(config['heroHeadline']) \|\| str(config['hero_headline'])` |
| heroSubheadline | string | `str(config['heroSubheadline']) \|\| str(config['hero_subheadline'])` |
| heroImageUrl | string | `str(config['heroImageUrl']) \|\| str(config['hero_image_url'])` |
| aboutCopy | string | `str(config['aboutCopy']) \|\| str(config['about_copy'])` |
| aboutImageUrl | string | `str(config['aboutImageUrl']) \|\| str(config['about_image_url'])` |
| logoUrl | string | `str(config['logoUrl']) \|\| str(config['logo_url'])` |
| serviceArea | string | `str(config['serviceArea']) \|\| str(config['service_area'])` |
| services | array | `Array.isArray(config['services']) ? config['services'] : []` |
| testimonials | array | `Array.isArray(config['testimonials']) ? config['testimonials'] : []` |
| portfolio | array | `Array.isArray(config['portfolio']) ? config['portfolio'] : []` |
| whyChooseUs | array | `Array.isArray(config['whyChooseUs']) ? config['whyChooseUs'] : []` |
| trustMetrics | object | `config['trustMetrics'] && typeof config['trustMetrics'] === 'object' ? config['trustMetrics'] : null` |

## Branding Props
```tsx
branding.name    // "MD Construction"
branding.phone   // "(519) 555-1234" — may be null
branding.email   // "info@example.com"
branding.address // "123 Main St, Stratford, ON"
branding.logo_url // URL to logo
```

## Animations
```tsx
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn, SlideInFromSide, ParallaxSection, CountUp } from '@/components/motion';
```

| Section Type | Pattern |
|---|---|
| Hero | `StaggerContainer` + `FadeInUp` + `ParallaxSection` for bg |
| Services | `StaggerContainer` + `StaggerItem` + `hover:scale-[1.02]` |
| Gallery | `StaggerContainer` + `StaggerItem` wrapping `ScaleIn` |
| Testimonials | `StaggerContainer` + `StaggerItem` |
| About | `FadeIn` + `SlideInFromSide` |
| Trust/Stats | `CountUp target={25} suffix="+"` |
| CTA | `FadeInUp` |

## Image Fallbacks (NEVER return null for missing images)
```tsx
{imageUrl ? (
  <Image src={imageUrl} alt={branding.name} fill className="object-cover" />
) : (
  <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
)}
```

## Colours & Typography
```tsx
className="bg-primary text-primary-foreground"  // Brand colour
className="bg-muted text-muted-foreground"       // Muted
className="font-heading text-3xl font-bold"      // Headings
className="font-body text-base"                  // Body
```

**NEVER use inline `style` with `oklch(var(--primary) / ...)`.** CSS variables store full `oklch()` values so this double-nests and breaks. Use Tailwind opacity modifiers: `bg-primary/90`, `from-primary/80`, `to-muted/70`.
**NEVER add `data-*` debug attributes** like `data-token-count`. Keep the DOM clean.

## CTAs — AI Feature Integration

All CTAs route to the AI-powered Design Studio. Never use generic "/contact" links.

```tsx
import Link from 'next/link';

// Primary CTA — always the visualizer (upload photo → AI design concepts)
<Link href="/visualizer">See Your Space Before You Build</Link>

// Secondary CTA — text-based estimate via chat
<Link href="/visualizer?mode=chat">Get a Quick Estimate</Link>

// Tertiary CTA — phone with voice agent
<a href="tel:{branding.phone}">Talk to Our AI Receptionist</a>
```

### CTA Routing Rules
| Section Type | Primary CTA | Secondary CTA |
|---|---|---|
| Hero | `/visualizer` ("See Your Space Before You Build") | `/visualizer?mode=chat` |
| Services | `/visualizer` per service | Service detail page |
| About | `/visualizer` | Phone number |
| CTA | `/visualizer` (large button) | `/visualizer?mode=chat` |
| Contact | `/visualizer` + phone + email | Address / map |
| Footer | `/visualizer` | Phone + email |

### AI Feature Teaser Pattern
Include a dedicated "How It Works" or "AI-Powered" teaser in the homepage sections:
```tsx
// 3-step visual: Upload Photo → AI Generates Concepts → Get Estimate
// Links to /visualizer with descriptive copy about the AI design experience
// Use the contractor's brand voice, not generic tech language
```

## TypeScript Strict Mode (MANDATORY)
- **ALL `config` access MUST use bracket notation:** `config['fieldName']` — NEVER `config.fieldName` (config is `Record<string, unknown>`)
- **ALL `branding` access via `asRecord()` MUST use bracket notation:** `asRecord(branding)['name']` — NEVER `asRecord(branding).name`
- **Image `priority` prop:** Always use `priority={priority ?? false}` — NEVER `priority={priority}` (undefined violates exactOptionalPropertyTypes)
- **Array index access:** Add `!` non-null assertion when you've length-checked: `items[0]!` after `if (items.length > 0)`

## Section Labels (CRITICAL — NEVER Use Section IDs as Visible Text)
- Section IDs like `custom:my-tenant-services` are internal identifiers only
- For visible "eyebrow" labels above section titles, use human-readable text:
  - Hero → no eyebrow needed
  - Services → "Our Services"
  - About → "About Us" or "Our Story"
  - Testimonials → "What Our Clients Say"
  - Gallery/Portfolio → "Our Work" or "Recent Projects"
  - Why Choose Us → "Why Choose Us"
  - Process → "How We Work" or "Our Process"
  - CTA → no eyebrow needed
  - Trust/Stats → "By the Numbers" or omit
  - Contact → "Get in Touch"

## Allowed Imports
- `@/lib/section-types` (SectionBaseProps)
- `@/components/motion` (animations)
- `next/image` (Image)
- `next/link` (Link)
- `react` (hooks)
