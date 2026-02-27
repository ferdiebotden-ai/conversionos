# ConversionOS Quote Engine v2: Competitive Analysis, Gap Analysis & Product Requirements Document
## Executive Summary
ConversionOS occupies a unique position in the contractor quoting landscape. No competitor closes the loop from room photo visualization to AI-generated quote with full homeowner context. However, the current quoting system is functionality-first, not UX-first, and several mature platforms — particularly Bolster, Jobber, and Buildxact — have established patterns for contractor quoting that define the bar for adoption and homeowner conversion. This report maps the competitive landscape across nine platforms, distills the 15 most impactful UX patterns, identifies specific gaps in ConversionOS, and delivers a high-level PRD for Quote Engine v2.

***
## Part 1: Competitive Landscape
### Buildxact (Australia / Global)
Buildxact is a cloud-based estimating platform purpose-built for residential builders and remodelers. Its AI suite, branded "Blu," includes an Estimate Generator, Estimate Reviewer, Takeoff Assistant, and Assembly/Recipe Assistant — all trained on thousands of real residential projects. The Estimate Generator accepts natural language project descriptions (text or voice), factors in location-based pricing, and produces a complete, editable estimate in minutes. The Estimate Reviewer acts as a second set of eyes, flagging missing items, compliance gaps, and insurance considerations. Buildxact integrates with supplier catalogs so contractors can pull live material pricing from their preferred dealers.[^1][^2]

| Attribute | Details |
|-----------|---------|
| **Target** | Small to mid-size residential builders (1-10 employees) |
| **Pricing** | Entry ~$170/mo, Pro ~$340/mo, Master ~$510/mo (US, annual)[^3] |
| **AI Features** | Blu Estimate Generator, Reviewer, Takeoff Assistant, Assembly Assistant[^2] |
| **Client Presentation** | Digital signatures, customizable quote letters, client portal (Pro+)[^3] |
| **Strengths** | Deep AI integration, supplier pricing, digital takeoffs |
| **Weaknesses** | High pricing for small contractors, steep learning curve, limited integrations[^4] |
### Jobber (Canada)
Jobber is the most widely adopted platform among Canadian home service contractors. Its quoting flow emphasizes speed and client experience: contractors build quotes from a mobile-first line item library, add optional line items with checkboxes for client self-selection, and present Good/Better/Best quote options directly in their ClientHub portal. Clients can approve quotes, select optional add-ons, and pay deposits entirely online, 24/7. Jobber's automatic quote follow-ups via email and text message address the #1 reason quotes stall: contractors forgetting to follow up.[^5][^6][^7]

| Attribute | Details |
|-----------|---------|
| **Target** | Home service contractors (1-50 employees), broad trades |
| **Pricing** | Starting ~$49/user/month[^8] |
| **Key Feature** | Optional line items with checkboxes, Good/Better/Best options, auto follow-ups[^5][^7] |
| **Client Presentation** | ClientHub web portal with 24/7 approval, e-signature, deposit payment |
| **Strengths** | Mobile-first, fast quoting, excellent client UX, Canadian-built |
| **Weaknesses** | Not built for complex renovation estimates; no assembly/template libraries for reno-specific line items |
### Buildertrend (US)
Buildertrend is a full project management platform targeting small to mid-size residential builders. Its estimating workflow follows a traditional path: create line items with cost codes, apply markups per line or globally, generate a formatted proposal with scope of work sections, and release it for client review. The system flows from estimate to bid to purchase order to bills, creating a single data thread through the project lifecycle. Buildertrend includes a client portal with daily logs, shared photos, and communication tools.[^9][^10]

| Attribute | Details |
|-----------|---------|
| **Target** | Small to mid-size residential builders, $1M-$20M revenue |
| **Pricing** | ~$8K-$10K/year, unlimited users[^9] |
| **Estimating** | Manual line items with cost codes, global/per-line markups, proposal templates |
| **Client Presentation** | Formatted proposal with scope, payment schedule, e-signature |
| **Strengths** | End-to-end project management, strong bid-to-bill pipeline |
| **Weaknesses** | Complex interface, steep learning curve, clunky estimating for small reno work |
### Houzz Pro (US)
Houzz Pro differentiates through its marketing-to-estimating pipeline, similar in spirit to ConversionOS. Its AutoMate AI (launched August 2025) generates estimates from typed or voice descriptions — including project type, space size, and quality tier — with location-adjusted labor and material costs. One contractor reported the AI tool "can do in 20 seconds what it would take an experienced person an hour to do". The platform features built-in Cost Catalogs, a Clipper tool for saving products from vendor websites, and assemblies that combine components into reusable blocks. Client-facing, Houzz Pro offers per-line-item approval or whole-proposal approval with e-signatures from any device.[^11][^12][^13]

| Attribute | Details |
|-----------|---------|
| **Target** | High-end remodelers, interior designers, design-build firms |
| **Pricing** | Tiered plans; mid-range ~$65-$130/mo |
| **AI Features** | AutoMate AI: voice/text to estimate, AI tasks, AI expenses[^12] |
| **Client Presentation** | E-signature, line-item or whole-proposal approval, change order signatures[^11] |
| **Strengths** | AI estimating, strong marketing integration, visual design focus |
| **Weaknesses** | Focused on design/marketing; not as deep for pure reno contractors |
### Bolster (Canada) — KEY COMPETITOR
Bolster (formerly CostCertified) is the most conceptually aligned competitor to ConversionOS. Founded in Calgary by a former contractor, Y-Combinator backed, with over $1 billion in construction projects sold through the platform. Bolster's patented interactive estimating system transforms static quotes into "point-of-sale experiences" where homeowners can browse upgrades, toggle optional items, and see real-time price changes — effectively doing cost engineering on their own renovation before signing. Contractors using upgrades and selections report winning 15% bigger jobs annually because homeowners self-select premium options without feeling pressured. Bolster's assembly library enables 84% faster estimating with pre-built cost blocks, and AutoCost provides live, region-specific pricing for millions of items.[^14][^15][^16][^17]

