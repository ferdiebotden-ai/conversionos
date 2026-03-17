# Session Learnings — March 17, 2026

## Hero Template Retrofit

### Finding: Bespoke tenants with unregistered custom sections
**Severity:** Critical
**When:** After replacing custom:*-hero sections with hero:visualizer-teardown, the OTHER custom sections in the layout (services, about, why-us, process, testimonials) were still referenced but not registered in the deploy repo's section registry.
**Impact:** Pages rendered with only hero + trust + CTA — missing all content sections.
**Fix:** Replaced all unregistered custom sections with standard equivalents (services:grid-3-cards, about:split-image-copy, etc.)
**Prevention:** The retrofit script should detect and fix custom sections in the same pass as the hero replacement. Updated `fix-broken-custom-layouts.mjs` handles this.

### Finding: 6 of 12 draft-ready tenant domains returned 404
**Severity:** Critical
**When:** QA check on draft-ready tenants before sending outreach
**Root cause:** Domains were added to proxy.ts fallback map but never registered with Vercel API (no SSL cert provisioned).
**Impact:** If drafts were sent, contractors would see a broken "Tenant not found" page.
**Prevention:** The orchestrate.mjs pipeline should verify domain is accessible (HTTP 200) after registration, not just add it to proxy.ts. Add a post-deploy health check step.
**Affected:** hache-construction, red-stone-contracting, bradburn-group, eastview-homes, tc-contracting, inex-general-contracting

### Finding: Style tabs overflow on mobile ("Scandinavian" truncated)
**Severity:** Minor UX
**When:** Visual QA of hero:visualizer-teardown on mobile viewport
**Fix:** Added `overflow-x-auto scrollbar-hide` to tabs container + right-edge gradient fade hint (`sm:hidden`). Tabs now scroll horizontally on mobile.
**Pattern:** Always test 5+ tab layouts at 375px — overflow is common.

### Finding: Stale call dates in outreach drafts
**Severity:** High
**When:** 21 drafts from Mar 6 and Mar 13 referenced old dates ("Monday", "tomorrow") that were 4-11 days stale.
**Fix:** Regenerated 12 draft-ready targets with outreach-pipeline.mjs. 9 already-sent targets were correctly skipped.
**Prevention:** Drafts should include absolute dates ("March 19") not relative ones ("Monday"). Or add a staleness check to the send monitor.

### Finding: Duplicate Gmail drafts from multiple pipeline runs
**Severity:** Medium
**When:** 10 duplicates found — encoding issues created parallel copies, and batch re-runs created newer versions alongside old ones.
**Fix:** Manual cleanup via Gmail API.
**Prevention:** The outreach pipeline should delete existing drafts before creating new ones for the same target (check email_draft_id in Turso, delete via Gmail API, then create new).

## Data Quality

### Finding: INEX double-comma bug ("Hi Domenic,,")
**Root cause:** owner_name "Domenic, Nick, and Jo" → getFirstName() extracted "Domenic," (with trailing comma) → template appended greeting comma → "Hi Domenic,,"
**Fix:** Hardened getFirstName() to strip trailing punctuation. Added "not found" to SENTINEL_NAMES.
**Prevention:** The getFirstName() fix is now permanent. All 56 existing tests + 15 new cases pass.

### Finding: Company names stored as owner names (3 records)
**Records:** LiteSpeed Technologies Inc., High-Tier Construction Inc., R&M Bathroom & Kitchen
**Root cause:** Scraper or manual entry put company name in owner_name field.
**Fix:** Set to NULL (falls back to "Hi there,").

### Finding: Zwicker Contracting placeholder email
**Email:** mymail@mailservice.com — clearly a placeholder from the website.
**Searched:** TrustedPros, Houzz, Google — no public email found. They only use a contact form at zwickercontracting.com.
**Action:** Ferdie to call (289) 404-1245 and get real email from Bernie Zwicker, or use their website contact form. Do NOT send draft to mymail@mailservice.com.

### Finding: Zwicker Contracting footer has empty mailto: link
**Root cause:** No email in admin_settings business_info — footer renders `mailto:` with no address.
**Fix:** Populate email in business_info once Ferdie gets it.

## Architecture Notes

### hero:visualizer-teardown is now the platform default
- 3 locations updated: page-layout.ts, architect.mjs, provision-tenant.mjs
- Architect prompt explicitly instructs Opus to use it and skip misc:visualizer-teaser
- Frame assets at public/images/hero/frames/{style}/ (5 styles × 80 frames = 400 JPEGs)
- Fallback chain: frames → tiles → opacity (graceful degradation)
- All 37 tenants retrofitted in Supabase
