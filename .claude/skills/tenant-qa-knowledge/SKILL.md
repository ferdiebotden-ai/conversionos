# Tenant QA Knowledge — Fix Playbook

Complete reference for diagnosing and fixing ConversionOS tenant build issues. Loaded by the build-worker subagent via `skills:` frontmatter. All knowledge comes from 12+ real tenant builds (March 2026).

**Always read `tenant-builder/docs/learned-patterns.md` first** — it may have newer patterns not yet in this skill.

## How to Use This Knowledge

After `orchestrate.mjs` completes, read ALL result files in the output directory:

| File | What It Tells You |
|------|-------------------|
| `go-live-readiness.json` | Verdict: READY / REVIEW / NOT READY |
| `visual-qa.json` | Per-dimension scores (6 dimensions, 1-5 each) |
| `content-integrity.json` | 12-check violation list |
| `page-completeness.json` | Per-page content verification |
| `original-vs-demo.json` | 7-field comparison with original site |
| `audit-report.md` | Human-readable summary |
| `auto-fixes.json` | Already-applied fixes |

Then apply fix patterns below in priority order. After each fix, re-run the specific QA check — NOT the full pipeline.

## Environment Setup

Before any Supabase operations:
```bash
source ~/pipeline/scripts/.env
source ~/norbot-ops/products/demo/.env.local
```

Variables needed: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Section 1: Hero Image Issues

**Pattern: Logo used as hero**
- Detection: `heroImageUrl` contains "logo", "Logo", or matches `logoUrl`
- Fix: Set `heroImageUrl` to best portfolio image (usually `portfolio/0.jpg`)
- If no portfolio images: ESCALATE (need Ferdie to source or approve Gemini generation)

**Pattern: base64-encoded hero**
- Detection: `heroImageUrl` starts with `data:` or DB returns `<Base64-Image-Removed>`
- Fix: Find a real image on the site, download, upload to Storage, update field

**Pattern: Broken URL (ends with `/`)**
- Detection: `heroImageUrl` ends with `/` (no filename)
- Fix: Append correct filename from Storage listing, or use `portfolio/0.jpg`

**Pattern: Missing hero entirely**
- Detection: `heroImageUrl` is empty or null
- Fix: Use image-polisher subagent to generate via Gemini. Prompt: "Professional architectural photograph of [room type], [brand colour] accents, natural lighting, 16:9"

## Section 2: Logo Issues

**Pattern: White logo on white background**
- Detection: Logo has transparency (PNG/WebP with alpha) AND light-coloured content
- Fix: Source dark version from original site header, upload as `logo-dark.png`, update both `branding.logoUrl` and `company_profile.logoUrl`
- If no dark version available: set `branding.logoOnDark: true` (wraps in dark pill)

**Pattern: Broken logo URL**
- Detection: `logoUrl` is empty, ends with `/`, or returns 404
- Fix: Re-extract from original site via Playwright, upload to Storage

**Pattern: Logo too small**
- Detection: Logo < 200px wide (renders blurry at 44px display height)
- Fix: Source higher-res version from original site. Flag for Ferdie if unavailable.

## Section 3: Colour & Contrast

**Pattern: Primary colour mismatch (OKLCH Delta-E > 5)**
- Detection: `content-integrity.json` → colour consistency violation
- Fix: Read scraped hex from `branding-v2.json` or `scraped.json` → update `branding.primaryColour`
- Template: Update branding key with correct colour hex

**Pattern: Low WCAG contrast on primary-foreground**
- Detection: `live-site-audit.json` → WCAG contrast failure
- Fix: Adjust `branding.primaryForeground` to white (`#ffffff`) or black (`#000000`) depending on primary lightness

## Section 4: Content Fabrication

**Pattern: Hallucinated service packages**
- Detection: `services[].packages` arrays with fabricated pricing not from original site
- Fix: Clear packages arrays to `[]`

**Pattern: Fabricated imageUrls (404)**
- Detection: Service `imageUrl` fields like `example.ca/services/renovation1.jpg` that return 404
- Fix: Clear to empty string `''` or upload real images from scraped portfolio

**Pattern: Fabricated testimonials**
- Detection: Testimonial text not found on original website
- Fix: ESCALATE — fabricated testimonials are a legal risk. Flag for Ferdie.

**Pattern: Trust badges / process steps fabrication**
- Detection: `_provenance` field marks AI-generated content
- Fix: Clear `trustBadges`, `processSteps`, `values` from company_profile

## Section 5: Scraping Edge Cases

**Pattern: Gallery hidden under secondary nav**
- Detection: `portfolio.length === 0` but original site has gallery at `/gallery`, `/portfolio`, or `/projects`
- Fix: Scrape gallery page separately, add images to `company_profile.portfolio`

**Pattern: Services with empty descriptions**
- Detection: Services exist but all descriptions empty or < 10 chars
- Fix: Scrape each service sub-page for the hero paragraph. Long-term: improve scraper.

**Pattern: City-specific copy from subpage**
- Detection: `_meta.source_url` contains a city slug (e.g., `/strathroy-ontario`)
- Fix: Re-scrape from root domain. Update `aboutCopy` to reference primary city.

## Section 6: Contact & Email Issues