| Attribute | Details |
|-----------|---------|
| **Target** | Residential remodelers and home builders (2-25 employees) |
| **Pricing** | Pro $399/mo, Premium $499/mo (annual billing)[^15] |
| **Key Feature** | Interactive estimates with real-time upgrades, selections, optional items[^16] |
| **Client Presentation** | Interactive web quote (not PDF) with upsell capabilities, client portal[^15] |
| **Strengths** | Interactive client experience, upselling mechanics, fast estimating |
| **Weaknesses** | High price point, limited third-party integrations, learning curve for setup[^15] |
### CoConstruct (US)
CoConstruct serves custom home builders and high-end remodelers with a single-entry financial system: data entered once flows through specs, selections, bid requests, proposals, change orders, purchase orders, and budgets without re-entry. It uses a three-tier data structure (Categories → Items → Cost Lines) with spec/selection templates including industry-standard NAHB templates. The "what if" pricing feature lets prospects explore options online with real-time budget updates as they make selections.[^18][^19]

| Attribute | Details |
|-----------|---------|
| **Target** | Custom home builders, high-end remodelers ($2M-$20M revenue) |
| **Pricing** | Based on active job sites with client access[^18] |
| **Key Feature** | Single-entry system from estimate through to purchase orders[^19] |
| **Strengths** | Deep financial integration, selection management, spec templates |
| **Weaknesses** | Complex for small reno contractors, enterprise-focused pricing |
### ClearEstimates (US)
ClearEstimates is a focused estimating tool with a 13,000+ pre-loaded line item database and 200+ project templates, with costs updated quarterly and adjusted to 400+ US locations. Templates are quantity-driven: enter a room's square footage and all line items auto-calculate. The platform generates professional proposals with pre-written contract language and supports alternate bids with different pricing. At $59-$119/month, it offers the strongest price-to-value ratio for pure estimating.[^20][^21][^22]

| Attribute | Details |
|-----------|---------|
| **Target** | Small residential remodelers, handymen (1-10 employees) |
| **Pricing** | Standard $59/mo, Pro $99/mo (annual)[^20] |
| **Key Feature** | 13,000+ line items, 200+ templates, location-adjusted pricing[^20] |
| **Strengths** | Easiest learning curve, rich template library, affordable |
| **Weaknesses** | No mobile app, limited integrations, no client portal |
### STACK Construction Technologies (US)
STACK is a cloud-based takeoff and estimating solution primarily targeting subcontractors and specialty trades. It excels at digital plan takeoff with AI-powered features like auto-count and aerial image analysis. STACK offers an "Estimate Without Drawings" mode for manual quantity entry that still leverages assembly formulas. The platform can generate professional bid-ready proposals and alternate scenarios from estimates.[^23][^24]

| Attribute | Details |
|-----------|---------|
| **Target** | Subcontractors, specialty trades, medium-to-large projects |
| **Pricing** | From ~$2,000/year[^25] |
| **Key Feature** | AI-powered takeoffs, assembly libraries, estimate-without-drawings mode[^23] |
| **Strengths** | Best-in-class digital takeoff, strong for complex commercial work |
| **Weaknesses** | Not built for residential reno; no consumer-facing quote presentation |
### Contractor Foreman (US)
Contractor Foreman is a 35+ module all-in-one platform at an aggressive $49/month price point. Estimating supports both quick lump-sum and detailed job-costed formats. Contractors can build estimates from a Cost Items Database, import from previous estimates or Excel, and apply markups per line or globally. The platform includes a client-facing cover sheet and proposal with scope of work, inclusions, and exclusions. Mobile apps for iOS and Android allow field estimating and direct email to customers.[^26][^27]

| Attribute | Details |
|-----------|---------|
| **Target** | Small to medium contractors, all trades |
| **Pricing** | Starting $49/month[^27] |
| **Key Feature** | 35+ modules including estimates, invoicing, project management |
| **Strengths** | Best price-to-feature ratio, mobile field estimating, broad module set |
| **Weaknesses** | Jack-of-all-trades; estimating lacks depth of specialized tools |
### Competitive Feature Matrix
| Feature | ConversionOS | Bolster | Jobber | Buildxact | Houzz Pro | Buildertrend | ClearEstimates | CoConstruct |
|---------|-------------|---------|--------|-----------|-----------|-------------|----------------|-------------|
| AI Quote Generation | ✅ | ❌ | ❌ | ✅ Blu | ✅ AutoMate | ❌ | ❌ | ❌ |
| Room Photo Analysis | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI Visualization | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Interactive Client Quote | ❌ | ✅ | Partial | ❌ | Partial | ❌ | ❌ | ✅ |
| Optional/Toggle Items | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Good/Better/Best | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| E-Signature | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assembly/Template Library | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Supplier Pricing Integration | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Change Order Management | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Mobile Field Quoting | Partial | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Quote Follow-up Automation | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| White-Label Branding | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Partial | ❌ |
| Ontario Pricing Database | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

