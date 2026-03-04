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

**[2026-03-03] bl-renovations:** Logo was invisible in the header — white logo on white background. The scraper captured their white-on-dark version (`logo.webp` — 600x600, white text on light grey). Their actual website uses a dark/black version for light backgrounds. Fix: downloaded dark logo from their site header, uploaded as `logo-dark.png` to Supabase Storage, updated `company_profile.logoUrl` and `branding.logoUrl`. Pattern: when scraping logos, check if the logo has transparency (PNG/WebP with alpha). If so, check if the text/graphic is light-coloured — it may be a "logo on dark" variant. Always try to source both light and dark versions. If only a white logo is available, set `branding.logoOnDark: true` so the header wraps it in a dark pill.

## Logo Sizing & Visibility

**[2026-03-03] all tenants:** Platform header constrained logos to 32px (`h-8`) in a 64px header — wasting half the available space. All tenants looked undersized. Fixed platform-wide: header now `h-10 md:h-11` (40px mobile, 44px desktop), footer `h-10` (40px). Image attrs increased to 220×56 / 200×50 for retina sharpness. Text fallback scaled from `text-xl` to `text-2xl`. Dark pill padding increased from `py-1.5` to `py-2`. Pattern: this is a platform-level concern, not a per-tenant issue. Future builds don't need to adjust logo sizing. However, scraped logos should be minimum 200px wide for sharp rendering at 44px display height. Visual QA should verify logo is VISIBLE (not just loaded) — white logos on white backgrounds pass "image loaded" checks but are invisible.

## Copy & Content

**[2026-03-03] mccarty-squared-inc:** Scraper hit their Strathroy-specific subpage (`mccartysquared.ca/strathroy-ontario`) instead of the root. All scraped about copy referenced "Strathroy community" when the company's primary address is London, ON. Fix: manually patched `aboutCopy` in Supabase to say "London and surrounding areas". Pattern: always scrape from the root domain, not regional subpages. Consider checking `source_url` in `_meta` — if it contains a city slug, re-scrape from root.

## Services & Portfolio

**[2026-03-04] brouwer-home-renovations:** `filterServices` silently dropped all 7 services because they had empty descriptions (gate requires `description.length >= 10`). Result: `company_profile.services = []` and the homepage services section was completely blank. The descriptions DO exist — they're on each `/service-name` sub-page as the hero paragraph — but Firecrawl only scrapes the homepage and doesn't follow service sub-page links. Fix: after any build where services count is 0, manually scrape each service sub-page for the description paragraph and re-provision. Long-term: scraper should visit each detected service link and capture its description.

**[2026-03-04] brouwer-home-renovations:** Service page background images are the highest-quality photos for each service — far better than generic gallery images. Each background is confirmed by page context (page title = service name = image subject). Pattern: when a contractor has per-service sub-pages, scrape those backgrounds as `imageUrl` for each service in `company_profile.services`.

**[2026-03-04] general — portfolio description integrity:** Gallery images on contractor sites typically have NO individual labels (alt text is the business name). Any specific descriptions like "— Vanity & Mirror" or "— Glass Shower Enclosure" are AI-guesses and must NOT be used. Correct approach: titles should be generic room-type only ("Bathroom Renovation") and `description` should be empty string unless the original site explicitly labels that photo. Never add detail suffixes without a confirmed source URL.

**[2026-03-03] mccarty-squared-inc:** Page completeness checker false-positive FAILs on `/services` (0 cards) and `/projects` (no items) even though all content rendered correctly. Root cause: selectors used class-name substring matching (`[class*="service"] [class*="card"]`) which doesn't match shadcn/ui components — these use `data-slot="card"` with Tailwind utility classes, no "card" in class names. Fix: use `[data-slot="card"]` selector in page-completeness.mjs. Also: `img.naturalWidth > 0` returns 0 for lazy-loaded images; use `img.srcset || img.src` instead.

## Layout & Responsive


## Certifications & Memberships

