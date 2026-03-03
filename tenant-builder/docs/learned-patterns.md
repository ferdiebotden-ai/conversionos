# Learned Patterns

Accumulated learnings from tenant builds. Read at session start. Append after corrections.

## How to Use This File

- **Read** this file at the start of every build session
- After fixing an issue in a tenant, ask: "Is this a pattern that will repeat for other tenants?"
- If yes, append it here with: what the issue was, what caused it, what the fix was, which build it came from
- Every ~10 builds, review for patterns worth codifying into the pipeline (propose a plan, don't auto-modify)
- Format: `[date] [site-id]: description of pattern`

## Hero Images

**[2026-03-03] mccarty-squared-inc:** Scraper captured the logo CDN URL as `hero_image_url` instead of the actual hero background photo. Result: `hero.png` in storage was the logo, and `company_profile.heroImageUrl` was an incomplete base URL (`...mccarty-squared-inc/` without filename). Fix: update `heroImageUrl` in Supabase to `portfolio/0.jpg` (the best renovation photo). Pattern: when `hero_image_url` from the scrape looks like a logo CDN path (contains "logo", "Logo", or "MSI"), discard it and use the first portfolio image as the hero instead.

**[2026-03-03] mccarty-squared-inc:** `company_profile` `heroImageUrl`, `logoUrl`, and `aboutImageUrl` fields were saved as the storage bucket base URL without a filename suffix (provisioning bug). All three were `...mccarty-squared-inc/` instead of `...mccarty-squared-inc/logo.png`. Likely a provisioner string concatenation bug. Fix manually via Supabase PATCH. Recommend: add URL validation in provision-tenant.mjs — if a URL ends with `/`, it's invalid.

## Colour & Contrast


## Copy & Content

**[2026-03-03] mccarty-squared-inc:** Scraper hit their Strathroy-specific subpage (`mccartysquared.ca/strathroy-ontario`) instead of the root. All scraped about copy referenced "Strathroy community" when the company's primary address is London, ON. Fix: manually patched `aboutCopy` in Supabase to say "London and surrounding areas". Pattern: always scrape from the root domain, not regional subpages. Consider checking `source_url` in `_meta` — if it contains a city slug, re-scrape from root.

## Services & Portfolio

**[2026-03-03] mccarty-squared-inc:** Page completeness checker false-positive FAILs on `/services` (0 cards) and `/projects` (no items) even though all content rendered correctly. Root cause: selectors used class-name substring matching (`[class*="service"] [class*="card"]`) which doesn't match shadcn/ui components — these use `data-slot="card"` with Tailwind utility classes, no "card" in class names. Fix: use `[data-slot="card"]` selector in page-completeness.mjs. Also: `img.naturalWidth > 0` returns 0 for lazy-loaded images; use `img.srcset || img.src` instead.

## Layout & Responsive


## Certifications & Memberships

**[2026-03-03] bl-renovations:** About page showed hardcoded RenoMark benefit cards (2-Year Warranty, $2M Insurance, Code of Conduct, Written Contracts, 2-Day Response) even though BL Renovations only has "Commercially Bonded" and "Insured" — they are NOT a RenoMark member. This is false certification and could be legally problematic. Root cause: the About page rendered RenoMark details unconditionally for any tenant with certifications. Fix: gated the RenoMark details section behind `config.certifications.some(c => /renomark/i.test(c))`. Pattern: certification details must NEVER be shown unless the tenant's scraped data explicitly includes that certification. Only McCarty Squared Inc. has RenoMark. The scraper must capture exact certification names and the platform must gate org-specific benefit claims behind presence of that certification.

## Scraping Edge Cases

**[2026-03-03] general:** If `_meta.source_url` in the scraped JSON contains a city slug (e.g. `/strathroy-ontario`, `/london-ontario`), the scraper hit a regional landing page rather than the root. City-specific pages have narrower content (only mentions that city). Always prefer the root URL for the primary scrape.

## Email & Outreach
