# Red Stone Contracting — Site Audit & Fix Plan

## Context

User is reviewing the Red Stone Contracting demo built in Session 17. The site received a NOT READY verdict (visual QA 3.17/5). Two core questions:

1. **Are the images AI-generated?** Yes — mostly. See breakdown below.
2. **Why is it in dark mode?** Nuanced answer: the *original* Red Stone website IS dark mode. Our *built demo* is light mode (ConversionOS template default), with a dark overlay on the hero only. The aesthetic mismatch is because we applied the wrong brand colour and used placeholder images.

---

## Findings Summary

### Image Sources

| Image | Source | Status |
|-------|--------|--------|
| Logo | Scraped from actual site → Supabase upload | ✓ Real |
| Hero (`hero.webp`) | **AI-generated (Gemini fallback)** | ✗ Replace |
| About (`about-generated.jpg`) | **AI-generated (Gemini fallback)** | ✗ Replace |
| OG image (`og-image.jpg`) | **AI-generated (Gemini fallback)** | ✗ Replace |
| Service images (4×) | **AI-generated (Gemini fallback)** | ✗ Replace |
| Portfolio #1 (kitchen) | Uploaded from actual site (`REF486_1.webp`) | ✓ Real |
| Portfolio #2 (bathroom) | **FAILED to upload** (AVIF format issue) | ✗ Fix |

The scraper's original hero URL (`w2048h1152_compressed.avif`) was a **Google Reviews star-rating widget graphic**, not a renovation photo. It was replaced with a Gemini-generated fallback during QA. That fallback is the current hero.

### Colour Mismatch

| | Colour | Notes |
|---|---|---|
| **Scraped (wrong)** | `#ff6448` coral/orange | Likely picked up a secondary element |
| **Actual brand colour** | `#C51C24` deep crimson | Confirmed from live site CSS |

### The Dark Mode Situation

