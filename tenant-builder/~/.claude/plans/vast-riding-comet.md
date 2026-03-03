# Red White Reno — Content & Bug Fixes

## Context

First real bespoke tenant content review. Several copy issues surfaced from a live-site walk-through: AI-flavoured language slipped through on the public homepage, unverifiable stats are displayed as fact, and a systematic `getSiteId()` vs `getSiteIdAsync()` gap in server-component pages (not API routes) causes the leads table and lead-detail page to silently query the wrong tenant — hiding Margaret Wilson's sample lead and her visualization from the admin dashboard.

---

## Changes

### 1. Remove testimonials subtitle — `src/app/page.tsx:272-274`

Delete the `<p>` tag that reads *"Real feedback from Red White Reno Inc. clients across Stratford."*  It's redundant (this is their own website) and AI-sounding. The `<h2>` "What Our Clients Say" is sufficient.

**Before:**
```jsx
<p className="mt-4 text-lg text-muted-foreground">
  Real feedback from {branding.name.replace(/\.\s*$/, '')} clients across {config.serviceArea || 'Ontario'}.
</p>
```
**After:** Delete those 3 lines entirely.

---

### 2. Strip "Inc." from "Why Choose" heading — `src/app/page.tsx:231`

Strip trailing legal suffixes in the heading only — not the stored company name, which stays "Red White Reno Inc." everywhere else (footer, PDF, emails).

**Before:**
```jsx
Why Choose {branding.name}?
```
**After:**
```jsx
Why Choose {branding.name.replace(/\s+(Inc\.?|Ltd\.?|Corp\.?|Co\.)$/i, '')}?
```

---

### 3. Fix leads page tenant resolution — `src/app/admin/leads/page.tsx:36`

The `getLeads()` function uses `getSiteId()` (synchronous, reads build-time env var). For proxy-based multi-tenancy, server-component pages must use `getSiteIdAsync()` (reads `x-site-id` header set by proxy at request time).

**Changes:**
- Add `getSiteIdAsync` to the import from `@/lib/db/site` (remove `getSiteId`)
- In `getLeads()`, add `const siteId = await getSiteIdAsync();` before the query
- Change `.eq('site_id', getSiteId())` → `.eq('site_id', siteId)`

---

### 4. Fix lead detail page tenant resolution — `src/app/admin/leads/[id]/page.tsx:39,51`

Same `getSiteId()` bug in `getLeadData()`. Two `.eq('site_id', getSiteId())` calls on lines 39 and 51.

**Changes:**
- Add `getSiteIdAsync` to the import, remove `getSiteId`
- In `getLeadData()`, add `const siteId = await getSiteIdAsync();`
- Change both `.eq('site_id', getSiteId())` → `.eq('site_id', siteId)`

---

### 5. DB update script for red-white-reno (Supabase admin_settings)

Write `tenant-builder/fix-rwr-content.mjs` — a one-shot script that patches the `company_profile` row in Supabase for `site_id = 'red-white-reno'`:

| Field | Current value | New value | Reason |
|-------|--------------|-----------|--------|
| `serviceArea` | `"Stratford, Ontario, Canada"` | `"Stratford and surrounding area"` | Overly narrow; not just Stratford |
| `whyChooseSubtitle` | `"We combine AI technology with real Ontario innovation data to deliver exceptional results."` | `""` (cleared) | Don't mention AI on client's site. Code fallback: *"Serving Stratford and surrounding communities with quality craftsmanship."* |
| `certifications` | `["Certified Business"]` | `[]` (empty) | Vague/unverifiable; not found on their actual website. Clears the Certifications & Memberships section entirely (it only renders if `certifications.length > 0`) — also removes the hardcoded RenoMark guarantee block which has no basis in fact for this contractor. |
| `trustMetrics.google_rating` | `"5"` | removed | Source was Turso CRM (not their website). Cannot verify. |
| `trustMetrics.years_in_business` | `"5"` | removed | Same — source unclear, not on their site. |
| `trustMetrics.projects_completed` | `"5+ Reviews"` | removed | Same. Also mislabelled (reviews ≠ projects). |
| `trustMetrics.licensed_insured` | `true` | `true` | Safe claim for any licensed contractor — keep. But with <3 metrics the `SocialProofBar` won't render at all. |

**Note on stats bar:** `SocialProofBar` only renders when 3+ metric items are available (`social-proof-bar.tsx:58`). With only `licensed_insured` remaining, the bar disappears entirely — which is the correct outcome given we can't verify the other claims.

---

## Answers to Ferdie's Questions

**Are the certifications made up?**
`"Certified Business"` was pulled from the Turso CRM (not from redwhitereno.com). It's too vague to be meaningful and can't be verified from their site. The RenoMark guarantee section that appears below it (2-year warranty, $2M insurance, etc.) is hardcoded template content — Red White Reno has no evidence of RenoMark membership. Both will be removed.

**Is the Google rating / years in business / project count legitimate?**
No — these came from the Turso CRM at the discovery stage, not scraped from their website. Their site doesn't publish these numbers. They should not be on the demo site. The "licensed & insured" claim is reasonable standard practice but by itself won't be enough to trigger the bar (needs 3+ items), so the bar will disappear.

**Service area — only Stratford?**
The scraped value was `"Stratford, Ontario, Canada"`. This appears in the testimonials subtitle (after removal of the subtitle itself, it won't matter there) and on the About page ("We proudly serve homeowners and businesses throughout Stratford, Ontario, Canada"). It will be updated to `"Stratford and surrounding area"`.

---

## Files to Change

| File | Type | Change |
|------|------|--------|
| `src/app/page.tsx` | Code | Remove testimonials subtitle; strip "Inc." from Why Choose heading |
| `src/app/admin/leads/page.tsx` | Code | `getSiteId()` → `getSiteIdAsync()` |
| `src/app/admin/leads/[id]/page.tsx` | Code | `getSiteId()` → `getSiteIdAsync()` (×2) |
| `tenant-builder/fix-rwr-content.mjs` | New script | One-shot Supabase patch for red-white-reno company_profile |

---

## Verification

1. `npm run build` — no TypeScript errors
2. Visit `red-white-reno.norbotsystems.com`:
   - Testimonials section: no subtitle line
   - "Why Choose Red White Reno?" (no "Inc.")
   - Stats bar: gone
   - Footer / header / PDF: still say "Red White Reno Inc." (unchanged)
3. Visit About page: Certifications & Memberships section gone
4. Visit About page: service area reads "Stratford and surrounding area"
5. Visit admin leads page: Margaret Wilson appears in table
6. Click her lead: Visualization tab shows the AI-generated concepts

---

**TLDR:** Six specific changes — 2 copy fixes in `page.tsx`, 2 `getSiteId()` → `getSiteIdAsync()` bug fixes in admin server components, 1 new one-shot DB patch script, and 1 set of content removals (unverifiable stats + certifications). All changes are either scoped to red-white-reno data or improve the platform for all tenants.
**Complexity:** LOW–MEDIUM — code changes are surgical single-line edits; the leads bug fix is a known pattern already applied to all 33 API routes, just missed in server component pages.