***
## Part 2: Best-in-Class Quoting UX Patterns
Across all platforms researched, these 15 patterns define world-class contractor quoting:
### 1. Interactive Client-Facing Quotes (Not Static PDFs)
Static PDFs are the industry default but create friction: version control issues, no visibility into client behavior, and manual revision cycles. Bolster's interactive estimates allow homeowners to toggle options, browse upgrades, and see prices update in real time — turning the estimate into a "virtual showroom". This pattern transforms a cost document into a sales tool. Interactive quotes also enable real-time engagement tracking — contractors know when quotes are viewed and which sections get attention.[^28][^29][^16]
### 2. Optional Line Items with Client Self-Selection
Jobber's optional line items with checkboxes let clients add services to their quote without contractor intervention. The contractor marks items as "recommended" (pre-checked) or purely optional, and the total updates dynamically as clients toggle items. This pattern increases average job value while giving homeowners a sense of control rather than being "sold to."[^30][^5]
### 3. Good/Better/Best Tiered Presentation
The Good/Better/Best pricing strategy is backed by Harvard Business Review as a psychological pricing technique that gives homeowners the "power of choice". Jobber highlights the recommended option, and clients can review all tiers in ClientHub 24/7. The key UX requirement: present tiers side-by-side with clear scope differences, not just different price numbers. ConversionOS already generates tiers — the opportunity is in how they are presented to the homeowner.[^7][^31]
### 4. Assembly/Template Libraries for Rapid Quoting
ClearEstimates' 200+ templates with 13,000+ line items, Buildxact's Blu assembly system, and Bolster's pre-built assemblies all share a pattern: the contractor doesn't start from zero. Common job types (mid-range kitchen, 3-piece bathroom, basic basement) have pre-built cost blocks that auto-calculate based on room dimensions. The best systems let contractors customize these assemblies once and reuse them across all future quotes.[^2][^20][^17]
### 5. E-Signature and Instant Approval
Houzz Pro's approach is the gold standard: clients can approve the entire proposal or approve line items individually, sign electronically from any device, and pay a deposit in the same flow. Removing the print-sign-scan cycle is a direct conversion accelerator. Every major platform except ClearEstimates and the current ConversionOS offers e-signature.[^32][^11]
### 6. Automated Quote Follow-Ups
Jobber's auto follow-up feature sends email and/or text reminders to clients who haven't responded to quotes. This addresses the single biggest conversion leak in contractor sales: quotes that go cold because the contractor got busy on a job site. Configurable timing (e.g., 3 days, 7 days) and message templates turn this from "nagging" into professional persistence.[^6]
### 7. Mobile-First Quote Building
68% of quote calculator traffic comes from mobile devices. Contractors work from trucks, job sites, and kitchen tables — not desks. Mobile-first means touch targets of at least 44x44 pixels for glove use, large fonts (16-18px) for outdoor visibility, and offline access for areas with poor connectivity. One study showed mobile optimization alone generated 67 additional qualified leads monthly and a 44-point improvement in mobile completion rates.[^33][^34]
### 8. Real-Time Markup and Margin Visibility
Jobber shows estimated margin per line item as contractors build quotes. Buildertrend allows per-line or global markup adjustment with instant owner-price recalculation. Contractors need to see their profit margin in real-time as they adjust prices — not after they've sent the quote.[^6][^9]
### 9. Photo and Visualization Integration in Quotes
ConversionOS is the only platform that generates AI visualizations from room photos, but no platform yet integrates those visuals directly into the quote the homeowner receives. Bolster's interactive estimate can include images, and Jobber supports line item images on Grow plans. The pattern: attach before/after visuals directly to the quote so the homeowner sees what they're paying for, not just dollar amounts.[^6]
### 10. Change Order Management with Audit Trail
Professional change order handling requires: original contract value, cumulative approved changes, current change cost, and new proposed total — all in one view. Procore's approach uses standardized templates, mobile creation, and automatic budget sync. For renovation contractors, change orders should be as easy to create as the original quote, with full version history showing what changed, when, and why.[^35][^36]
### 11. Quote-to-Job-to-Invoice One-Click Conversion
When a homeowner approves a quote, the system should automatically generate the invoice structure, schedule, and deposit request without re-entering data. Jobber, Bolster, and Buildertrend all support this. CoConstruct's single-entry system is the most elegant: data flows from estimate through to purchase orders without any re-keying.[^19]
### 12. Client Portal for Ongoing Project Visibility
Bolster's Client Portal lets homeowners track project progress and make payments online. Houzz Pro's client dashboard shows real-time project status. The pattern extends beyond the quote: once accepted, the homeowner should have a persistent place to view their quote, see updates, and make payments — branded to the contractor, not a third-party platform.[^32][^15]
### 13. Homeowner Education Within the Quote
Homeowners want to understand what drives price up or down. The best quotes include brief explanations of why certain items cost what they do, what assumptions are being made, and what's excluded. ConversionOS already includes assumptions and exclusions — the opportunity is making these more educational and contextual rather than legal boilerplate.[^37]
### 14. Speed: Lead to Sent Quote in Under 5 Minutes
Bolster reports 84% less time estimating. Houzz Pro's AI generates estimates "2x faster than manual methods". ClearEstimates' template approach lets contractors price a full project by entering a single square footage number. The benchmark: a contractor should be able to review an AI-generated lead, customize the quote, and send it to the homeowner in under 5 minutes. ConversionOS's AI-generated quote draft positions it well, but the review/edit/send UX needs to match this speed target.[^21][^13][^17]
### 15. White-Label Brand Consistency
ConversionOS is the only platform in this competitive set that offers true white-label branding where every touchpoint — website, chat, quote, email, PDF, client portal — reflects the contractor's brand, not the platform's. This is a significant differentiator for contractor adoption. The quote experience must continue this pattern: no "Powered by" badges, contractor logo on every touchpoint, brand colors throughout.[^38]

***
## Part 3: Gap Analysis & Recommendations
### Gap Analysis: What ConversionOS Is Missing
Gaps are prioritized by impact on two outcomes: (1) contractor adoption and (2) homeowner-to-booked-job conversion.

| Gap | Priority | Impact | Best-in-Class Reference |
|-----|----------|--------|------------------------|
| Interactive client-facing quote (not just PDF) | 🔴 Critical | Homeowners expect to interact with quotes, not download files | Bolster, Jobber ClientHub |
| E-signature and online approval | 🔴 Critical | Removes friction from the approval process | Houzz Pro, Jobber, Buildxact |
| Optional/toggle line items for homeowners | 🔴 Critical | Enables self-serve upselling and client control | Bolster, Jobber |
| Assembly/template library | 🟡 High | Contractors need reusable quote blocks for common jobs | ClearEstimates, Buildxact, Bolster |
| Automated quote follow-ups | 🟡 High | Addresses #1 conversion leak (cold quotes) | Jobber |
| Change order management | 🟡 High | Required for scope changes post-approval | Procore, Buildertrend, Bolster |
| Mobile-optimized quote editing | 🟡 High | Contractors quote from the field | All major competitors |
| Real-time margin visibility | 🟠 Medium | Contractors need to see profit as they build | Jobber, Buildertrend |
| Quote version history/audit trail | 🟠 Medium | Track changes, compare versions | CoConstruct, Procore |
| Online deposit payment at approval | 🟠 Medium | Capture payment at peak intent moment | Houzz Pro, Jobber, Bolster |
| Visualization images in client quote | 🟠 Medium | Show what they're paying for | Unique to ConversionOS |
| Quote analytics (views, time spent) | 🟢 Lower | Know when and how clients engage | Bolster |
### UX Recommendations: The Contractor Journey
The following recommendations are organized as a user journey from "contractor sees new lead" to "homeowner accepts and pays deposit."

#### Step 1: Lead Arrives — "The Briefing"

**Current state:** Contractor opens lead detail page, sees contact info, visualization panel, chat transcript, cost analysis.

