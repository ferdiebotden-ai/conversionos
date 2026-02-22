# Unit 01: Data Layer — Interfaces, CSS Injection, Storage, Hours Parser

## Scope
Extend the core data interfaces (`Branding`, `CompanyConfig`), add CSS colour injection in the root layout, create Supabase Storage helpers, create a business hours parser, and create the tenant-assets storage bucket migration.

**Files to modify:**
- `src/lib/branding.ts`
- `src/lib/ai/knowledge/company.ts`
- `src/app/layout.tsx`

**Files to create:**
- `src/lib/storage.ts`
- `src/lib/utils/hours.ts`
- `supabase/migrations/20260222300000_tenant_assets_bucket.sql`

---

## Task 1: Add `primaryOklch` to Branding interface

**File:** `src/lib/branding.ts`

Add `primaryOklch` field to the `Branding` interface (after `primaryColor` on line 23):

```typescript
primaryOklch: string;
```

Add it to `DEMO_BRANDING` (after `primaryColor` on line 39):
```typescript
primaryOklch: '0.45 0.18 250',
```

In `getBranding()` (around line 79), add after the `primaryColor` line:
```typescript
primaryOklch: colors['primary_oklch'] || DEMO_BRANDING.primaryOklch,
```

---

## Task 2: Extend CompanyConfig interface

**File:** `src/lib/ai/knowledge/company.ts`

Add these fields to the `CompanyConfig` interface (after `services` on line 40):

```typescript
// Extended content fields for DB-driven pages
heroHeadline: string;
heroSubheadline: string;
heroImageUrl: string;
aboutImageUrl: string;
logoUrl: string;
trustBadges: { label: string; iconHint: string }[];
whyChooseUs: { title: string; description: string }[];
values: { title: string; description: string; iconHint: string }[];
processSteps: { title: string; description: string }[];
teamMembers: { name: string; role: string; photoUrl: string; bio?: string }[];
portfolio: { title: string; description: string; imageUrl: string; serviceType: string; location: string }[];
```

Extend the `services` type from `{ name: string; description: string }[]` to:
```typescript
services: {
  name: string;
  slug: string;
  description: string;
  features?: string[];
  packages?: { name: string; startingPrice?: string; description?: string }[];
  imageUrl?: string;
  iconHint?: string;
}[];
```

Add all new fields to `FALLBACK_CONFIG` with sensible defaults:
```typescript
heroHeadline: '',
heroSubheadline: '',
heroImageUrl: '',
aboutImageUrl: '',
logoUrl: '',
trustBadges: [],
whyChooseUs: [],
values: [],
processSteps: [],
teamMembers: [],
portfolio: [],
```

Update existing `services` entries in FALLBACK_CONFIG to include `slug`:
```typescript
services: [
  { name: 'Kitchen Renovation', slug: 'kitchen-renovation', description: 'Custom kitchen design and renovation' },
  { name: 'Bathroom Renovation', slug: 'bathroom-renovation', description: 'Full bathroom remodels' },
  { name: 'Basement Finishing', slug: 'basement-finishing', description: 'Unfinished to entertainment-ready' },
  { name: 'Flooring', slug: 'flooring', description: 'Hardwood, vinyl plank, tile installation' },
],
```

In `getCompanyConfig()`, read the new fields from `company_profile` JSONB (after line 93):
```typescript
heroHeadline: (profile['heroHeadline'] as string) || FALLBACK_CONFIG.heroHeadline,
heroSubheadline: (profile['heroSubheadline'] as string) || FALLBACK_CONFIG.heroSubheadline,
heroImageUrl: (profile['heroImageUrl'] as string) || FALLBACK_CONFIG.heroImageUrl,
aboutImageUrl: (profile['aboutImageUrl'] as string) || FALLBACK_CONFIG.aboutImageUrl,
logoUrl: (profile['logoUrl'] as string) || FALLBACK_CONFIG.logoUrl,
trustBadges: (profile['trustBadges'] as CompanyConfig['trustBadges']) || FALLBACK_CONFIG.trustBadges,
whyChooseUs: (profile['whyChooseUs'] as CompanyConfig['whyChooseUs']) || FALLBACK_CONFIG.whyChooseUs,
values: (profile['values'] as CompanyConfig['values']) || FALLBACK_CONFIG.values,
processSteps: (profile['processSteps'] as CompanyConfig['processSteps']) || FALLBACK_CONFIG.processSteps,
teamMembers: (profile['teamMembers'] as CompanyConfig['teamMembers']) || FALLBACK_CONFIG.teamMembers,
portfolio: (profile['portfolio'] as CompanyConfig['portfolio']) || FALLBACK_CONFIG.portfolio,
```

For `services`, also map in `slug` from DB (services may not have slug in existing data, so generate one):
```typescript
services: ((profile['services'] as CompanyConfig['services']) || FALLBACK_CONFIG.services).map(s => ({
  ...s,
  slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
})),
```

Update the `buildCompanyProfile()` function to include the dynamic service page paths based on `config.services` instead of hardcoded paths (lines 162-172):
```typescript
profile += `\n\n## Website Pages
- /services — Overview of all renovation services`;
  for (const svc of config.services) {
    profile += `\n- /services/${svc.slug} — ${svc.name}`;
  }
  profile += `
- /estimate — AI-powered renovation cost estimator
- /visualizer — AI room visualization tool
- /projects — Portfolio of completed work
- /about — Our story, team, and values
- /contact — Get in touch, request a callback`;
```

---

## Task 3: CSS Colour Injection in Layout

**File:** `src/app/layout.tsx`

In `RootLayout`, inject a `<style>` tag in `<head>` to override `--primary` from the tenant's `primaryOklch`. Currently the layout renders `<html>` then `<body>` directly (line 56-57). Add a `<head>` element with the style injection:

