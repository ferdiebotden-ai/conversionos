# Plan: Image Integrity + Email Draft Fix

## Context

Two categories of issues found across the 13 builds from 2026-03-13:

**Image integrity:** The pipeline generates fake Gemini renovation photos for every service card and about section where the scraper finds nothing. The result: service cards show AI-invented photos presented as the contractor's real work — which is dishonest and undermines the demo's promise ("your brand, your services"). The fix is to stop generating fake service/about images and let the section components handle empty images gracefully (they already do — confirmed via code inspection).

**Gemini images ARE acceptable in one specific context:** The AI Visualizer feature showcase on the homepage — the before/after kitchen demo that shows 3–4 style variants from the same camera angle. These are intentionally AI-generated to demonstrate what ConversionOS's visualizer can do for the contractor's future clients. They are NOT presented as the contractor's portfolio. These must stay, and must use consistent, same-angle before/after images across all tenants. The per-tenant QA will verify this section specifically.

**Email drafts:** Two bugs in `generate-email.mjs`:
1. Em dash `—` (U+2014) encoded as `=E2=80=94` in quoted-printable. Gmail drafts on mobile/web show this as literal "=E2=80=94" — the "coding" Ferdie sees in the Red Stone draft. Appears in 3 places: subject line, signature separator, and city separator.
2. Call time is overly specific (`I'll give you a call on Monday at 9:30am at {phone}`) which (a) doesn't match reality since the calendar query times out, and (b) creates unnecessary commitment. Replace with just "I'll give you a call tomorrow at {phone}".

---

## Part 1: Pipeline — Stop Generating Fake Images

### 1a. `generate-images.mjs`
**File:** `~/norbot-ops/products/demo/tenant-builder/lib/generate-images.mjs`

**Gemini image generation rules (clarified):**
| Image Type | Gemini OK? | Reason |
|---|---|---|
| Hero background | ✅ Yes — quality fallback only | Acceptable if scraper finds nothing |
| OG image | ✅ Yes | Meta tag, never shown on page |
| AI Visualizer demo (before/after kitchen) | ✅ Yes — required | These demonstrate ConversionOS's AI feature. Not contractor portfolio. Must be consistent same-angle pairs. |
| Service card images | ❌ No | Fake photos misrepresent contractor's work |
| About/team photos | ❌ No | Fake team photos are clearly AI and dishonest |

**Changes:**
- **Remove** `generateServiceImages()` — fake renovation photos for service cards
- **Modify** `generateAboutImage()` → rename to `selectAboutImage()`. Instead of calling Gemini, assign the best available real photo:
  1. First scraped portfolio image (`data.portfolio[0].imageUrl`)
  2. First scraped service image that has a real URL (`data.services[0].image_urls[0]`)
  3. Return `null` (section handles gracefully without an image)
- **Keep** `generateHeroImage()` — acceptable quality fallback for hero backgrounds
- **Keep** `generateOgImage()` — meta tag only, not shown on page

### 1b. `provision-tenant.mjs`
**File:** `~/norbot-ops/products/demo/tenant-builder/provision/provision-tenant.mjs`

In Step 1b (Image Generation Phase, ~lines 125–217):
- Remove the `if (missingCount > 0) → generateServiceImages()` block
- Replace `generateAboutImage()` call with `selectAboutImage()` (returns real photo URL or null)
- Leave service `image_urls` empty when scraper found nothing — confirmed safe (all 5 standard service section components handle `imageUrl: undefined` gracefully via conditional rendering)

---

## Part 2: Email Template Fix

**File:** `~/norbot-ops/products/demo/scripts/outreach/generate-email.mjs`

### 2a. Fix encoding bug
Replace all em dashes `—` with plain hyphen ` - ` (space-hyphen-space):
- Line 17: `'Estimate Request — {city}'` → `'Estimate Request - {city}'`
- Line 37 (signature): `—\nFerdie Botden, CPA` → `--\nFerdie Botden, CPA` (double-hyphen separator)

### 2b. Fix call time wording
Change BODY_TEMPLATE (~line 25–35):

**Current:**
```
I'll give you a call on {callDay} at {callTime} at {callPhone} to walk you through it...
```