**Recommended improvements:**
- **AI Summary Card** at the top of the lead: 3-4 sentence briefing of what the homeowner wants, key dimensions, material preferences, and estimated budget range — synthesized from the entire conversation and photo analysis. The contractor should never need to read the full chat transcript.
- **Confidence Badge** prominently displayed: "High Confidence — homeowner provided room dimensions, material preferences, and detailed scope" or "Medium — general scope only, recommend follow-up call."
- **One-tap "Review Quote"** button that takes the contractor directly to the AI-generated quote with a pre-populated summary.

#### Step 2: Quote Review — "The Workshop"

**Current state:** AI-generated line items in a table with accept/reject per item, categories, quantities, unit prices. Quote totals with contingency and HST.



**Recommended improvements:**
- **Side-by-side view**: Left panel shows the AI-generated quote. Right panel shows the homeowner's visualization photo(s) and key context (room dimensions, style preference, material notes). The contractor should always see WHY the AI chose specific line items.
- **Inline margin indicator**: Each line item shows contractor cost vs. quoted price with margin percentage. A colored bar (green = healthy margin, yellow = thin, red = negative) gives instant visual feedback.
- **Assembly mode**: Let contractors save quote configurations as assemblies. "Standard Kitchen — Mid-Range" with 11 line items becomes a one-tap starting point for the next kitchen lead, with the AI filling in dimensions and adjusting prices.
- **Quick-edit patterns**: Swipe to adjust quantity. Tap price to override. Long-press for line item detail (notes, photos, alternatives). Bulk actions for accepting/rejecting groups of items.
- **Remove the individual "Accept" button pattern**: The current workflow forces the contractor to accept 11 items one by one. Replace with: all items accepted by default (the AI generated them for a reason), contractor reviews and edits exceptions only. Keep "Accept All" as the default state, show a "Reset to AI Quote" option if the contractor wants to start over.



#### Step 3: Tier Presentation — "Good/Better/Best Builder"

**Current state:** Tiers are generated but the presentation is contractor-facing only.

**Recommended improvements:**
- **Visual tier builder**: Show three columns — Good, Better, Best — with line items that differ highlighted. The contractor drags items between tiers or toggles material grade.
- **AI-powered tier differentiation**: The AI should automatically suggest meaningful differences. Not just "stock cabinets vs. custom cabinets" but "IKEA-style flat panel in white melamine" vs. "Shaker maple with soft-close hardware" vs. "Custom inset cherry with hand-finished details." Pull from the Ontario pricing database material descriptions.
- **Recommended tier highlighting**: The AI marks the tier that best matches the homeowner's stated preferences and budget.

#### Step 4: Quote Personalization — "The Finishing Touch"

**Recommended new features:**
- **Photo integration**: Embed the homeowner's before photo and the AI-generated design concept directly into the quote. The homeowner opens their quote and immediately sees "Here's your kitchen today → here's what it could look like → here's what it costs." No competitor does this.
- **Contextual assumptions**: Instead of generic "no structural changes assumed," surface specific assumptions based on the AI's photo analysis: "Based on our assessment of your kitchen, we're assuming the existing plumbing connections behind the sink wall can be reused. If relocation is needed, add approximately $1,200-$2,500."
- **Personalized cover letter**: The AI-drafted email is a good start. Enhance it to reference specific details from the conversation: "Based on what you shared about wanting a more open feel with a modern aesthetic, we've designed three options..."



#### Step 5: Client-Facing Interactive Quote — "The Showroom"

**This is the most critical missing piece.** Instead of a static PDF, homeowners should receive a link to an interactive, branded web page.

**Layout concept:**
- **Hero section**: Contractor logo, project name, before/after visualization images
- **Tier selector**: Three tabs or cards — Good / Better / Best — with brief descriptions and total prices. Homeowner clicks to explore.
- **Line item detail (expandable)**: Each category (Cabinetry, Countertops, Flooring...) is a collapsible section. Tap to see what's included. Where applicable, show a "Choose upgrade" option that lets the homeowner upgrade a specific item and see the price delta.
- **Optional add-ons section**: Items the contractor marked as optional appear with checkboxes. "Add heated flooring: +$2,400." "Add undercabinet lighting: +$800." Price total updates dynamically.
- **Running total**: Sticky footer showing: Subtotal → HST → Total → Deposit Required.
- **Assumptions & exclusions**: Clean accordion, not legal boilerplate.
- **Action buttons**: "Approve & Pay Deposit" (e-signature + payment), "Request Changes" (opens a chat or form), "Download PDF" (for their records), "Schedule a Call" (if they have questions).
- **Trust elements**: Contractor's Google rating, years in business, license number — pulled from the existing social proof system.

#### Step 6: Approval & Payment — "The Close"

**Recommended features:**
- **E-signature**: Homeowner signs electronically in the browser. Legal, timestamped, stored.
- **Online deposit**: Integrate Stripe or Square for instant deposit payment at the moment of approval. The 50% deposit currently shown in quotes becomes a payment button, not just a line of text.
- **Approval confirmation**: Automated email to both contractor and homeowner with signed quote PDF attached, deposit receipt, and next-steps information.
- **Push notification to contractor**: Instant alert when a homeowner approves. Speed matters — the contractor should know within seconds.

#### Step 7: Post-Approval — "The Handoff"

**Recommended features:**
- **Change order flow**: Simple form — what changed, why, cost impact, new total. Requires e-signature from homeowner. Full version history maintained.
- **Automated follow-ups for unsigned quotes**: If the homeowner hasn't opened or approved the quote within 3 days, send a gentle branded follow-up email. At 7 days, send a text. Contractor can configure timing and opt out.
- **Quote analytics dashboard**: Show the contractor when the homeowner viewed the quote, how long they spent, which sections they expanded. This intelligence helps the contractor time their follow-up call perfectly.
### Feature Recommendations
#### Must-Build (Critical for Adoption & Conversion)

1. **Interactive client-facing quote page** — Replace the static PDF as the primary delivery mechanism. PDF becomes a downloadable backup. This single feature would leapfrog most competitors except Bolster.
2. **E-signature with online deposit** — Capture approval and payment at peak intent. Every day of delay between "I like this quote" and "I signed and paid" loses conversions.
3. **Optional/toggle line items** — Let homeowners add heated flooring, upgrade countertops, or choose lighting packages. Bolster reports 15% larger jobs from this pattern alone.[^16]
4. **Automated quote follow-ups** — Configurable email/text reminders for unsigned quotes. Template-based, branded to contractor.

