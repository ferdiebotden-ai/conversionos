# ConversionOS Quote Engine v2 — Product Requirements Document
**NorBot Systems Inc. | February 2026**
**Status: APPROVED FOR BUILD**
**Audience: Opus 4.6 coding agent + Ferdie Botden (CEO)**

---

## What This Is

An enhancement to ConversionOS's quoting system focused on two things: **quote accuracy** (contractors trust what the AI generates) and **quote professionalism** (homeowners receive a quote that closes deals). This is not a rebuild. The foundation is strong — Emma captures scope, the visualizer engages homeowners, the AI generates line items. We're improving what happens after the AI generates the quote.

## Who It's For

**The contractor:** Owner-operator, 1–5 employees, Ontario renovation company. Kitchens, bathrooms, basements. Revenue $500K–$3M. Quotes from their truck or kitchen table. Not technical. Wants to send a professional quote fast and get back to work.

**The homeowner:** Comparing 2–4 quotes. Wants to understand what they're paying for. Makes decisions on their phone at night. Needs clarity and confidence, not a software platform.

## What Already Exists

Read `PRODUCT_REFERENCE.md` for the full technical picture. Key points:

- AI generates line items from Emma conversation + photo analysis + Ontario pricing database
- Each line item: Description, Category (Materials/Labor/Contract/Permit), Qty, Unit, Unit Price, Total
- Line items carry confidence scores (85–95%) with Accept/Reject buttons
- Quote totals: Subtotal, Contingency %, HST 13%, Total, Deposit Required (currently 50%)
- Editable Assumptions and Exclusions
- PDF generation + AI-drafted email via Resend
- `quote_drafts` table already has Good/Better/Best fields — not exposed in UI
- Admin Settings: per-sqft pricing by project type × finish level (Economy/Standard/Premium), Internal Labor Rate, Contract Labor Markup %, Default Contingency %, Required Deposit %, Quote Validity

---

## What to Build

### 1. Default-Accepted Line Items

**Current:** Contractor must click "Accept" on each of 11+ line items, or "Accept All," before they can edit.

**Change:** Line items load directly into the editable table. No acceptance step. The AI generated them from rich context — trust the AI, let the contractor edit exceptions.

- Remove individual "Accept" and "Accept All" buttons
- Load line items straight into the editable quote table
- Add a subtle "AI-generated" badge on each item
- Add "Reset to AI Quote" link if they want to start fresh
- Keep confidence scores visible as informational badges (not gatekeepers)

### 2. Line Item Transparency Cards

**This is the core trust-building feature.** When a contractor clicks a line item (or taps an info icon), a card expands showing exactly how the AI calculated that price.

**Card contents:**
- **Room analysis** — What the photo analysis detected (e.g., "L-shaped kitchen, ~120 sqft, 3 upper cabinets, 2 lower, plumbing connections reusable")
- **Material selection** — What style/quality the homeowner chose (e.g., "Modern Farmhouse, mid-range, Shaker maple with soft-close")
- **Unit price breakdown** — The actual math: "Semi-custom Shaker cabinets: $450/LF (Ontario DB) + Hardware: $85/LF + Install labor: 4.5hrs × $65/hr = $292. Total per LF: $827"
- **Markup applied** — "Your markup (30%): +$248. Your price per LF: $1,075"
- **Data source** — "Ontario Pricing Database v2.1 (updated Feb 2026)" or "Your uploaded pricing (imported Jan 2026)" if they've uploaded their own
- **Quick adjust buttons** — [Change material] [Change quantity] [Override price]

**Why this matters:** Contractors don't trust black-box AI pricing. They trust math they can see. This card shows them "here's why I quoted $1,075/LF" and lets them say "actually my cabinet guy charges $400/LF" and override just that line. Over time, logged adjustments teach the system their actual costs.

**Implementation:** The Ontario pricing database (`ontario_renovation_pricing_database.md`) already has the unit rates, regional multipliers, and trade breakdowns. The photo analysis already extracts room dimensions, fixture counts, and condition. The transparency card just surfaces what the AI already knows.

### 3. Good/Better/Best Tier Presentation

**Current:** `quote_drafts` has tiered pricing fields. They're not shown anywhere.

**Change:** Expose Good/Better/Best tiers to both the contractor (in admin) and the homeowner (in PDF).