**New:**
```
I'll give you a call tomorrow at {callPhone} to walk you through it...
```

Remove `{callDay}` and `{callTime}` variable substitutions from the `generateEmail()` function body. The `callPhone` variable stays. Calendar lookup (`findNextSlot()`) in `outreach-pipeline.mjs` can remain for future use but is no longer injected into the email.

---

## Part 3: Clear AI-Generated Service Images from 13 Existing Tenants

Write a one-off cleanup script (inline bash or small Node script) that:

1. For each of the 13 built tenants (bacvar-building, hache-construction, tc-contracting, yorkland-homes + 9 from Batch 1):
   - Read `admin_settings` `company_profile` value
   - For each service, check if `imageUrl` contains `/services/` in the Supabase Storage URL (AI-generated filename pattern)
   - **Exception for INEX**: Keep any URL whose original was scraped (INEX had 6 real scraped images — identify by checking against scraped.json original URLs)
   - Set `imageUrl: ''` (empty string) for AI-generated entries
   - PATCH `company_profile` back to Supabase

2. Also clear `aboutImageUrl` from `company_profile` where it points to `about-generated.jpg` — replace with `portfolio[0]` URL if one exists in the scraped data, else leave empty.

**Supabase change is immediate** — no redeploy needed. Services will render as text-only cards.

---

## Part 4: Regenerate 12 Gmail Drafts

After the email template is fixed:

1. For each of the 12 targets with existing drafts (IDs: 45, 513, 540, 42, 609, 467, 478, 469, 707, 458, 461, 504):
   - Delete the existing Gmail draft via Gmail API (`DELETE /v1/users/me/drafts/{id}`, using stored `email_message_id`)
   - Re-run `node scripts/outreach/outreach-pipeline.mjs --target-id {id}` to create a fresh draft

The 4 targets that had Yorkland skipped (no email) remain skipped.

---

## Part 5: Update Learned Patterns + SKILL.md

**File:** `~/norbot-ops/products/demo/tenant-builder/docs/learned-patterns.md`

Add:
- Image sourcing rule: Gemini generation permitted ONLY for hero (quality fallback) and OG image (meta tag). Service and about images must be real scraped photos or left empty.
- Service sections handle empty `imageUrl` gracefully — confirmed all 5 standard components (grid-3-cards, grid-2-cards, bento, accordion-list, alternating-rows) use conditional rendering.
- Reuse portfolio images as about fallback (portfolio[0] → aboutImageUrl).

**File:** `~/Norbot-Systems/products/conversionos/.claude/skills/mission-director/SKILL.md`

Add to Phase 5b (Post-Build Data Fix Playbook):
- Service images: if AI-generated, clear them — sections render text-only cards
- About images: assign from portfolio, not Gemini
- Email template: encoding rule (no special chars in subject/body) and call time format

---

## Execution Order

1. Code changes (generate-images.mjs + provision-tenant.mjs + generate-email.mjs)
2. Verify `npm run build` passes in deploy repo
3. Push to `main` (deploy repo)
4. Run data cleanup script (Supabase patches for 13 tenants — clear AI service/about images)
5. Per-tenant quality review — all 13 tenants (see Part 6 below)
6. Data fixes from QA review (Supabase patches, no redeploy needed)
7. Regenerate 12 Gmail drafts (delete + recreate with fixed template)
8. Update learned-patterns.md + SKILL.md

---

## Part 6: Per-Tenant Quality Review (All 13 Tenants)

