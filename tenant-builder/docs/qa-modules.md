# QA Modules Reference

9 QA modules run in sequence after provisioning and deployment. All produce JSON result files.

## 1. Page Completeness (`qa/page-completeness.mjs`)

Per-page data verification via Playwright. Checks 6 pages + cross-page footer.

| Page | Checks |
|------|--------|
| Homepage | Hero headline (≥10 chars), CTA, services section, trust metrics (≥1), testimonials (≥1) |
| Services | Card images + descriptions (≥20 chars) |
| About | Copy present (≥50 chars), team section, mission |
| Projects | At least 1 portfolio item with image |
| Contact | Phone + email visible, no literal "N/A", business hours valid or hidden, form renders |
| Footer (all) | Logo, social links (if provisioned), phone, email, copyright with year + business name |

```bash
node qa/page-completeness.mjs --url URL --site-id ID
```

## 2. Data-Gap Resolution (`qa/data-gap-resolution.mjs`)

Auto-fixes gaps found by page-completeness. Up to 2 attempts with re-verification.

- Social links: scraped socials → `branding.socials` in Supabase
- Business hours: clear N/A patterns from `company_profile.businessHours`
- Favicon: set `branding.faviconUrl` from existing logo URL

```bash
node qa/data-gap-resolution.mjs --site-id ID --url URL --results-dir DIR [--scraped-data FILE]
```

## 3. Content Integrity (`qa/content-integrity.mjs`)

12-check suite + `autoFixViolations()` for DB cleanup:

1. **Demo leakage** — 40+ patterns (NorBot phone/email/address/demo image paths)
2. **Broken images** — HEAD requests + `naturalWidth` check
3. **Demo images** — `/images/demo/` in HTML source
4. **Colour consistency** — `--primary` CSS variable OKLCH Delta-E < 5
5. **Section integrity** — headings with < 20 chars body text
6. **Fabrication detection** — reads `_provenance`, flags AI-generated high-risk fields
7. **Placeholder text** — lorem ipsum, "your business", coming soon
8. **Business name presence** — contractor name in page title + body
9. **Copyright format** — no double periods in footer
10. **Social links** — scraped socials vs footer rendering
11. **Favicon** — `<link rel="icon">` present
12. **OG image** — `<meta property="og:image">` present

Auto-fix clears fabricated `trustBadges`, `processSteps`, `values`, `trust_metrics` in Supabase.

```bash
node qa/content-integrity.mjs --url URL --site-id ID [--expected-color HEX] [--scraped-data FILE] [--business-name NAME]
```

## 4. Visual QA (`qa/visual-qa.mjs`)

Claude Vision 6-dimension rubric scoring:

| Dimension | What It Evaluates |
|-----------|-------------------|
| Logo Fidelity (1-5) | Rendering quality — perfect to missing/broken |
| Colour Match (1-5) | Brand palette appropriateness |
| Copy Accuracy (1-5) | Business name, services, about text accuracy |
| Layout Integrity (1-5) | Clean sections, no overlaps |
| Brand Cohesion (1-5) | Professional branded feel vs generic template |
| Text Legibility (1-5) | WCAG contrast — excellent to severe issues |

**Pass:** Average ≥ 4.0 AND all dimensions ≥ 3.0

## 5. Refinement Loop (`qa/refinement-loop.mjs`)

Fix-and-recheck cycle when visual QA fails:

1. Screenshot → Visual QA score
2. If pass → done
3. Plateau detection (delta < 0.2) or regression (score drops) → stop
4. Snapshot `admin_settings` state
5. Claude suggests fixes (JSON array: `[{ key, path, value }]`)
6. Apply fixes to Supabase, wait 10s for cache
7. Repeat (max 3-5 iterations)

Rollback: on regression, restores previous admin_settings snapshot.

## 6. Live Site Audit (`qa/live-site-audit.mjs`)

8 Playwright checks on deployed tenant:

1. **Cross-page branding** — `--primary` CSS variable + logo src consistent across 4 pages
2. **Navigation integrity** — All nav links return 200-399, no slow loads > 5s
3. **Responsive layout** — 3 viewports (1440x900, 768x1024, 390x844), no horizontal scroll
4. **WCAG contrast** — 4.5:1 normal text, 3:1 large text
5. **SEO/meta** — `<title>`, `<meta name="description">`, `<meta property="og:title">`
6. **Image performance** — All images load within 5s, `naturalWidth > 0`
7. **Footer consistency** — Phone, email, copyright, logo on all 4 pages
8. **Admin route gating** — Correct tier-based access control

```bash
node qa/live-site-audit.mjs --url URL --site-id ID --tier TIER
```

## 7. Original vs Demo (`qa/original-vs-demo.mjs`)

7-field comparison of scraped data vs live rendered site:

| Field | Match Logic |
|-------|------------|
| Business name | Levenshtein distance ≤ 3 or substring |
| Phone | Normalized digits (last 10 match) |
| Email | Case-insensitive |
| Service count | Within tolerance ±2 |
| Testimonials | Exact quote matching |
| Colour | OKLCH Delta-E < 5 |
| Logo | Same src URL or visually identical |

```bash
node qa/original-vs-demo.mjs --url URL --scraped-data FILE
```

## 8. PDF Branding Check (`qa/pdf-branding-check.mjs`)

Supabase `admin_settings` completeness for PDF generation:
- Required: `companyName`, `phone`, `email`, `city`, `province`, `primaryColour`
- PDF-specific: address, postal, payment_email, website
- Demo leakage patterns (8 checks), logo accessibility, SVG detection

## 9. Email Branding Check (`qa/email-branding-check.mjs`)

Admin settings + email template source scan:
- Branding data completeness (name, colour, logo, phone)
- Template source: hard-coded URLs, demo leakage, CASL violations

## Go-Live Readiness Report (`qa/audit-report.mjs`)

7-section markdown + `go-live-readiness.json` from all QA results.

**Verdict:**
- **READY** — All checks pass, 0 critical failures
- **REVIEW** — Passes with warnings (WCAG near-miss, visual QA 3.0-3.5, match 60-80%, page completeness gaps)
- **NOT READY** — Any critical failure (demo leakage, broken images, missing branding, visual QA < 3.0, homepage load failure)

```bash
# Standalone full audit
node qa/run-full-audit.mjs --url URL --site-id ID [--scraped-data FILE] [--output DIR] [--tier TIER]

# Audit-only mode via orchestrator
node orchestrate.mjs --audit-only --site-id ID --url URL --skip-git
```