```tsx
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [branding, tier] = await Promise.all([getBranding(), getTier()]);

  return (
    <html lang="en">
      <head>
        {branding.primaryOklch && (
          <style dangerouslySetInnerHTML={{
            __html: `:root{--primary:oklch(${branding.primaryOklch})}`
          }} />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        data-site-id={process.env['NEXT_PUBLIC_SITE_ID'] || ''}
      >
```

**IMPORTANT:** The `branding.primaryOklch` value is always `"L C H"` three numerics sourced from the DB (e.g., `"0.50 0.22 27"`). It is not user-submitted freetext, so `dangerouslySetInnerHTML` is safe here.

Also add `data-site-id` attribute on the `<body>` tag (needed later for QA verification).

You'll need to import or reference `getSiteId` — but since `branding` is already fetched from the DB using `getSiteId()` internally, just use the env var directly: `process.env['NEXT_PUBLIC_SITE_ID'] || ''`.

---

## Task 4: Create Supabase Storage URL Helpers

**Create file:** `src/lib/storage.ts`

```typescript
/**
 * Supabase Storage helpers for tenant assets.
 *
 * Path convention: {site_id}/hero.jpg, {site_id}/logo.svg,
 * {site_id}/team/{slug}.jpg, {site_id}/portfolio/{index}.jpg
 */

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const BUCKET = 'tenant-assets';

/**
 * Get the public URL for a tenant asset in Supabase Storage.
 */
export function getAssetUrl(siteId: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${siteId}/${path}`;
}

/**
 * Return url if it's a valid non-empty string, otherwise return fallback.
 * Handles undefined, empty strings, and null gracefully.
 */
export function getAssetUrlOrFallback(url: string | undefined | null, fallback: string): string {
  if (url && url.trim().length > 0) return url;
  return fallback;
}
```

---

## Task 5: Create Business Hours Parser

**Create file:** `src/lib/utils/hours.ts`

```typescript
/**
 * Parse business hours strings like "Mon-Fri 8am-5pm, Sat 9am-2pm"
 * into structured data for the contact page.
 */

interface BusinessHoursEntry {
  day: string;
  hours: string;
}

/**
 * Parse a business hours string into an array of {day, hours} objects.
 * Handles formats like:
 * - "Mon-Fri 8am-5pm, Sat 9am-2pm"
 * - "Mon-Fri 9am-5pm"
 * - "Monday-Friday 9:00 AM - 5:00 PM, Saturday: Closed, Sunday: Closed"
 */
export function parseBusinessHours(hoursString: string): BusinessHoursEntry[] {
  if (!hoursString || hoursString.trim() === '') {
    return [
      { day: 'Monday - Friday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Saturday', hours: 'Closed' },
      { day: 'Sunday', hours: 'Closed' },
    ];
  }

  const DAY_EXPANSION: Record<string, string> = {
    'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
    'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday',
    'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
    'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday',
  };

  function expandDay(d: string): string {
    return DAY_EXPANSION[d.toLowerCase()] || d;
  }

  function expandRange(range: string): string {
    const parts = range.split('-').map(p => expandDay(p.trim()));
    return parts.join(' - ');
  }

  // Split by comma or semicolon
  const segments = hoursString.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const result: BusinessHoursEntry[] = [];

  for (const segment of segments) {
    // Try to split "Mon-Fri 8am-5pm" into days and hours
    // Pattern: day-range followed by time-range
    const match = segment.match(/^([A-Za-z-\s]+?)\s*:?\s*([\d:aApPmM\s-]+|Closed|closed|By Appointment)$/i);
    if (match) {
      result.push({
        day: expandRange(match[1].trim()),
        hours: match[2].trim(),
      });
    } else {
      // Fallback: treat entire segment as-is
      result.push({ day: segment, hours: '' });
    }
  }

  // If Saturday/Sunday not mentioned, add them as Closed
  const mentionedDays = result.map(r => r.day.toLowerCase()).join(' ');
  if (!mentionedDays.includes('saturday') && !mentionedDays.includes('sat')) {
    result.push({ day: 'Saturday', hours: 'Closed' });
  }
  if (!mentionedDays.includes('sunday') && !mentionedDays.includes('sun')) {
    result.push({ day: 'Sunday', hours: 'Closed' });
  }

  return result;
}
```

---

## Task 6: Create Tenant Assets Storage Bucket Migration

**Create file:** `supabase/migrations/20260222300000_tenant_assets_bucket.sql`

```sql
-- Create public storage bucket for tenant assets (logos, hero images, portfolio, team photos).
-- Public read access, service-role write access only.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  true,
  104857600,  -- 100MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to tenant-assets bucket
CREATE POLICY "Public read access for tenant-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-assets');

-- Allow service role to insert files
CREATE POLICY "Service role insert for tenant-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tenant-assets');

-- Allow service role to update files
CREATE POLICY "Service role update for tenant-assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'tenant-assets');

-- Allow service role to delete files
CREATE POLICY "Service role delete for tenant-assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tenant-assets');
```

---

## Verification

After completing all tasks:
1. Run `npm run build` — must pass with zero TypeScript errors
2. Verify `Branding` interface has `primaryOklch` field
3. Verify `CompanyConfig` interface has all new fields
4. Verify layout.tsx injects `<style>` tag and has `data-site-id` on body
5. Verify `src/lib/storage.ts` exports `getAssetUrl` and `getAssetUrlOrFallback`
6. Verify `src/lib/utils/hours.ts` exports `parseBusinessHours`
7. Verify migration file creates the bucket

**Do NOT modify any files outside the scope listed above.**