For each tenant, use Playwright MCP to do a side-by-side comparison of:
- **Original website** (contractor's real site)
- **Demo** (`{slug}.norbotsystems.com`)

**4 checks per tenant (binary PASS/FAIL):**

| Check | Pass Criteria |
|-------|--------------|
| **Hero image** | Real renovation photo (not logo, not Google Reviews graphic, not AI-generated). High quality, no pixelation, 16:9 fills viewport. |
| **Colour palette** | Primary brand colour (CTA buttons, accents) matches or closely reflects original site's primary colour. |
| **Visual identity** | Overall aesthetic matches the original (dark/light theme, logo visible, fonts feel right). |
| **Images loading** | Zero broken images on desktop viewport. No `about-generated.jpg` or `service-*.jpg` Gemini-generated images in service cards. AI visualizer demo (before/after kitchen) present and loading correctly. |

**Tenants to review (13 total):**

| # | Slug | Original URL | Demo URL |
|---|------|-------------|---------|
| 1 | easy-renovation | easyrenovation.ca | easy-renovation.norbotsystems.com |
| 2 | gracia-makeovers | graciamakeovers.com | gracia-makeovers.norbotsystems.com |
| 3 | red-stone-contracting | redstonecontracting.com | red-stone-contracting.norbotsystems.com |
| 4 | bradburn-group | bradburngroup.ca | bradburn-group.norbotsystems.com |
| 5 | eastview-homes | eastviewhomes.ca | eastview-homes.norbotsystems.com |
| 6 | ostrander-construction | (from scraped.json) | ostrander-construction.norbotsystems.com |
| 7 | kwc-basements-renovations | kwcbasements.ca | kwc-basements-renovations.norbotsystems.com |
| 8 | inex-general-contracting | (from scraped.json) | inex-general-contracting.norbotsystems.com |
| 9 | northpoint-renovations | northpointreno.com | northpoint-renovations.norbotsystems.com |
| 10 | bacvar-building | bacvarbuilding.com | bacvar-building.norbotsystems.com |
| 11 | hache-construction | hacheco.com | hache-construction.norbotsystems.com |
| 12 | tc-contracting | gowithtc.ca | tc-contracting.norbotsystems.com |
| 13 | yorkland-homes | yorklandhomes.ca | yorkland-homes.norbotsystems.com |

**Process per tenant:**
1. `browser_navigate` to original → `browser_take_screenshot` (full page, desktop)
2. `browser_navigate` to demo → `browser_take_screenshot` (full page, desktop)
3. `browser_network_requests` to check for broken/4xx images
4. Visually compare screenshots — note any failures
5. Queue data fixes (Supabase patches) — apply all at once after review

**Fix authority (no code deploys needed — all Supabase data):**
- Wrong hero image → patch `company_profile.heroImageUrl` with better scraped photo from Supabase Storage
- Wrong colour → patch `branding.primaryColour` (OKLCH conversion may be needed)
- Logo missing/wrong → patch `branding.logoUrl` or `company_profile.logoUrl`
- Broken service images (any remaining) → clear `service.imageUrl` (section renders text-only gracefully)

**Output:** QA table with PASS/FAIL per tenant per check, plus list of fixes applied.

---

## Verification

- **Code:** `npm run build` passes with zero new errors
- **Images (pipeline):** Dry-run a new build — confirm `generateServiceImages` is never called, `selectAboutImage` returns real portfolio photo or null
- **Images (live sites):** After data cleanup, visit each demo — service cards show text-only or real scraped photos, no AI-generated renovation scenes
- **Email:** Run `node scripts/outreach/outreach-pipeline.mjs --target-id 504 --dry-run` — verify: no `=E2=` in output, body says "I'll give you a call tomorrow at (905) 967-3869"
- **Drafts:** Open Gmail drafts folder — 12 fresh drafts with correct subject lines (hyphen, not encoding artifact)

---

## Files Changed

| File | Change |
|------|--------|
| `tenant-builder/lib/generate-images.mjs` | Remove generateServiceImages, update about logic |
| `tenant-builder/provision/provision-tenant.mjs` | Remove generateServiceImages call, use selectAboutImage |
| `scripts/outreach/generate-email.mjs` | Em dash → hyphen, remove callDay/callTime from template |
| `tenant-builder/docs/learned-patterns.md` | Add image sourcing + email encoding patterns |
| `.claude/skills/mission-director/SKILL.md` | Update Phase 5b with image and email guidance |
| One-off cleanup script (inline) | Clear AI service images from 13 tenants in Supabase |

---

**TLDR:** Stop generating fake Gemini photos for service cards and about sections (keep hero + OG only). Clear existing AI-generated service images from all 13 tenants (sections already handle missing images gracefully). Fix email template: em dash → hyphen (kills encoding bug), strip specific call time (just say "tomorrow at {phone}"). Regenerate all 12 Gmail drafts with clean template.
**Complexity:** MEDIUM — 3 code files, 1 data cleanup script, 12 draft regenerations. No schema changes, no new components.