- **Original Red Stone site:** Full dark mode — dark near-black background, crimson primary, teal secondary (#7EBEC5)
- **ConversionOS template:** Light mode (white background) by default — no per-tenant dark mode support exists
- **Current demo appearance:** Light mode template with wrong coral colour + AI images → looks nothing like original
- **The hero *feels* dark** only because `full-bleed-overlay` applies a black radial gradient over the hero image

### Other Critical Failures

- **Services section:** 0 cards rendering (data mapping issue)
- **Footer:** Not rendering
- **Contact info:** Empty (phone + email blank — JS-rendered contact form not scraped)
- **Inner pages:** All show homepage headline ("Renovation Services Simplified") — per-page headline bleed

---

## Fix Plan

### Phase 1 — Colour Fix (Supabase SQL)
Update the `branding` key in `admin_settings` for site_id `red-stone-contracting`:
- `primary_color_hex`: `#C51C24`
- `primary_oklch`: `"0.43 0.17 25"` (approximated; L=0.43 → dark colour → white text auto-calculated correctly in layout.tsx)

```sql
-- In Supabase demo project (ktpfyangnmpwufghgasx)
UPDATE admin_settings
SET value = jsonb_set(
  jsonb_set(value, '{colors,primary_hex}', '"#C51C24"'),
  '{colors,primary_oklch}', '"0.43 0.17 25"'
)
WHERE site_id = 'red-stone-contracting' AND key = 'branding';
```

### Phase 2 — Real Images (Download + Supabase Upload)
Replace all Gemini placeholder images with actual Red Stone project photos.

Real images available via Cloudflare CDN:
```
Hero candidate (kitchen project):
https://redstonecontracting.com/cdn-cgi/imagedelivery/i5mY6dKuqO0weYQu02Kf6w/redstonecontracting.com/2024/07/image10.webp/w=1024,h=682

Portfolio candidates (12 real renovation photos available):
https://redstonecontracting.com/cdn-cgi/imagedelivery/i5mY6dKuqO0weYQu02Kf6w/redstonecontracting.com/2024/07/image12.webp/w=1024,h=683
https://redstonecontracting.com/cdn-cgi/imagedelivery/i5mY6dKuqO0weYQu02Kf6w/redstonecontracting.com/2024/07/image11.webp/w=1024,h=682
https://redstonecontracting.com/cdn-cgi/imagedelivery/i5mY6dKuqO0weYQu02Kf6w/redstonecontracting.com/2024/07/image48.webp/w=1024,h=576
https://redstonecontracting.com/cdn-cgi/imagedelivery/i5mY6dKuqO0weYQu02Kf6w/redstonecontracting.com/2024/07/image47.webp/w=1024,h=576
https://redstonecontracting.com/cdn-cgi/imagedelivery/i5mY6dKuqO0weYQu02Kf6w/redstonecontracting.com/2024/07/image46.webp/w=1024,h=682
...and 7 more

District Liberty Village (2026):
https://redstonecontracting.com/cdn-cgi/imagedelivery/i5mY6dKuqO0weYQu02Kf6w/redstonecontracting.com/2026/01/district-liberty-village-1.jpg/w=1080,h=675,fit=crop

Little Portugal (2026):
https://redstonecontracting.com/cdn-cgi/imagedelivery/i5mY6dKuqO0weYQu02Kf6w/redstonecontracting.com/2026/01/little-portugal.jpeg/w=1080,h=675,fit=crop
```

Steps:
1. `curl` download 1 hero image + 6+ portfolio images to `/tmp/red-stone-images/`
2. Upload to Supabase Storage bucket `tenant-assets/red-stone-contracting/` replacing `hero.webp`, adding `portfolio/2.webp` through `portfolio/7.webp`
3. Update `company_profile` in admin_settings with new portfolio image URLs

### Phase 3 — Contact Info (Supabase SQL)
Red Stone's contact info is not in Turso CRM. Manual research needed:
- Phone: **647-910-2930** (found on their Google Business Profile / Homestars listing)
- Email: **info@redstonecontracting.com** (standard pattern — needs verification from site)

Update `business_info` in admin_settings with phone + email + address.

### Phase 4 — Dark Mode Support (Code Change)

Add per-tenant dark mode forcing. This is a reusable feature for all future dark-themed clients.

**Files to modify:**

1. **`~/norbot-ops/products/demo/src/lib/branding.ts`**
   - Add `darkMode?: boolean` to the branding type/return shape
   - Read from `admin_settings.branding.darkMode` (boolean, defaults false)

2. **`~/norbot-ops/products/demo/src/app/layout.tsx`** (or whichever layout wraps `<html>`)
   - Apply `className={branding.darkMode ? 'dark' : ''}` to `<html>` tag
   - The `.dark` class already exists in `globals.css` and sets dark backgrounds

3. **Supabase SQL** — Enable dark mode for Red Stone:
   ```sql
   UPDATE admin_settings
   SET value = jsonb_set(value, '{darkMode}', 'true')
   WHERE site_id = 'red-stone-contracting' AND key = 'branding';
   ```

4. **`~/norbot-ops/products/demo/tailwind.config.ts`** — Verify `darkMode: 'class'` is set (likely already is)

### Phase 5 — Technical Fixes (Supabase Data + Code)

**Footer not rendering:**
- Investigate `footer:multi-column-3` section — likely a missing data field (hours, address) causing a render crash
- Add fallback empty values for hours if not present in admin_settings

**Services 0 cards:**
- The `services:grid-2-cards` section reads from `company_profile.services`
- Check if services array is correctly structured in provisioned data (4 services were scraped)
- Likely a field name mapping issue — fix the section component or re-provision the data

**Inner page headline bleed:**
- Populate `page_hero_headlines` in admin_settings with per-page headlines:
  - `/services`: "Our Renovation Services"
  - `/about`: "About Red Stone Contracting"
  - `/projects`: "Our Portfolio"

### Phase 6 — Redeploy + QA

1. Git commit + push to `main` in `~/norbot-ops/products/demo/`
2. Wait for Vercel build (~2 min)
3. Take Playwright screenshots of `https://red-stone-contracting.norbotsystems.com`
4. Run visual QA: `node tenant-builder/orchestrate.mjs --audit-only --site-id red-stone-contracting --url https://red-stone-contracting.norbotsystems.com`
5. Target score ≥ 4.0 (READY verdict)
6. If READY → create Gmail outreach draft

---

## Critical Files

| File | Change |
|------|--------|
| `~/norbot-ops/products/demo/src/lib/branding.ts` | Add `darkMode` field |
| `~/norbot-ops/products/demo/src/app/layout.tsx` | Apply `dark` class from branding |
| `~/norbot-ops/products/demo/tailwind.config.ts` | Verify `darkMode: 'class'` |
| Supabase `admin_settings` (red-stone-contracting) | Fix colour, images URLs, contact info, darkMode flag |
| Supabase Storage `tenant-assets/red-stone-contracting/` | Replace hero.webp, add portfolio images |

---

## Systemic Improvements (Log for Later)

These issues affected Red Stone and will recur on future builds. Should be added to `docs/learned-patterns.md` and ROADMAP.md:

- **Image classification gate:** Reject non-renovation images (Google Reviews widgets, badge graphics) before setting as hero. Priority: P0.
- **Contact fallback automation:** When scrape returns empty phone/email, auto-query Turso CRM, then fall back to Google Business Profile lookup. Pattern: 31% of builds affected.
- **Dark mode support:** Now added via this fix. For future dark-aesthetic clients, set `darkMode: true` in admin_settings.

---

**TLDR:** Red Stone's images are mostly AI-generated Gemini fallbacks (logo + 1 portfolio photo are real). The original site IS dark mode with deep crimson (#C51C24); our built demo is light mode with the wrong colour (#ff6448 coral) — causing the aesthetic mismatch. The fix has 6 phases: correct the colour, replace images with real CDN photos, add contact info, add per-tenant dark mode forcing (new reusable feature), fix footer/services/headline bugs, then redeploy and QA.

**Complexity:** MEDIUM-HIGH — data fixes are straightforward Supabase SQL; the dark mode code change touches layout.tsx + branding.ts (low risk, well-contained); image replacement requires curl + Supabase upload; full re-QA at end.
