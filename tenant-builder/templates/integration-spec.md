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

## CTAs — Link to Design Studio
```tsx
import Link from 'next/link';
<Link href="/visualizer">Get Your Free Design Estimate</Link>
```

## Allowed Imports
- `@/lib/section-types` (SectionBaseProps)
- `@/components/motion` (animations)
- `next/image` (Image)
- `next/link` (Link)
- `react` (hooks)