#### Should-Build (High Impact)

5. **Assembly/template library** — Let contractors save and reuse common job configurations. "My Standard Kitchen" becomes a template the AI adapts for each new lead's dimensions and preferences.
6. **Change order management** — Simple scope change flow with cost impact, e-signature, version history.
7. **Mobile-optimized quote editing** — Touch-friendly interface for reviewing and editing quotes from the field. Large tap targets, swipe gestures, offline support.
8. **Before/after visualization in the client quote** — Embed the room photo and AI concept directly in the quote presentation. This is the moat.

#### Nice-to-Have (Differentiators)

9. **Quote view analytics** — When did they open it? How long did they look? Which sections did they explore?
10. **Real-time margin calculator** — Show profit margin per line item and overall as the contractor edits.
11. **Homeowner revision request flow** — Instead of calling or emailing, the homeowner clicks "Request Changes" and describes what they want adjusted. The AI suggests line item modifications.
12. **Quote comparison mode for homeowner** — Side-by-side tier comparison with visual diff highlighting what's different between Good/Better/Best.
### Things to Remove or Simplify
1. **Per-item "Accept" workflow**: The current flow requiring contractors to accept each of 11 AI-generated line items individually adds friction without proportional value. Default all items to accepted. Let the contractor review and edit exceptions. Keep a "Reset to AI Quote" escape hatch.

2. **Separate "Regenerate" button**: This suggests the AI got it wrong, which undermines confidence. Replace with an "Adjust Scope" option that lets the contractor refine inputs (square footage, finish level, specific material changes) and get an updated estimate — positioned as refinement, not retry.

3. **Category dropdowns on line items**: The current interface shows category dropdowns (Materials, Labor, Contract, Permit) on every line item. Most contractors won't change these. Auto-categorize and hide behind an "Advanced" toggle.

4. **"Draft Ready" status label**: This label on the lead card doesn't communicate action. Replace with "Quote Ready — Review & Send" to make the next step obvious.
### AI-Native Advantages
ConversionOS has data that no competitor can access. Here's how to weaponize it in the quoting experience:

1. **Photo-Informed Line Items**: The GPT Vision photo analysis already detects room layout, dimensions, fixtures, and condition. Use this to auto-generate highly specific line items — not "Cabinetry: $12,000" but "Replace 18 linear feet of upper and lower cabinets (L-shaped layout, 3 uppers near window need custom sizing)" with pricing pulled from the Ontario database for that exact configuration.

2. **Condition-Based Pricing Intelligence**: The photo analysis rates current room condition. Feed this into the quote as risk signals: "Existing tile flooring shows signs of water damage near the sink — recommend adding $500-$800 for subfloor inspection and potential repair." No competitor can do this without a site visit.

3. **Preference-Driven Tier Generation**: Emma captured that the homeowner loves "modern minimalist with warm wood tones." The AI should use this to generate tiers where the Best option specifically features the materials and styles they described, while Good offers a budget-friendly version of the same aesthetic — not a completely different style.

4. **Contextual Quote Narrative**: Instead of a generic email, the AI drafts a personalized cover that references the entire conversation: "Based on our conversation about transforming your L-shaped kitchen into a more open cooking space with the modern farmhouse aesthetic you described, here are three options..." This level of personalization at scale is impossible without the context pipeline.

5. **Smart Follow-Up Timing**: If quote analytics show the homeowner viewed the quote at 9pm on a Tuesday and spent 4 minutes on the "Better" option, the AI should suggest the contractor call at a similar time, mention the Better option specifically, and highlight the key differences from the Good tier they might be weighing.

6. **Automated Revision Suggestions**: When a homeowner requests changes ("Can we do quartz instead of granite?"), the AI instantly updates the quote with the new pricing from the Ontario database, flags any scope implications ("Quartz eliminates the need for periodic sealing — saves $200/year in maintenance"), and prepares the revision for contractor approval before sending.

***
## Part 4: High-Level PRD — ConversionOS Quote Engine v2
### Who It's For
**Primary Persona: The Owner-Operator Renovator**
- Runs a 1-15 employee renovation business in Ontario
- Revenue: $500K-$10M annually
- Quotes from the truck, the kitchen table, and the job site
- Not technical — uses a phone more than a computer
- Builds 20-80 quotes per year, converts 30-50%
- Pain: quoting takes 2-3 hours per job, follow-ups slip, homeowners ghost quotes
- Goal: win more jobs, at higher values, with less time estimating

**Secondary Persona: The Homeowner**
- Ages 30-55, household income $100K+
- Compares 2-4 contractor quotes before deciding
- Wants to understand what they're paying for
- Makes decisions on their phone, often at night
- Pain: quotes are confusing, hard to compare, no way to customize
- Goal: confidence that the price is fair and the scope is complete
### What It Does
#### Must-Have (Launch)

| Feature | What It Does | Why It Matters |
|---------|-------------|----------------|
| Interactive Client Quote | Branded web page with tier selection, optional items, photo integration, running total | Replaces static PDF; homeowners expect interactive experiences; 15% larger jobs from self-serve upselling[^16] |
| E-Signature + Online Deposit | Sign and pay in the browser at the moment of approval | Captures conversion at peak intent; removes print/scan friction |
| AI Quote Summary | 3-4 sentence AI briefing card for contractors, synthesizing homeowner conversation and photo analysis | Contractors shouldn't need to read chat transcripts; speeds up review |
| All-Accepted Default | Line items pre-accepted with exception-based editing | Removes per-item accept friction; trusts the AI; faster workflow |
| Automated Follow-Ups | Configurable email/text reminders for unsigned quotes | Addresses #1 conversion leak; branded to contractor |
| Before/After in Quote | AI visualization embedded in client-facing quote | No competitor has this; shows what the homeowner is paying for |

#### Should-Have (v2.1)

