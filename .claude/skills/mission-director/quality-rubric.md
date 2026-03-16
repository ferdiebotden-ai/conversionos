# Quality Rubric — Mission Director

## Primary: 5 Quality Gates (Binary Pass/Fail)

These gates are the **exit condition** of the RALPH loop. All 5 must PASS for a LAUNCH verdict.
No subjective scoring — each gate is binary. The Mission Director checks these autonomously
via Playwright and fixes failures automatically (G1-G3) or flags for review (G4-G5).

### Gate 1: Hero Section Accuracy [CRITICAL]

> The hero is the first thing a contractor sees. It must be THEIR website.

| Check | Method | Pass Criteria |
|-------|--------|--------------|
| Business name | Accessibility tree text search | Exact match to scraped `business_name` |
| Hero headline | Accessibility tree text search | Matches content-architect `ctaCopy.heroHeadline` or scraped `hero_headline` |
| Logo present | Network requests + screenshot | Logo image loads (200 status), visible in viewport |
| Primary CTA | Accessibility tree | Button visible, links to `/visualizer` |
| Brand colour | Screenshot pixel sampling | Primary colour visible on CTA or accent elements |

**Fail action:** AUTO-REBUILD the hero section. This gate failing means the contractor would see
someone else's website. Unacceptable.

### Gate 2: Image Integrity

> Zero broken images. Period.

| Check | Method | Pass Criteria |
|-------|--------|--------------|
| HTTP status | Playwright `page.on('response')` for image MIME types | Zero 4xx/5xx responses |
| Empty src | Accessibility tree scan for `<img>` elements | Zero empty or missing `src` attributes |
| Broken icons | Screenshot visual check | No browser broken-image placeholders visible |

**Fail action:** AUTO-FIX. Upload replacement images via Supabase Storage, update URLs, redeploy.

### Gate 3: Copy Accuracy

> Zero unfilled variables. Zero wrong-trade content. Zero placeholder text.

| Check | Method | Pass Criteria |
|-------|--------|--------------|
| Template vars | Regex scan of accessibility tree text | Zero `{{var}}`, `{var}`, or `%var%` patterns |
| Placeholder text | Text search | Zero "Lorem ipsum", "placeholder", "TODO", "TBD", "Coming soon" |
| Business identity | Text comparison | Business name, phone, email match scraped data |
| Service relevance | Text comparison | Services listed match the contractor's actual trade |

**Fail action:** AUTO-FIX. Update admin_settings or edit section .tsx with correct content from
content-architect.json or scraped.json.

### Gate 4: Completeness & Visual Finish

> Does it look like a finished product, not a prototype?

| Check | Method | Pass Criteria |
|-------|--------|--------------|
| Section count | Full-page screenshot + section detection | ≥5 distinct sections visible |
| Empty sections | Visual check | No blank cards, empty grids, or skeleton-only sections |
| Footer content | Accessibility tree | Phone, email, and address present in footer |
| Animations | CSS computed style check | Transition or transform properties on interactive elements |
| Overflow | Viewport check | No horizontal scrollbar on desktop or mobile |

**Fail action (after max iterations):** FLAG FOR MANUAL REVIEW. Include full-page screenshot and
specific failures. These are polish issues that may need human judgment.

### Gate 5: Brand Recognition Match

> Would the contractor recognise this as their own website?

| Check | Method | Pass Criteria |
|-------|--------|--------------|
| Colour match | Side-by-side screenshots | Primary colour family matches (same hue range) |
| Layout flow | Visual comparison | Section order follows similar pattern to original |
| Visual weight | Visual comparison | Dark/light theme direction matches original |

**Fail action:** FLAG FOR FERDIE REVIEW. Include both screenshots (original + demo) with specific
mismatches noted. Brand direction is a human decision — never auto-fix.

---

## Verdict Decision Tree

```
All 5 gates PASS → LAUNCH
G1-G3 PASS, G4/G5 FAIL (after max iterations) → REVIEW
G1-G3 ANY FAIL (after max iterations) → REBUILD
Build crash / no output → SKIP
```

---

## Secondary: 7-Dimension Weighted Scoring (Supplementary)

Use this scoring system for **detailed reporting** and **trend tracking** across builds.
The 5 gates above are the primary pass/fail. This scoring provides nuance for the summary report
and helps identify gradual quality improvements or regressions.

Score each dimension 1-5. Average ≥4.0 = strong. Average 3.0-3.9 = needs polish. Below 3.0 = weak.

### 1. Brand Recognition (Weight: 1.5)

> Would the contractor recognise this as their website?

| Score | Criteria |
|-------|----------|
| 5 | Identical colour scheme, same layout flow, matching typography feel |
| 4 | Same colours and general structure, minor layout differences |
| 3 | Right colours but different layout structure |
| 2 | Colours are close but feel off; layout significantly different |
| 1 | Looks like a completely different company |