**Pattern: ferdie@norbotsystems.com on contact page**
- Detection: `business_info.email` is empty string (falsy → triggers demo fallback)
- Fix: Leave email empty (not showing an email is better than showing Ferdie's)
- Root cause: `'' || DEMO_BRANDING.email` evaluates to demo fallback

**Pattern: "Not available" in socials**
- Detection: `branding.socials` contains entries where `href === "Not available"`
- Fix: Filter socials array to exclude entries with "Not available" href

**Pattern: N/A in business hours**
- Detection: `company_profile.businessHours` contains "N/A" patterns
- Fix: Clear to empty string or remove the field entirely

## Section 7: Certification Gating

**Pattern: RenoMark details shown for non-members**
- Detection: About page shows RenoMark benefit cards (2-Year Warranty, $2M Insurance, etc.)
- Fix: Check `company_profile.certifications` array — if no entry matching `/renomark/i`, the UI shouldn't show RenoMark details (platform-level gating exists since Mar 3)
- Only McCarty Squared Inc. has legitimate RenoMark certification

## Section 8: Supabase Fix Templates

### Read a key
```bash
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.${SITE_ID}&key=eq.${KEY}&select=value" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

### Update a key (GET → merge → PATCH)
```bash
# 1. Read current value
CURRENT=$(curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.${SITE_ID}&key=eq.company_profile&select=value" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

# 2. Modify with node one-liner and PATCH back
node -e "
const rows = JSON.parse(process.argv[1]);
const value = rows[0].value;
value.heroImageUrl = 'portfolio/0.jpg';  // CHANGE THIS LINE
process.stdout.write(JSON.stringify({value}));
" '${CURRENT}' | curl -s -X PATCH \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.${SITE_ID}&key=eq.company_profile" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d @-
```

### Filter socials array
```bash
node -e "
const rows = JSON.parse(process.argv[1]);
const value = rows[0].value;
value.socials = (value.socials || []).filter(s => s.href && s.href !== 'Not available' && !s.href.includes('not available'));
process.stdout.write(JSON.stringify({value}));
" '${CURRENT}' | curl -s -X PATCH ...
```

### Clear fabricated fields
```bash
node -e "
const rows = JSON.parse(process.argv[1]);
const value = rows[0].value;
value.trustBadges = [];
value.processSteps = [];
value.values = [];
for (const svc of value.services || []) { svc.packages = []; }
process.stdout.write(JSON.stringify({value}));
" '${CURRENT}' | curl -s -X PATCH ...
```

## Section 9: QA Check Reference

### Re-run individual QA modules (after fixes)

```bash
cd ~/norbot-ops/products/demo

# Page completeness
node tenant-builder/qa/page-completeness.mjs --url ${URL} --site-id ${SITE_ID}

# Content integrity
node tenant-builder/qa/content-integrity.mjs --url ${URL} --site-id ${SITE_ID} --output ${OUTPUT_DIR}

# Live site audit
node tenant-builder/qa/live-site-audit.mjs --url ${URL} --site-id ${SITE_ID} --tier accelerate

# Original vs demo (needs scraped data)
node tenant-builder/qa/original-vs-demo.mjs --url ${URL} --scraped-data ${SCRAPED_PATH}
```

### QA Thresholds

| Module | Pass Criteria |
|--------|--------------|
| Visual QA | Average ≥ 4.0 AND all dimensions ≥ 3.0 |
| Page completeness | All 6 pages have content, footer data verified |
| Content integrity | 0 critical violations (demo leakage, broken images) |
| Live site audit | All 8 checks pass (branding, nav, responsive, WCAG, SEO, images, footer, admin) |
| Original vs demo | ≥ 70% match on 7 fields |
| PDF branding | All required fields present |
| Email branding | No demo leakage in templates |

## Section 10: Quality Gate (Ralph Loop Completion)

The build is READY (output `<promise>TENANT READY</promise>`) when ALL of these are true:

1. Visual QA average ≥ 3.5 AND all dimensions ≥ 2.5
2. Zero critical anti-pattern failures from qa-validator
3. Page completeness: all 6 pages render with content
4. Original-vs-demo match: ≥ 70% on 7 fields
5. No demo leakage (NorBot/ConversionOS/ferdie@ references)
6. Gallery present if original site has gallery
7. Services count within ±2 of original site
8. Hero image is NOT the logo and NOT base64
9. Primary colour OKLCH Delta-E < 10 from original brand

If ANY criterion fails after 3 fix attempts: ESCALATE (do not output the promise).

## Section 11: Self-Improvement Protocol

After fixing a novel issue (not covered by patterns above):

1. Determine if the fix is reusable for future tenants
2. If yes, append to `tenant-builder/docs/learned-patterns.md`:
   ```
   **[{date}] {site-id}:** {Description of the pattern — what the issue was, what caused it, what the fix was}
   ```
3. Place under the appropriate section header (Hero Images, Colour & Contrast, Copy & Content, Services & Portfolio, Layout & Responsive, Certifications, Scraping Edge Cases, Email & Outreach)
4. In the BUILD RESULT, include: `New patterns added: {count} ({brief description})`
5. The parent session (Opus) will review and promote reusable patterns

## Section 12: Escalation Criteria

Return ESCALATE (do NOT attempt creative fixes) when:

1. **Fabricated testimonials detected** — legal risk, needs Ferdie review
2. **Visual QA average < 2.5 after 2 fix attempts** — fundamental template mismatch
3. **No portfolio images AND no services** — target website fundamentally incompatible
4. **Commercial/industrial contractor** (not residential renovation) — wrong ICP
5. **Hero image needs AI generation** but service types can't be determined
6. **Novel issue not covered** by any pattern in this document or learned-patterns.md
7. **Original website is down** (404/500) — can't compare or scrape
8. **Multiple critical failures** (3+ different issue types simultaneously)

When escalating, always include:
- What the issue is (specific QA check failure)
- What you attempted (if anything)
- Relevant data (Supabase field values, screenshot paths, QA scores)
- Your assessment of effort to fix (easy/medium/hard)
