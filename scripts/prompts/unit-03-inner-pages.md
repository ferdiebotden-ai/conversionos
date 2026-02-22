# Unit 03: Inner Pages — About, Contact, Footer

## Scope
Make the about page, contact page, and footer fully DB-driven by replacing hardcoded content with `CompanyConfig` fields.

**Files to modify:**
- `src/app/about/page.tsx`
- `src/app/contact/page.tsx`
- `src/components/footer.tsx`

---

## Task 1: About Page — DB-Driven Values and Team

**File:** `src/app/about/page.tsx`

### 1a. Hero headline

Replace the hardcoded "Dream. Plan. Build." headline (line 70) with the tenant's headline:
```tsx
<h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
  {config.heroHeadline || `About ${branding.name}`}
</h1>
```

### 1b. Values section

Currently uses a hardcoded `values` array (lines 26-45). Replace with `config.values[]`. If empty, fall back to the existing hardcoded values.

Remove the top-level `const values = [...]` constant. In the component, use:

```tsx
{(() => {
  const defaultValues = [
    { title: 'Customer First', description: 'Your satisfaction drives everything we do. We listen, communicate, and deliver on our promises.', iconHint: 'heart' },
    { title: 'Quality Craftsmanship', description: 'Every detail matters, from initial design to final walkthrough.', iconHint: 'target' },
    { title: 'Integrity', description: 'Honest pricing, realistic timelines, and transparent communication throughout your project.', iconHint: 'shield' },
  ];
  const valueItems = config.values.length > 0 ? config.values : defaultValues;

  // Map iconHint to Lucide icons
  const iconMap: Record<string, typeof Heart> = {
    heart: Heart, target: Target, shield: Shield,
    award: Award, clock: Clock, check: CheckCircle,
  };

  return (
    <div className="mt-10 grid gap-8 md:grid-cols-3">
      {valueItems.map((value) => {
        const Icon = iconMap[value.iconHint?.toLowerCase() || ''] || Heart;
        return (
          <div key={value.title} className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {value.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {value.description}
            </p>
          </div>
        );
      })}
    </div>
  );
})()}
```

### 1c. Team section

Currently renders a single card with `config.principals` (lines 248-265). Replace with `config.teamMembers[]`. If empty, fall back to a single card from `config.principals`.

```tsx
{(() => {
  const members = config.teamMembers.length > 0
    ? config.teamMembers
    : [{ name: config.principals, role: 'Principals', photoUrl: '/images/demo/team-male.png' }];

  return (
    <div className={`mt-10 grid gap-6 ${members.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} max-w-${members.length > 2 ? '4xl' : '2xl'} mx-auto`}>
      {members.map((member, i) => (
        <Card key={i}>
          <CardContent className="p-6 text-center">
            <div className="relative mx-auto size-24 overflow-hidden rounded-full">
              <Image
                src={member.photoUrl || '/images/demo/team-male.png'}
                alt={member.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <p className="mt-4 font-semibold text-foreground">
              {member.name}
            </p>
            <p className="text-sm text-primary">{member.role}</p>
            {member.bio && (
              <p className="mt-2 text-xs text-muted-foreground">{member.bio}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
})()}
```

### 1d. About section image

Replace the hardcoded image (line 114-115):
```tsx
<Image
  src={config.aboutImageUrl || "/images/demo/flooring-vinyl.png"}
  alt={`${branding.name} renovation work`}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

---

## Task 2: Contact Page — DB-Driven Business Hours

**File:** `src/app/contact/page.tsx`

### 2a. Remove hardcoded business hours

Delete the `businessHours` constant (lines 16-20):
```typescript
// DELETE THIS:
const businessHours = [
  { day: "Monday - Friday", hours: "9:00 AM - 5:00 PM" },
  { day: "Saturday", hours: "Closed" },
  { day: "Sunday", hours: "Closed" },
]
```

### 2b. Import and use parseBusinessHours

Add import at the top:
```typescript
import { parseBusinessHours } from '@/lib/utils/hours';
```

Inside the component, derive hours from config:
```typescript
const businessHours = parseBusinessHours(config.hours);
```

The template already renders `businessHours` correctly (lines 133-143), so no further changes needed there.

---

## Task 3: Footer — Dynamic Service Links

**File:** `src/components/footer.tsx`

### 3a. Problem

The footer has hardcoded service links (lines 15-20):
```typescript
const services = [
  { href: "/services/kitchen", label: "Kitchens" },
  { href: "/services/bathroom", label: "Bathrooms" },
  { href: "/services/basement", label: "Basements" },
  { href: "/services/outdoor", label: "Outdoor" },
]
```

These need to be dynamic, but the footer is a `'use client'` component — it can't call `getCompanyConfig()`.

### 3b. Solution

The footer already reads `useBranding()` from context. We need to pass service links through a similar mechanism. The simplest approach: accept an optional `services` prop or add services to the branding context.

**Recommended approach:** Add a `services` field to the `Branding` interface and populate it in `getBranding()`. This keeps it simple and doesn't require a new context provider.

In `src/lib/branding.ts`, add to the `Branding` interface:
```typescript
services: { name: string; slug: string }[];
```

Add to `DEMO_BRANDING`:
```typescript
services: [],
```

In `getBranding()`, read from `company_profile`:
```typescript
// Also fetch company_profile for services list
const profileRow = data.find(r => r.key === 'company_profile');
const profile = (profileRow?.value ?? {}) as Record<string, unknown>;
const rawServices = (profile['services'] as { name: string; slug?: string }[]) || [];
```

Update the `.in('key', [...])` to include `'company_profile'`:
```typescript
.in('key', ['business_info', 'branding', 'company_profile']);
```

Add to the return object:
```typescript
services: rawServices.map(s => ({
  name: s.name,
  slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
})),
```

Now in `src/components/footer.tsx`, replace the hardcoded `services` array:

```tsx
// Remove the hardcoded services const

export function Footer() {
  const pathname = usePathname()
  const branding = useBranding()
  const currentYear = new Date().getFullYear()

  // Dynamic service links from branding (or fallback)
  const serviceLinks = branding.services.length > 0
    ? branding.services.map(s => ({ href: `/services/${s.slug}`, label: s.name }))
    : [
        { href: "/services/kitchen-renovation", label: "Kitchen Renovation" },
        { href: "/services/bathroom-renovation", label: "Bathroom Renovation" },
        { href: "/services/basement-finishing", label: "Basement Finishing" },
        { href: "/services/flooring", label: "Flooring" },
      ];
```

Then use `serviceLinks` instead of `services` in the footer rendering (line 94-104).

Also update the `BrandingProvider` to include the new `services` field. Check `src/components/branding-provider.tsx` — it should already pass through all `Branding` fields since it uses the full interface.

---

## Verification

After completing all changes:
1. `npm run build` — must pass with zero TypeScript errors
2. About page values section renders from `config.values[]` when available
3. About page team section renders from `config.teamMembers[]` when available
4. Contact page business hours come from `config.hours` via `parseBusinessHours()`
5. Footer service links are dynamic from `branding.services[]`

**Do NOT modify any files outside the three listed above (plus `src/lib/branding.ts` for the services field).**