| Feature | What It Does | Why It Matters |
|---------|-------------|----------------|
| Assembly Library | Save and reuse common job configurations | Speeds repeat quoting; contractor builds once, uses forever |
| Change Order Flow | Scope change form with cost impact, e-signature, version history | Required for post-approval scope changes; professional workflow |
| Optional Line Items | Contractor marks items as optional; homeowner toggles with price update | Self-serve upselling without pressure |
| Mobile Quote Editor | Touch-optimized editing with swipe gestures, large targets, offline mode | 68% of quote traffic is mobile[^34]; contractors work from field |
| Margin Visibility | Real-time profit margin per line item during editing | Contractors need to see their profit as they build |

#### Nice-to-Have (v2.2+)

| Feature | What It Does | Why It Matters |
|---------|-------------|----------------|
| Quote View Analytics | Track open time, section engagement, tier browsing | Intelligence for follow-up timing and strategy |
| Homeowner Revision Chat | "Request Changes" opens structured revision flow | Reduces phone/email back-and-forth |
| Quote Comparison View | Side-by-side tier comparison with diff highlighting | Helps homeowners decide between options |
| Smart Follow-Up Timing | AI suggests optimal follow-up based on viewing patterns | Data-driven sales intelligence |
### User Flows
#### Flow A: Contractor Builds Quote from AI-Generated Lead

1. **Notification**: Contractor receives push notification / email: "New lead — Kitchen renovation, Stratford, High Confidence"
2. **Lead Review**: Opens lead detail → sees AI Summary Card (3 sentences: what the homeowner wants, key dimensions, estimated range). Visualization thumbnail visible.
3. **Quote Entry**: Taps "Review Quote" → sees AI-generated line items, all accepted by default. Right panel shows homeowner's room photo and key context.
4. **Quick Edit**: Scans line items. Adjusts two prices (knows his cabinet guy charges less). Adds an optional line item for backsplash accent tile. Moves heated flooring to "optional."
5. **Tier Check**: Flips to tier view. AI has generated Good ($32K), Better ($43K), Best ($58K) with the Better tier highlighted as matching homeowner preferences. Contractor adjusts Best tier cabinetry upward.
6. **Preview**: Taps "Preview Client Quote" → sees exactly what the homeowner will see. Before/after visualization at top. Tiers. Optional items with checkboxes. Running total. Approve button.
7. **Send**: Reviews AI-drafted email. Taps "Send Quote." Email with interactive quote link goes to homeowner. Contractor closes the app.
8. **Total time**: 4-6 minutes.

#### Flow B: Homeowner Receives and Interacts with Quote

1. **Email**: Receives branded email from "McCarty Squared Renovations" with personalized message referencing their conversation with Emma.
2. **Opens Quote Link**: Branded page loads. Hero shows their kitchen photo and the Modern design concept they chose.
3. **Tier Exploration**: Three options displayed. "Better" is highlighted as "Recommended based on your preferences." Homeowner taps each to see scope details.
4. **Customization**: In the Better tier, they expand "Countertops" and see "Quartz — Calacatta-style" at $6,000. An "Upgrade" button shows granite option at -$1,000 and marble at +$4,000. They stick with quartz.
5. **Optional Items**: Scrolls to optional section. Checks "Under-cabinet LED lighting: +$800." Unchecks "Heated flooring: +$2,400." Total updates live.
6. **Decision**: Scrolls to bottom. Sees total, HST, deposit amount. Reads assumptions. Taps "Approve & Pay Deposit."
7. **Sign & Pay**: E-signature field appears. Signs. Stripe payment form loads. Pays 50% deposit.
8. **Confirmation**: Both homeowner and contractor receive confirmation email with signed quote PDF and deposit receipt.

#### Flow C: Contractor Handles a Revision / Change Order

1. **Homeowner Request**: Homeowner clicks "Request Changes" on the interactive quote. Types: "Can we change the flooring to engineered hardwood instead of LVP? Also wondering about adding pot lights."
2. **AI Suggestion**: System presents the contractor with suggested line item changes — LVP → Engineered Hardwood (price delta +$1,800), add 6 pot lights ($1,200 materials + $900 installation). Shows updated total.
3. **Contractor Review**: Adjusts pot light count to 8 (knows the layout needs it from the photo analysis). Approves revision.
4. **Change Order**: System generates change order showing: original quote total, this change's value, new total. Sends to homeowner for e-signature.
5. **Homeowner Approves**: Reviews changes, signs electronically. Updated quote replaces original as the working version.
### Design Principles
1. **AI-Generated, Human-Refined**: The AI does the heavy lifting. The contractor is an editor, not a creator. Every screen should present an AI recommendation with easy override controls.

2. **5-Minute Quote Promise**: From "new lead notification" to "quote sent to homeowner" should never exceed 5 minutes for a standard renovation. Every click that doesn't directly contribute to this goal should be questioned.

3. **Show, Don't Tell**: Homeowners shouldn't just read line items — they should see their renovation. Every quote should include the visualization. Every tier should make the difference visual, not just numerical.

4. **Mobile-First, Desktop-Enhanced**: Design for the contractor's phone first. Touch targets, thumb zones, minimal scrolling. The desktop experience should feel like a luxurious version of the mobile experience, not the other way around.

5. **Contractor's Brand, Always**: Every pixel the homeowner sees reinforces the contractor's brand. Logo, colors, contact info. Zero platform branding in the client experience.

6. **Trust Through Transparency**: Show the homeowner what's included, what's excluded, and what assumptions are being made — in plain language, not legal boilerplate. Explain what drives price. Address fears proactively.[^37]

7. **Capture Intent Immediately**: When a homeowner is ready to approve, don't make them call, email, or print anything. E-signature and payment should be one tap away from the "I like this" moment.
### What NOT to Build
| Feature | Why Not |
|---------|---------|
| Project scheduling / Gantt charts | Out of scope. ConversionOS stops at "quote accepted, invoice sent, payment received." Scheduling is a different product category. |
| Subcontractor management / bid requests | CoConstruct and Buildertrend territory. Small reno contractors manage subs by phone, not software. |
| Digital plan takeoff / blueprint measurement | STACK and Buildxact territory. ConversionOS leads get dimensions from AI photo analysis and homeowner conversation, not construction drawings. |
| Daily logs / punch lists / site documentation | Project management features that dilute the quoting focus. |
| Accounting integration (QuickBooks/Xero sync) | Sage 50 CSV export is already supported. Full accounting sync is a future consideration, not a v2 requirement. |
| Complex formula-based estimating | ClearEstimates territory. ConversionOS's AI handles the calculation; the contractor adjusts the output. |
| Multi-trade bid management | Enterprise GC feature. Small reno contractors don't run formal bid processes for their subs. |
| Inventory / materials management | Wrong market. Small contractors don't manage inventory in software. |
| Customer financing integration | Interesting but premature. Focus on core quoting first. |