**[2026-03-03] bl-renovations:** About page showed hardcoded RenoMark benefit cards (2-Year Warranty, $2M Insurance, Code of Conduct, Written Contracts, 2-Day Response) even though BL Renovations only has "Commercially Bonded" and "Insured" — they are NOT a RenoMark member. This is false certification and could be legally problematic. Root cause: the About page rendered RenoMark details unconditionally for any tenant with certifications. Fix: gated the RenoMark details section behind `config.certifications.some(c => /renomark/i.test(c))`. Pattern: certification details must NEVER be shown unless the tenant's scraped data explicitly includes that certification. Only McCarty Squared Inc. has RenoMark. The scraper must capture exact certification names and the platform must gate org-specific benefit claims behind presence of that certification.

## Scraping Edge Cases

**[2026-03-04] brouwer-home-renovations:** Gallery was hidden under Resources → Gallery (`/gallery`), not linked from the homepage. Firecrawl only follows homepage links so it missed 18 project photos entirely. Scraped portfolio = 0. When `portfolio.length === 0` after a build, check if the site has a `/gallery`, `/portfolio`, or `/projects` page under a secondary nav menu and scrape it separately. This is a common pattern for sites built on OneLocal/Duda/Wix.

**[2026-03-04] brouwer-home-renovations:** Hero image was the logo — both `hero_image_url` and `logo_url` resolved to the same CDN path (`Brouwer-Home-Renovations-LogoBlack-68eca2be-1920w.jpg`). The actual site hero is a CSS `background-image` property, not an `<img>` tag. Firecrawl's v2 branding extractor saw the logo `<img>` tag and set both fields to it. Fix: after provisioning, verify that `heroImageUrl !== logoUrl`. If they match, it's a scraping confusion — look for CSS background images in the hero section instead.

**[2026-03-03] general:** If `_meta.source_url` in the scraped JSON contains a city slug (e.g. `/strathroy-ontario`, `/london-ontario`), the scraper hit a regional landing page rather than the root. City-specific pages have narrower content (only mentions that city). Always prefer the root URL for the primary scrape.

## Email & Outreach

**[2026-03-04] general — ferdie@norbotsystems.com showing on contact pages:** When `business_info.email` is empty string, `branding.ts` and `branding-provider.tsx` fell back to `DEMO_BRANDING.email` (`ferdie@norbotsystems.com`) because `'' || DEMO_BRANDING.email` evaluates to the fallback (empty string is falsy). Fixed by changing `|| DEMO_BRANDING.email` to `|| ''` for email/paymentEmail/quotesEmail fields. Pattern: after building any tenant, verify the Contact page shows the right email — not ferdie's. If empty, that's fine; if ferdie's, the DB email field is empty and the code fallback fired.

**[2026-03-04] general — base64 hero in company_profile.heroImageUrl:** If the provisioner scrapes a hero that is embedded as a CSS `background-image` with a data URI, it may write the base64 blob directly to `heroImageUrl`. This makes the field unrenderable as an `<img>` src in the platform. Detection: if `heroImageUrl` starts with `data:` or the DB returns `<Base64-Image-Removed>` in output, it needs replacement. Fix: find a real image on the site, download it, upload to Supabase storage, update heroImageUrl to the storage URL.

**[2026-03-04] general — "Not available" in socials array:** Some scrapers write `{href: "Not available", label: "Facebook"}` when a social link doesn't exist, instead of omitting the entry. These render as broken links in the footer. Fix: filter `socials` to exclude entries where `href === "Not available"` or contains "not available".

**[2026-03-04] general — AI-hallucinated service packages and imageUrls:** Service `packages` arrays (with `name`, `description`, `startingPrice`) are often entirely hallucinated by the LLM during provisioning — the contractor's website has no such content. Similarly, `imageUrl` fields like `joescarpentry.ca/services/renovation1.jpg` are fabricated paths that return 404. Identify by checking: does the URL resolve? Is the pricing plausible for the service? Hallucinated packages should be cleared to `[]`. Broken imageUrls should be replaced with real uploads or set to `''`.