**Contractor view (admin dashboard):**
- Three-column layout: Good | Better | Best
- Each column shows line items with material/scope differences highlighted
- Better tier marked "Recommended" by default (matches homeowner's stated preferences)
- Contractor can edit any tier, swap materials, adjust prices
- "Single Tier" toggle collapses back to one quote for contractors who want simplicity
- Each tier shows total prominently

**AI tier generation logic:**
- **Good** = Economy finish level pricing from admin settings. Stock materials. Functional, clean.
- **Better** = Standard finish level. Mid-range materials matching homeowner's stated preferences. This is the primary recommendation.
- **Best** = Premium finish level. High-end finishes, designer-grade materials.
- Price spread: Better ~20–30% above Good. Best ~40–60% above Good.
- Line item descriptions should be specific to each tier (e.g., "Laminate countertops (post-form)" vs "Quartz (Calacatta-style)" vs "Marble (Carrara, honed)") — not just different dollar amounts.

**Homeowner view (in PDF):**
- One-page tier comparison showing all three options side-by-side
- Each tier: name, brief description, key material differences, total price
- "Recommended" badge on Better tier
- Contractor can choose to send single-tier or multi-tier PDF

### 4. Per-Category Markup Controls

**Current:** Single "Contract Labor Markup %" field.

**Change:** Per-category markup configuration with margin visibility.

**Admin Settings → Rates & Defaults:**
- Markup % for: Materials, Labor, Subcontractor/Contract, Equipment, Permits, Allowances
- Default values: Materials 15%, Labor 30%, Contract 15%, Equipment 10%, Permits 0%, Allowances 0%
- Show both markup % and resulting margin % with tooltip explaining the difference ("25% markup = 20% margin")
- Per-line-item override capability in the quote editor

**Add two new categories:** Equipment and Allowances (critical for renovation quotes where fixture selections aren't finalized).

**AI uses these markups** when generating initial line items.

### 5. Contractor Price List Upload (CSV Import)

**What:** Contractors can upload their own pricing as a CSV file. The AI uses their prices instead of the Ontario database defaults for items that match.

**Where:** Admin Settings → new "My Pricing" tab.

**How it works:**
- Upload a CSV with columns: Item Name, Category, Unit, Unit Cost, Sell Price (optional)
- Simple column mapping UI (dropdown: "Which column is the item name?")
- Preview before import — show first 10 rows
- Validate: no blank item names, numeric costs, reasonable ranges
- Store as a per-tenant price list in the database
- AI checks contractor's price list first when generating quotes. If a match exists (e.g., contractor has "Quartz Countertop" in their list), use their price. Fall back to Ontario DB for items not in the list.
- Contractor can view, edit, and delete individual items after import
- Re-import overwrites existing items with the same name

**The transparency card (Feature 2) shows the source:** "Your uploaded pricing" or "Ontario Pricing Database" — so the contractor always knows where the number came from.

### 6. Assembly/Package Templates

**What:** Contractors can save a quote configuration as a reusable template. "My Standard Mid-Range Kitchen" becomes a starting point for similar jobs.

**Where:** Admin Settings → new "My Templates" tab. Also accessible from the quote editor via "Save as Template" and "Load Template."

**How it works:**
- From any quote, contractor clicks "Save as Template" → names it → saved
- Template stores: all line items with categories, quantities, unit prices, and markup settings
- When a new lead comes in for a similar project, contractor (or AI) can load a template as the starting point
- AI adjusts the template for the new lead's specific dimensions, preferences, and regional multiplier
- Templates are per-tenant (each contractor has their own)
- Start simple: a named list of line items. No complex scaling formulas — the AI handles the dimensional adjustments.

### 7. AI Scope Gap Detection

**What:** After generating a quote, the AI runs a check for commonly forgotten items and surfaces them as recommendations.

**Where:** Below the quote line items in the admin dashboard: "AI Recommendations" section.

**Examples:**
- Kitchen tile backsplash quoted but no underlayment → "Consider adding: Tile underlayment (~$3–5/sqft)"
- Bathroom tile job but no waterproofing membrane → "Consider adding: Waterproofing membrane for shower area (~$400–$600)"
- Basement finishing without egress window → "Note: Legal bedrooms require an egress window ($3,000–$8,000)"
- Any structural work but no permit fee → "Consider adding: Building permit fee (~$300–$800)"
- House built before 1980 mentioned → "Consider adding: Asbestos/lead paint testing contingency (~$500–$1,000)"

**Implementation:** Rule-based checks against the Ontario pricing database and project type. Not complex ML — just "if project includes [X] but not [Y], suggest [Y]."

### 8. Improved PDF Output

**Current:** Basic branded estimate with line items and totals.

**Enhanced:**
- **Page 1:** Branded cover with contractor logo, project name, homeowner name, date, quote reference number
- **Page 2:** Before photo (original room) and AI-generated concept (the design they chose) — side by side. This is the emotional anchor.
- **Page 3+:** Line items grouped by category with subtotals per category. Show category-level totals, not unit rates (prevents line-by-line negotiation). If Good/Better/Best enabled, include a one-page comparison summary.
- **Assumptions & Exclusions:** AI-generated contextual assumptions from photo analysis and conversation (e.g., "Assumes existing plumbing connections can be reused"). Not boilerplate.
- **Terms:** Quote validity, deposit amount, Ontario CPA disclosure ("Final cost may vary up to 10% based on site conditions"), HST breakdown
- **Signature block:** Name, date, signature line
- **Footer:** Contractor contact info, quote reference number, page numbers

### 9. E-Signature

**What:** Simple electronic signature so homeowners can approve the quote without printing.

**Implementation:** A simple web page (`/quote/accept/[token]`) where the homeowner:
- Sees a summary of the quote (tier selected, total, deposit amount)
- Types their name
- Checks "I accept this estimate and authorize work to proceed"
- Clicks "Approve"
- System generates a signed PDF and notifies the contractor by email

Store: name, timestamp, IP address, quote version signed. That's it. Typed name + checkbox is legally sufficient in Ontario.

**Not building:** Stripe deposit collection, automated payment flows, interactive quote portal. The contractor handles deposits through their normal process.

### 10. Quote Versioning

**What:** When a contractor edits and re-sends a quote, the system saves a new version without overwriting the old one.

**Where:** Quote tab on lead detail. Version indicator: "Rev 1 | Rev 2 | Rev 3"

**How it works:**
- Each time the contractor sends a revised quote, system creates a new version
- Version list: version number, date, total amount, status (Draft / Sent / Approved)
- Click any version to view (read-only for old versions)
- Homeowner only ever sees the latest version — no history exposed
- Re-send email says "Here's your revised estimate"
- Old versions retained for contractor records

### 11. Default Deposit Change

**Change default from 50% to 15%.** Configurable per-quote and globally in admin settings. 50% is above Ontario industry standard and creates friction.

---

## What NOT to Build

| Feature | Why Not |
|---------|---------|
| Interactive web quote portal | PDF + simple e-signature page is sufficient for our market. |
| Stripe deposit at approval | Contractors collect deposits through e-transfer/cheque. |
| Automated quote follow-ups | Contractors text and call their leads themselves. |
| Quote view analytics | Our contractors don't care when homeowners opened the PDF. |
| Homeowner dashboard | Over-engineered. Homeowners get a PDF and a phone number. |
| Formal change order workflow | Too heavy. Contractor edits the quote, saves a new version, re-sends. |
| Live supplier API pricing | Quarterly Ontario DB updates + CSV upload covers it. |
| Complex formula-based assemblies | The AI handles dimensional adjustments. Saved templates are enough. |

---

## Design Principles

1. **Show the math.** Every AI-generated price should be explainable in one click.
2. **Contractor edits, AI suggests.** The AI does the heavy lifting. The contractor adjusts exceptions.
3. **PDF is the deliverable.** Make the PDF excellent. Homeowners expect a document, not a platform.
4. **5 minutes from lead to sent.** Review, tweak, send. Under 5 minutes.
5. **Their brand, always.** Every page the homeowner sees is the contractor's brand.
6. **Don't build what they won't use.** Small reno contractors don't use dashboards, analytics, or automation tools. They use their phone.

---

## Build Sequence

| Order | Feature | Rationale |
|-------|---------|-----------|
| 1 | Default-accepted line items | Fastest win. Removes friction immediately. |
| 2 | Line item transparency cards | Core trust feature. Shows the math. |
| 3 | Per-category markup controls | Needed before tiers work properly. |
| 4 | Good/Better/Best tiers | Highest revenue impact for contractors. |
| 5 | AI scope gap detection | Quick rules-based build. Catches missing items. |
| 6 | Improved PDF output | Better homeowner presentation. Includes tiers + visualizations. |
| 7 | E-signature | Simple approval flow on top of improved PDF. |
| 8 | Quote versioning | Send revised quotes without losing history. |
| 9 | CSV price list upload | Contractor's own costs replace Ontario DB defaults. |
| 10 | Assembly/package templates | Save and reuse common quotes. |
| 11 | Default deposit change to 15% | Config change. Ship whenever convenient. |

---

## Database Notes

Every new table needs `site_id` + RLS. Non-negotiable. The coding agent determines exact schema.

- **Transparency card data** — Calculation breakdown per line item. Store or reconstruct from generation context.
- **Quote versions** — Snapshots of `quote_drafts`. Version number, timestamp, sent status.
- **Contractor price list** — Per-tenant: item name, category, unit, unit cost, sell price, source.
- **Assembly templates** — Per-tenant: template name, line items (JSONB).
- **Scope gap rules** — Code-based, not database. Pattern matching against project type + line items.
- **E-signature records** — Name, timestamp, IP, quote version ID.
- **Per-category markups** — New key in `admin_settings` JSONB.
- **Good/Better/Best tiers** — Already exists in `quote_drafts`. Needs UI + generation logic.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time from lead to quote sent | < 5 minutes |
| Contractor edits per quote | < 3 line items changed |
| Average job value with tiers | +15–25% vs single-tier |
| Contractor price list adoption | 50%+ within 3 months |

---

*This PRD supersedes the earlier version. Build in sequence. Ship each feature complete before starting the next.*