***
## Appendix: ConversionOS Current System Screenshots
The following screenshots document the existing ConversionOS quoting system as of February 2026, for reference against the recommendations above.

**AI Chat Agent (Emma) — Homeowner-Facing:**



**AI-Generated Quote with Line Items — Contractor Admin:**



**Accepted Quote Line Items — Detailed View:**



**Quote Totals with Assumptions & Exclusions:**



**Quote Totals, Assumptions, and Exclusions (Pre-Line-Items):**



**Settings — Per-Square-Foot Pricing by Room Type:**



**Settings — Rates & Defaults:**



**Send Quote Email — AI-Drafted:**



**Generated PDF Quote:**

---

## References

1. [How do I use the Blu: Estimate Generator?](https://help.buildxact.com/en/articles/11324542-how-do-i-use-the-blu-estimate-generator) - Learn how to create detailed and accurate estimates using the AI-powered Blu: Estimate Generator.

2. [Blu: Assembly/Recipe Assistant](https://help.buildxact.com/en/articles/11324156-what-is-blu) - Learn all about Buildxact's suite of AI-powered construction tools known as Blu.

3. [Pricing](https://www.buildxact.com/us/pricing/) - Buildxact is in the cloud with simple month-to-month pricing. All Buildxact packages include softwar...

4. [Buildxact Review 2025: Powerful for Complex Projects, But Pricey and Missing Basics](https://www.reddit.com/r/Connecteam/comments/1kvw6ri/buildxact_review_2025_powerful_for_complex/) - Buildxact Review 2025: Powerful for Complex Projects, But Pricey and Missing Basics

5. [Optional Line Items on Quotes - Jobber Help Center](https://help.getjobber.com/hc/en-us/articles/360046575473-Optional-Line-Items-on-Quotes) - Optional line items provide clients with extra products and services they can choose to add onto the...

6. [Quoting on the Grow Plan](https://help.getjobber.com/hc/en-us/articles/360049853114-Quoting-on-the-Grow-Plan) - Table of Contents Overview Boost your revenue with optional line items Optional line items as add-on...

7. [Use Quote Options in Jobber to Earn Trust and Beat the Competition](https://www.youtube.com/watch?v=VEsDRJ-QQcM) - Give clients the flexibility to choose and watch higher-value approvals come faster with new quote o...

8. [Top 10 Quoting Software Tools in 2025: Features, Pros ... - Cotocus](https://www.cotocus.com/blog/top-10-quoting-software-tools-in-2025-features-pros-cons-comparison/) - Meta Description: Discover the top 10 quoting software tools for 2026! Compare features, pros, cons,...

9. [How to create a manual proposal in Buildertrend](https://www.youtube.com/watch?v=FQm62nc_LPU) - Want to get started sending proposals using Buildertrend, then watch this video. This video covers c...

10. [From Estimate to Bill: Complete Buildertrend Purchasing Workflow](https://www.youtube.com/watch?v=4apSNq2tga4) - Dial-in a comprehensive purchasing workflow with Buildertrend. Move from Estimate ... Complete Build...

11. [Make it easy for clients to say yes!](https://www.houzz.co.uk/for-pros/feature-e-signature-approvals) - Win more projects with clear, professional estimates that your clients can view, approve and sign on...

12. [houzz pro launches automate ai tools to simplify admin work](https://www.constructionowners.com/press-release/houzz-pro-launches-automate-ai-tools-to-simplify-admin-work) - Houzz Pro introduces AutoMate AI, enabling construction and design pros to instantly generate estima...

13. [Houzz Pro Introduces New AutoMate AI Tools](https://kbbonline.com/business-people-news/houzz-pro-introduces-new-automate-ai-tools/163737/) - With AutoMate AI, pros can now instantly generate financial documents, tasks, expenses and more from...

14. [InterGen Breakfast Club presents Bolster](https://intergenconnect.com/news-events/intergen-breakfast-club-presents-bolster) - Envisioned to be a consumer-driven construction marketplace where contractors can give their custome...

15. [Bolster Reviews - 2025](https://slashdot.org/software/p/Bolster-CostCertified/) - Bolster user reviews from verified software and service customers. Explore ratings, reviews, pricing...

16. [Construction Selections Software | Bolster](https://www.bolsterbuilt.com/en-ca/upsells) - Increase your job size with optional items, costed upgrades, and selector tools - allowing your clie...

17. [Construction Estimating Software | Bolster](https://www.bolsterbuilt.com/en-ca/estimates) - Give your customers pre-defined options, upgrades and selections, so they can continuously re-estima...

18. [Estimating & Proposals: Accurate Project Pricing - CoConstruct](https://www.coconstruct.com/learn-construction-software/estimating-proposals-accurate-project-pricing) - The first step in building out your estimate is to input the items and outlining the relevant costs ...

19. [CoConstruct](https://www.softwareadvice.ie/software/2255/co-construct) - Review of CoConstruct Software: system overview, features, price and cost information. Get free demo...

20. [Plan Options - Clear Estimates](https://www.clearestimates.com/pricing) - Flexible Prices To Fit Your Budget · Unlimited Estimates & Customers · 13,000+ Line Item Database · ...

21. [Adding Templates](https://www.youtube.com/watch?v=P1SJqFFO_gM) - The Clear Estimates Visual Library is a series of help guides for newer computer users! This video s...

22. [Clear Estimates](https://slashdot.org/software/p/Clear-Estimates/) - Clear Estimates user reviews from verified software and service customers. Explore ratings, reviews,...

23. [STACK's Top Features of 2025](https://www.stackct.com/blog/stacks-top-features-of-2025/) - 2025 was yet another year of stellar product and development work for STACK teams. Check out our top...

24. [STACK Cloud-Based Construction Takeoff & Estimating Solution](https://www.stackct.com/takeoff-and-estimating/) - Bid more projects in less time with STACK’s comprehensive takeoff and estimating solution. Get 10X f...

25. [STACK 2025: Software Features, Integrations, Pros & Cons | Capterra](https://www.capterra.com/p/147181/STACK-Takeoff/) - Explore our in-depth STACK coverage and see how it fits your software needs. Read our comprehensive ...

26. [Estimating with Contractor Foreman](https://www.youtube.com/watch?v=AFczh1A5DUU) - Updated: Estimating with Contractor Foreman at http://ContractorForeman.com

Setup a free account or...

27. [Creating Estimates with Contractor Foreman](https://www.youtube.com/watch?v=Oua2ImE0tOM) - Get a FREE account at https://ContractorForeman.com

Try it FREE for 30 days! Over 35 powerful featu...

28. [The Interactive Quote: A Sales Tool That Works for You - Centralio](https://www.centralio.com/en/the-interactive-quote-a-sales-tool-that-works-for-you/) - An interactive quote can include an FAQ, client testimonials, or a direct contact option—removing ba...

29. [Bolster - Apps on Google Play](https://play.google.com/store/apps/details?id=com.bolsterbuilt.app&hl=en_US) - Fastest estimating software for construction

30. [Using Optional Line Items on Quotes | Quoting and Estimates](https://www.youtube.com/watch?v=cIz98xz1iMM) - What does Jobber do? Watch Quoting & Estimates Help in Jobber to find out how Jobber works. This Job...

31. [How to Present Good-Better-Best Pricing - Leap](https://leaptodigital.com/2022/11/18/how-to-present-good-better-best-pricing) - Good-Better-Best pricing offers attractive value-based options for homeowners that can drive high pr...

32. [Perfect Your Construction Workflow with Houzz Pro](https://pro.houzz.com/pro-learn/blog/perfect-your-construction-workflow-with-houzz-pro) - Houzz Pro's e-signature and approvals feature makes it easier for clients to say yes and reduces the...

33. [Mobile-First Design for Construction Management Software: Field Usability Guide](https://www.altersquare.io/mobile-first-design-for-construction-management-software-field-usability-guide/) - Explore how mobile-first design enhances construction management software, improving field usability...

34. [Mobile-First Quote Calculator Design: Essential Strategies for 2025](https://silverspidermedia.com/blog/mobile-quote-calculator-design) - Master mobile quote calculator design with proven strategies that achieve 90%+ mobile completion rat...

35. [How Change Orders Work in Construction | Procore CA](https://www.procore.com/en-ca/library/how-construction-change-orders-work) - 6 things every change order should include · 1. Project and contact information · 2. Dates of the ch...

36. [Construction Change Order Management Software | Procore](https://www.procore.com/financial-management/change-orders) - Procore's change order management software streamlines and improves critical steps in the manual cha...

37. [What Homeowners Want From Contractors: 5 Insights for 2026](https://servicebusinessmastery.com/what-homeowners-want-from-contractors/) - 1. Fix Your Website Pricing Content. Add cost ranges and explanations · 2. Train Sales Teams to Educ...

38. [PRODUCT_REFERENCE.md](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/86121339/ceedf04a-d512-4383-b76e-594e99126784/PRODUCT_REFERENCE.md?AWSAccessKeyId=ASIA2F3EMEYE6SAHAM4N&Signature=rLZywpUASas6u6jIAVYjwFAlhR4%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEF4aCXVzLWVhc3QtMSJIMEYCIQC%2FY%2BbXlWKbUyKAfJ0OWeinFb0fdm0VvboDtBAdSZVaLgIhAMgg9JK2ZbQPf9leHstZDN17qdbWA8P%2B0fOWVEl7MECdKvMECCcQARoMNjk5NzUzMzA5NzA1Igw17fS5Ibfju43oywsq0AT6iNLHrztISqH%2FTjNixK%2F2JZL12n0iZ14mWuLaCablyeA9OFRwj3XARd%2BXIImCDd8wCOVGZWkg8tcEBF%2BOUDxaVOUS6bagRF798gTMC%2FYzoxeEErPO6oDrQjIWij68Fr9TO2wnDGBMnohR0mMA271b8Owb%2F9nyVmwtFEhQUjuLSJkniTw9ZI2hDC4EBKTcrPppCqPUBl5FO%2FwBrEiE0s7GTr3SuPQfiwzE7P%2Bp47RyQMzFxTvZ3ZG1A3RI2%2FEOc%2FanXj8gldw%2FY57fMOKvXU%2FQF9GqbGZZjfEc%2FnYgnkqjrK5EmuZqydHqrLFW7ZNJsLxVNVkIM7xWsmi%2B%2F%2F21UuNGbbBlaGDE5NjS7xvKeUxjIVovi%2BKW7AatzSjBQ5h6PPbxerJWIJMWBjfBdV90TSx7pvCZSr3mA9oQYfkHuXvFiopQiQk307AOhplfXrUaWzmA%2BrkZEMoksgNU5FxKXgWlFWiSMRVliSvI0VBQbBDqvvXueXYSuCL0d1z%2FHO0ha7vn50wy%2F%2F7sdJEeS0R%2F7A7e0eynQHZjFG1suzoBu4%2Bdx2R6DPeThm6ljXdwm3TyYW0y8PIOelUzJlakBwyUklWU%2FnAwqVzeIDQzMQtBb3c5VqBjw8FFPL4%2F39%2BwhE%2BF94z6PFbGe1AVOx%2FIf4aQErIjKbvulm42ZWMQtTyz3T%2FsuJrB6pBfCXiNuSvBkmvgVIUDF3TBmaiYYAdKazdfHZWdY4%2FYHHyLigCCdudprxqFWcJV3%2F9rSZNif6B7OElLtrUGGZzhpFbykhhlF08VffFbMLWSgc0GOpcBS%2BRjlv4qFaujDczW%2BIKffe5T9RsJMcdyhIgbfOod8PSknyyNNoaowI3Csrgjyt3CxTkY416gtMHGqZYjUFRy59WqP3RDs3%2FnV5wRptJWBKCpq4LIYudg0hesack1MxPoTshk%2Bw4rKnE%2F6Curgw1Fbg5Uef0fbUTlYAwppWS1B1%2B7SgWlHLtc2%2F3%2Bb7DllbU1XDYEhTHGPg%3D%3D&Expires=1772117789) - Last updated February 25, 2026 Updated by Claude Code About page team placeholders, footer legal lin...