**Key checks:** Primary colour on CTAs/accents (not backgrounds), logo present, correct business name

### 2. Visual Fidelity (Weight: 1.5)

> Does it match the original site's visual DNA?

| Score | Criteria |
|-------|----------|
| 5 | Section order matches, spacing rhythm matches, card styles match |
| 4 | Most sections match; 1-2 minor visual differences |
| 3 | General structure matches but spacing/cards feel different |
| 2 | Layout is recognisable but many visual details are wrong |
| 1 | Layout bears little resemblance to original |

**Key checks:** Section padding, card border-radius, shadow depths, image overlay treatments

### 3. Premium Polish (Weight: 1.0)

> Does it look like a senior designer built it?

| Score | Criteria |
|-------|----------|
| 5 | Orchestrated animations, atmospheric backgrounds, intentional typography, hover effects everywhere |
| 4 | Good animations and typography; 1-2 sections lack polish |
| 3 | Basic animations present but feel generic; typography is acceptable |
| 2 | Minimal animations; looks functional but not premium |
| 1 | No animations; looks like a developer prototype |

**Key checks:** Stagger reveals, hover lift on cards, CTA hover effects, scroll-triggered animations, atmospheric backgrounds (not solid white/grey)

### 4. Content Completeness (Weight: 1.5)

> Is all the contractor's content represented?

| Score | Criteria |
|-------|----------|
| 5 | Every section from original present; all text, images, testimonials included |
| 4 | All major sections present; minor content gaps (e.g., missing 1 testimonial) |
| 3 | Most sections present; some noticeable gaps |
| 2 | Several sections missing or placeholder content visible |
| 1 | Major content missing; placeholder text or "Lorem ipsum" |

**Key checks:** Hero headline, services list, testimonials (with real names), about text, contact info, portfolio images

### 5. Anti-AI-Slop (Weight: 1.0)

> Does it avoid the generic AI output tells?

| Score | Criteria |
|-------|----------|
| 5 | Distinctive fonts, site-specific colour application, unique card treatments, no purple gradients |
| 4 | Mostly distinctive; 1 generic element (e.g., one section uses default spacing) |
| 3 | Mix of distinctive and generic elements |
| 2 | Mostly generic — could be any contractor's site |
| 1 | Full AI slop: Inter/Roboto, purple gradients, identical spacing, cookie-cutter cards |

**Immediate disqualifiers (auto-score 1):**
- Inter, Roboto, Arial, Open Sans as primary font
- Purple gradient backgrounds
- All sections have identical `py-16` padding
- No hover effects anywhere

### 6. Mobile Responsiveness (Weight: 0.5)

> Does mobile look intentional, not just shrunken desktop?

| Score | Criteria |
|-------|----------|
| 5 | Mobile layout is thoughtful: stacked cards, appropriate font sizes, touch-friendly CTAs |
| 4 | Responsive but 1-2 elements could be better on mobile |
| 3 | Functional on mobile but clearly desktop-first |
| 2 | Some elements overflow or look cramped on mobile |
| 1 | Broken on mobile |

### 7. "Would Ferdie Send This?" (Weight: 2.0 — Tiebreaker)

> The ultimate gut check.

| Score | Criteria |
|-------|----------|
| 5 | Ferdie would proudly email this tomorrow morning |
| 4 | Ferdie would send it after one quick note to fix |
| 3 | Ferdie would want to review it in detail before sending |
| 2 | Ferdie would ask "what happened here?" |
| 1 | Ferdie would not send this |

### Scoring Card

```
Brand Recognition:    ___/5  (weight: 1.5)
Visual Fidelity:      ___/5  (weight: 1.5)
Premium Polish:       ___/5  (weight: 1.0)
Content Completeness: ___/5  (weight: 1.5)
Anti-AI-Slop:         ___/5  (weight: 1.0)
Mobile:               ___/5  (weight: 0.5)
Ferdie Test:          ___/5  (weight: 2.0)

Weighted Average = (sum of score×weight) / 9.0

Strong:  ≥4.0
Polish:  3.0-3.9
Weak:    <3.0
```

---

## How Gates and Scoring Relate

The 5 gates are the **automated decision-maker** — the RALPH loop uses them.
The 7-dimension scoring is the **human-readable assessment** — used in reports and trend tracking.

Typical mapping:
- G1 PASS + G5 PASS → Brand Recognition score likely ≥4
- G2 PASS → Content Completeness score boost
- G3 PASS → Content Completeness + Anti-AI-Slop score boost
- G4 PASS → Premium Polish + Visual Fidelity score boost
- All gates PASS → Ferdie Test score likely ≥4
