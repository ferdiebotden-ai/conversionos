# Unit 02: Homepage — Make Fully DB-Driven

## Scope
Replace all hardcoded content on the home page with values from `CompanyConfig`. The page already fetches `getCompanyConfig()` at line 29 as `config`. This unit wires existing hardcoded sections to use `config.*` fields.

**Files to modify:**
- `src/app/page.tsx`

---

## Current State

The home page (`src/app/page.tsx`) has these hardcoded sections that must become DB-driven:

1. **Hero headline** (line 59): `"Dream. Plan. Build."` → `config.heroHeadline` or `config.tagline`
2. **Hero subtitle** (line 64-67): hardcoded description → `config.heroSubheadline` or fallback
3. **Hero image** (line 46): `"/images/demo/hero-kitchen.png"` → `config.heroImageUrl` or fallback
4. **Trust badges** (lines 87-100): hardcoded RenoMark, 13 categories, NetZero → `config.trustBadges[]` or derived from `config.certifications`
5. **Why Choose Us cards** (lines 218-239): hardcoded 3 cards → `config.whyChooseUs[]`
6. **Craftsmanship image** (line 198): `"/images/demo/craftsmanship-detail.png"` → `config.aboutImageUrl` or fallback
7. **Process steps** (lines 259-291): hardcoded 4 steps → `config.processSteps[]`
8. **Testimonial images** (line 38): hardcoded demo image paths → make optional

---

## Changes Required

### 1. Hero Section

Replace the hero headline:
```tsx
<h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
  {config.heroHeadline || config.tagline || 'Dream. Plan. Build.'}
</h1>
```

Note: If the `heroHeadline` contains a word that should be highlighted with the primary colour, we can split on a marker. For simplicity, just render the full headline. Keep the `<span className="text-primary">` pattern but make it optional — if `heroHeadline` is set, render it plain. If not set, use the fallback with the `Build.` highlighted.

```tsx
{config.heroHeadline ? (
  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
    {config.heroHeadline}
  </h1>
) : (
  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
    Dream. Plan.{" "}
    <span className="text-primary">Build.</span>
  </h1>
)}
```

Replace hero subtitle:
```tsx
<p className="mt-6 text-lg leading-8 text-white/85 md:text-xl">
  {config.heroSubheadline || `With a focus on quality craftsmanship and integrity, ${branding.name} provides superior construction and renovation services in ${branding.city}, ${branding.province} and surrounding areas, dedicated to bringing your dream projects to fruition.`}
</p>
```

Replace hero image:
```tsx
<Image
  src={config.heroImageUrl || "/images/demo/hero-kitchen.png"}
  alt={`${branding.name} — ${config.heroHeadline || branding.tagline}`}
  fill
  priority
  className="object-cover"
  sizes="100vw"
/>
```

### 2. Trust Badges

Replace the hardcoded trust badges with dynamic ones from `config.trustBadges`. If `trustBadges` is empty, derive from `config.certifications`. If both empty, hide the section.

```tsx
{(() => {
  const badges = config.trustBadges.length > 0
    ? config.trustBadges
    : config.certifications.map(c => ({ label: c, iconHint: 'award' }));
  if (badges.length === 0) return null;
  return (
    <StaggerItem>
      <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/80">
        {badges.slice(0, 3).map((badge, i) => (
          <div key={i} className="flex items-center gap-2">
            <Award className="size-5 text-primary" />
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    </StaggerItem>
  );
})()}
```

Note: Keep using `Award` icon for all badges for now — icon mapping can be enhanced later. The `iconHint` field is stored but not yet used for dynamic icon selection.

### 3. Why Choose Us Section

Replace hardcoded cards with `config.whyChooseUs[]`. If empty, use fallback defaults:

```tsx
{(() => {
  const defaultWhyUs = [
    { title: 'Quality Guaranteed', description: 'Written contracts on every project with strict quality standards and comprehensive warranty coverage.' },
    { title: 'Expert Team', description: 'Skilled professionals with years of experience delivering exceptional renovation results.' },
    { title: 'Fast Response', description: 'Quick answers and clear communication throughout your entire renovation project.' },
  ];
  const items = config.whyChooseUs.length > 0 ? config.whyChooseUs : defaultWhyUs;
  const icons = [
    <Award key="0" className="size-6" />,
    <Shield key="1" className="size-6" />,
    <Clock key="2" className="size-6" />,
  ];
  return (
    <StaggerContainer className="mt-8 space-y-6">
      {items.map((item, i) => (
        <StaggerItem key={i}>
          <WhyUsCard
            icon={icons[i % icons.length]}
            title={item.title}
            description={item.description}
          />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
})()}
```

Replace the craftsmanship image:
```tsx
<Image
  src={config.aboutImageUrl || "/images/demo/craftsmanship-detail.png"}
  alt={`${branding.name} expert craftsmanship`}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### 4. Process Steps

Replace hardcoded steps with `config.processSteps[]`. If empty, use fallback defaults:

```tsx
{(() => {
  const defaultSteps = [
    { title: 'Design Consultation', description: 'Collaborate with experts to refine your vision' },
    { title: 'Planning & Approval', description: 'Finalize detailed plans and obtain necessary permits' },
    { title: 'Construction Phase', description: 'Skilled crew executes with precision and quality materials' },
    { title: 'Final Inspection', description: 'Review completed project for quality assurance' },
  ];
  const steps = config.processSteps.length > 0 ? config.processSteps : defaultSteps;
  const icons = [
    <ClipboardList key="0" className="size-6" />,
    <FileCheck key="1" className="size-6" />,
    <Hammer key="2" className="size-6" />,
    <CheckCircle key="3" className="size-6" />,
  ];
  return (
    <StaggerContainer className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => (
        <StaggerItem key={i}>
          <ProcessStep
            step={i + 1}
            icon={icons[i % icons.length]}
            title={step.title}
            description={step.description}
          />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
})()}
```

### 5. Testimonial Images

Make testimonial images optional. The current mapping (line 38) uses hardcoded demo images. Change to use optional `image` field:

```tsx
const testimonials = config.testimonials.map((t, i) => ({
  id: i + 1,
  quote: t.quote,
  author: t.author,
  projectType: t.projectType,
  rating: 5,
  image: `/images/demo/${['kitchen-modern', 'bathroom-spa', 'basement-entertainment'][i % 3]}.png`,
}))
```

Keep this as-is for now — the testimonial image fallback is acceptable. The `Testimonials` component will be updated in Unit 05 to handle optional images.

### 6. Services Section

The services section uses `<ServicesGrid />` which is hardcoded. That will be handled in Unit 04. Leave this section as-is for now.

---

## Verification

After completing all changes:
1. `npm run build` — must pass with zero TypeScript errors
2. The hero section should render from `config.heroHeadline` when available, fallback to "Dream. Plan. Build." when not
3. Trust badges should come from `config.trustBadges` or `config.certifications`
4. Why Choose Us cards should come from `config.whyChooseUs`
5. Process steps should come from `config.processSteps`
6. The `aboutImageUrl` should be used for the craftsmanship image

**Do NOT modify any files outside `src/app/page.tsx`.**
