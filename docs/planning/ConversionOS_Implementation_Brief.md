# ConversionOS — Autonomous Pipeline Implementation Brief
## For: Claude Code Opus 4.6 Implementation Agent
## From: Architecture Research (February 24, 2026)

---

## How to Use This Document

This brief tells you **what to build and why**. For the technical mechanics of how to configure Skills, sub-agents, hooks, ElevenLabs session overrides, Playwright Vision, and parallel execution on Mac Mini, read the companion research report alongside this document. That report is your implementation reference. This brief is your mission brief — it gives you the business context to make autonomous decisions when the code surprises you.

---

## What We're Building and Why It Matters

NorBot Systems Inc. is a one-person AI-native SaaS company run by Ferdie Botden, a CPA and former TD Bank District Manager who oversaw a $1B agriculture portfolio. The product is **ConversionOS** — a white-label AI platform that replaces Ontario renovation contractors' static websites with a fully intelligent lead-to-quote engine.

The product is already built and has paying clients. The challenge being solved in this implementation is **autonomous scale**. Right now, deploying one bespoke demo site for a prospect takes a semi-manual, sequential process. The goal is to flip this to fully autonomous overnight execution: scrape a contractor's website, extract their real brand assets, build a production-ready bespoke demo of their own future product, and verify it visually — all without human involvement — for up to 40 targets per night.

**The business logic:** When a contractor sees a working version of ConversionOS branded with their actual logo, colours, testimonials, and services, their first reaction is "you built this for me?" That reaction closes deals. The bespoke demo is the sales tool. Every quality failure — a missing logo, placeholder text, a wrong colour, a voice agent that doesn't know their company name — kills that reaction and kills the deal.

---

## The Product: What ConversionOS Does

ConversionOS is a multi-tenant Next.js 16 + Supabase application. One codebase serves unlimited contractors. Each contractor gets their own subdomain on `norbotsystems.com`, their own database configuration, their own branded experience. All differentiation is database-driven through the `admin_settings` table — no per-tenant code branches exist.

The product serves two audiences:

**Homeowners** visit the contractor's branded site and get: an AI visualizer that transforms a photo of their room into 4 renovation concepts (via Gemini 3 Pro Image), an AI assistant named Emma who acts as receptionist on the homepage, design consultant on the visualizer page, and quote specialist on the estimate page — all as one persona with page-contextual knowledge injection. The "moat" is context preservation: when a homeowner moves from the visualizer to the estimate page, Emma already knows the room dimensions, the style they chose, the fixtures they have, and their material preferences. She skips all discovery questions.

**Contractors** get an admin dashboard to review leads, generate AI-assisted quotes, manage invoices, and see analytics. The Dominate tier adds voice (Emma via ElevenLabs), advanced analytics, territory exclusivity, and custom integrations.

**The three pricing tiers:**
- Elevate: $1,500 setup + $249/mo — branded site with visualizer, text Emma
- Accelerate: $4,500 setup + $699/mo — full AI quoting, admin dashboard, text Emma
- Dominate: $20,000 setup + $2,500/mo — everything + voice Emma, analytics, territory exclusivity

Current tenants: `demo` (internal), `mccarty-squared` (Dominate, real client), `redwhitereno` (Accelerate, first paying customer). 46 targets in pipeline across 51 Ontario territories.

---

## The Pipeline: Current State Honest Assessment

The pipeline is architecturally sound. The "never-generate" guardrail (real content scraped, derivable content AI-generated, missing real content hidden rather than fabricated) is a mature design decision. The 7-stage multi-provider scraping chain, Zod schema validation, and the existing Playwright QA framework are all production-grade. The system runs nightly at 11pm ET via LaunchAgent on a Mac Mini, and the AI generation runs on a $200/month Claude Code Max subscription at zero marginal cost per run.

**What's working:** Firecrawl-based scraping, structured extraction, colour conversion to OKLCH, image upload to Supabase, database provisioning, proxy routing, Vercel deployment, and the 8 functional Playwright checks.

**What's broken or missing:** Five specific gaps are preventing this from being truly autonomous at scale. They are described below in priority order.

---

## The Five Gaps — What to Build and Why Each One Matters

### Gap 1: Logo Extraction Is Unreliable (Build First)

**What's happening:** The current pipeline extracts logos through three methods — Firecrawl's LLM schema extraction, AI markdown analysis, and HTML header inspection. These work for simple `<img>` tags with semantic class names. They fail silently for approximately 50-70% of real contractor websites where logos are inline SVGs, CSS background images, lazy-loaded, or rendered by a JavaScript framework.

**Why this matters:** The logo is the single most visible signal that the demo was built specifically for this contractor. If you open a site and see your own logo in the header, the demo passes the "holy shit" test instantly. If you see placeholder text or no logo at all, the demo is just another generic website and the cold outreach email loses its entire premise.

**What to build:** A dedicated logo extraction module that runs three strategies in sequence, stopping at first success. Strategy 1: DOM extraction using Playwright after full page hydration (networkidle), querying header/nav elements for `<img>` tags, inline SVGs, and CSS background-image properties. Strategy 2: Take a screenshot of the above-the-fold viewport, crop to the header region (~250px tall), send to Claude Vision to identify the logo's location and type, then use Playwright to extract the correct asset from the DOM based on Vision's spatial analysis. Strategy 3: Favicon fallback — extract, upscale via Sharp, and flag for human review rather than blocking deployment. Every extraction should return a confidence score. Anything below 0.4 confidence should skip the tenant entirely and log the reason; the pipeline moves to the next target.

**How to integrate it:** This becomes a standalone module called from `scrape.mjs` after the current logo extraction attempts. If the current methods return a valid logo with sufficient dimensions (minimum 100x50px), skip this module. If not, run this module before the quality audit stage, since logo score is a weighted component of the deployment readiness decision.

---

### Gap 2: Emma's Voice Agent Has No Tenant Data (Build Second)

**What's changed:** The product has simplified from three separate ElevenLabs personas (Emma, Marcus, Mia) to a **single agent per tenant** with page-contextual behavior via session prompt overrides. This is actually good news architecturally — one API call to create one agent per tenant, and all page-context variation is handled at connection time in the frontend via the `overrides` parameter in `startSession()`.

**What's happening right now:** There is no pipeline step that creates or configures an ElevenLabs agent for new tenants. Every Dominate-tier demo site is either using the demo tenant's agent ID (which knows nothing about the contractor) or has no agent ID configured at all (which makes the voice widget show as unavailable). The voice feature is the most powerful differentiator at the Dominate tier, and it's currently inoperative for demo deployments.

**Why this matters:** Dominate is $20,000 setup plus $2,500/month. The voice experience is one of the primary reasons a contractor would pay that premium. When a prospect visits their bespoke demo and presses the voice button, Emma needs to answer as their company's AI — knowing their company name, their services, their territory, and their tone. Right now she doesn't.

**What to build:** A voice agent configuration step that runs during provisioning, specifically after the `provision.mjs` step seeds the database and only if the tier is Dominate. This step should call the ElevenLabs REST API to create a new agent with a system prompt built from the scraped tenant data — company name, primary services, territory, phone number, certifications, and tone characteristics. The `agent_id` returned should be stored back into the tenant's `admin_settings` record (look at how `admin_settings` handles the `voice_agents` key, or create it if it doesn't exist). Enable the `override` capability for the system prompt and first message fields in the agent's security settings, because the frontend uses these to inject page-specific context.

**The ElevenLabs architecture to understand:** One agent per tenant. When Emma is on the homepage, the frontend calls `startSession()` with an override that gives her a receptionist persona. On the visualizer, the override gives her design consultant knowledge. On the estimate page, it gives her the full Ontario pricing database and any available handoff context from the visualization. This is all handled in the frontend already — you just need the `agent_id` to exist per tenant and to be stored in the database.

---

### Gap 3: Visual QA Checks Fidelity, Not Structure (Build Third)

**What's happening:** The existing `verify.mjs` runs 8 Playwright checks. These are boolean structural tests: does the page return 200, does the title contain the business name, does the nav have links, is the services section visible, does mobile viewport render. All 8 checks can pass while the site looks wrong.

**Specific invisible failures:** The logo renders at 4px because the width attribute wasn't scraped correctly. The primary colour falls back to ConversionOS teal because OKLCH conversion failed silently. The hero image is still the ConversionOS template photo because the contractor's image URL was relative and got stripped during upload. The testimonials section renders but shows empty because real testimonials were correctly hidden — but nobody flagged that the section is blank.

**Why this matters:** Right now the pipeline tells you a site "passed QA" but Ferdie still needs to manually review each deployment before sending the cold outreach email. That manual review is the bottleneck that prevents scaling to 40 per night. Eliminating manual review is only possible if the QA system actually catches fidelity failures.

**What to build:** A visual QA module that runs after Vercel deployment, in addition to the existing structural checks (don't replace them). This module should take full-page Playwright screenshots at desktop (1440px) and mobile (390px) viewports, then call Claude Vision with a structured output schema to evaluate a specific rubric: logo is visible and appropriately sized, brand colour is applied (not default teal), hero section shows a real photo not a placeholder, testimonials section either shows real content or is correctly hidden (not empty and visible), no unfilled template tokens in page text, service cards have real descriptions, voice widget availability (Dominate only) shows as active not unavailable. The output should be a scored JSON report with a pass threshold. Screenshots should be uploaded to Supabase Storage for the Telegram notification. A site scoring below threshold should be flagged for manual review — not sent in cold outreach automatically.

**The key design principle:** You're not replacing human judgment, you're replacing the need for Ferdie to look at every deployment. Deployments that score above threshold get sent automatically. Deployments that fail go into a review queue with the screenshots attached, so the review takes 30 seconds instead of 5 minutes.

---

### Gap 4: The Pipeline Runs Sequentially (Build Fourth)

**What's happening:** The nightly orchestrator processes targets one at a time. At 3-4 minutes per target, 40 targets requires over 2.5 hours. The pipeline starts at 11pm and would run until 1:30am, with some jobs potentially running into business hours.

**Why this matters:** The 40-target-per-night goal is the scale vision. Sequential execution caps throughput at approximately 15-18 targets. Parallel execution with 4 concurrent workers gets 40 targets done in roughly 40 minutes.

**What to build:** Refactor the nightly orchestrator to spawn 4 sub-agent workers in parallel, each owning one target completely from scrape to visual QA sign-off. The orchestrator manages a job queue from the target database, assigns jobs to available workers, collects results, and sends batch Telegram summaries. Workers should be defined as sub-agents in `.claude/agents/` so the orchestrator can delegate via the Task tool. Worker scope should be strictly isolated — each worker owns its own `bespoke-targets/{site-id}.json` file and its own Supabase rows. The one shared resource that requires coordination is `proxy.ts` — solve this by having workers write their routing config to individual files and having a final merge step after all workers complete.

**The important caveat:** Do not use Agent Teams (the experimental flag) for this. Use standard sub-agents which are production-stable. Workers in this pipeline don't need to communicate with each other — they report results back to the orchestrator independently. That's exactly the sub-agent model, not the Agent Teams model.

---

### Gap 5: No Monitoring Means No Trust in Unattended Execution (Build Alongside Gap 4)

**What's happening:** The pipeline runs silently. If it fails on target 12 of 40, nothing notifies Ferdie until he manually checks logs the next morning.

**Why this matters:** You can't trust automation you can't see. The whole point of this implementation is that Ferdie sleeps while the pipeline runs. That's only possible if something wakes him if it breaks, and something confirms success if it doesn't.

**What to build:** Claude Code hooks configured at the project level that fire Telegram notifications at key lifecycle events. At minimum: a notification when each tenant onboarding completes (success or failure), a notification when visual QA fails, and a nightly batch summary after all workers finish. The Telegram notifications should include the target name, pass/fail status, quality score, and for passing deployments, the desktop screenshot thumbnail. This gives Ferdie a Telegram thread he can scroll through in the morning to see exactly what ran — and for failures, screenshots so he can diagnose in 30 seconds.

---

## The Architecture to Build

### Project Structure

```
norbot-ops/products/demo/
├── CLAUDE.md                          ← Project context for all agents
├── .claude/
│   ├── settings.json                  ← Hooks for Telegram notifications
│   ├── skills/
│   │   ├── onboard-tenant/            ← Master orchestration skill
│   │   │   ├── SKILL.md
│   │   │   └── references/
│   │   │       └── quality-rubric.md
│   │   ├── logo-extractor/            ← Three-strategy logo extraction
│   │   │   ├── SKILL.md
│   │   │   └── references/
│   │   │       └── extraction-strategies.md
│   │   ├── voice-agent-configurator/  ← ElevenLabs single-agent setup
│   │   │   ├── SKILL.md
│   │   │   └── references/
│   │   │       └── persona-template.md
│   │   └── visual-qa/                 ← Playwright + Vision QA
│   │       ├── SKILL.md
│   │       └── references/
│   │           └── fidelity-rubric.md
│   └── agents/
│       └── onboarding-worker.md       ← Parallel worker sub-agent
```

### Why Skills AND Sub-Agents

**Skills** encode the procedural knowledge for each specialized task. They describe what good looks like and how to execute it. They load into context on demand. They are the "instruction manuals" for your domain.

**Sub-agents** provide the execution isolation for parallel work. Each worker runs in its own context window, owns its own targets, and doesn't contaminate the orchestrator's context with verbose tool output. Results flow back as summaries.

The combination: the orchestrator skill (`/onboard-tenant`) describes the full end-to-end procedure. The worker sub-agent (`onboarding-worker`) executes it for one target in isolation. When you need to run 4 targets in parallel, you spawn 4 workers.

**One important known bug to work around:** The `context: fork` frontmatter field in SKILL.md is not reliably honoured when skills are invoked via the Skill tool (GitHub issue #17283, open as of Feb 2026). Do not rely on skills with `context: fork` for production pipeline work. Instead, define forked execution contexts as sub-agents in `.claude/agents/`. This is stable and production-ready.

### CLAUDE.md Content

The project CLAUDE.md should give every agent and skill the minimum context needed to make good decisions without bloating every context window. Include: what ConversionOS is (one sentence), the multi-tenant architecture (single codebase, database-driven config), the never-generate guardrail (real content scraped, derivable content AI-generated, missing real content hidden — never fabricated), the key file locations, the build/test/lint commands, and the Supabase project reference. Keep it under 150 lines. Put detailed domain knowledge in skills.

---

## Emma Voice Architecture — Important Clarification

The product has simplified from three named personas to one. **Emma is the only agent.** She adapts her behavior based on page context via session prompt overrides, not via separate agent IDs.

For the ElevenLabs voice configuration step, the implementation should:
1. Create one agent per tenant via the ElevenLabs REST API
2. Configure a base system prompt that establishes Emma's identity and the contractor's company information
3. Enable prompt overrides in the agent's security settings (this must be explicitly enabled per field in the ElevenLabs dashboard, or via API equivalent)
4. Store the single `agent_id` in `admin_settings` where the frontend expects to find it
5. The frontend already handles injecting page-specific overrides at connection time — you do not need to create multiple agents or multiple prompts server-side

The three page contexts the frontend injects are: receptionist (homepage, about, services, contact), design consultant (visualizer), and quote specialist (estimate) — each with their own persona instructions and knowledge injections. Your job in the pipeline is to ensure the base agent exists and knows who it's working for.

---

## What You Should NOT Change

The existing pipeline components that are working well should not be touched unless a specific Gap implementation requires it:

- The 7-stage scraping logic in `scrape.mjs`
- The Zod schema validation in `schema.mjs`
- The hallucination filter
- The OKLCH colour conversion
- The Supabase provisioning and proxy.ts update in `provision.mjs`
- The existing 8 structural Playwright checks in `verify.mjs` (add to them, don't replace them)
- The nightly LaunchAgent scheduling (modify timing if needed, not structure)
- The ICP scoring system in `qualify_target.py`

---

## Implementation Priority Order

Build in this sequence. Each step unblocks the next and delivers real value independently:

**Week 1 — Fix the demo quality floor**
1. Logo extraction module (Gap 1) — standalone, integrate into `scrape.mjs`
2. ElevenLabs voice agent configuration step (Gap 2) — add to `provision.mjs` for Dominate tier

**Week 2 — Make QA trustworthy**
3. Visual QA skill with Playwright screenshots + Claude Vision (Gap 3) — replace the verify.mjs final reporting, keep existing structural checks
4. Telegram hooks for individual tenant notifications (Gap 5 partial)

**Week 3 — Scale to 40/night**
5. Parallel sub-agent workers (Gap 4) — refactor nightly orchestrator
6. Nightly batch Telegram summary (Gap 5 complete)

**After validation — Polish**
7. ICP scoring enhancements (scrape quality signals)
8. Google Places real reviews injection
9. Rollback/decommission script

---

## Feasibility and Quality Assessment

### Overall Feasibility: 8.5 / 10

The architecture is sound. Every technology component has been validated: Skills and sub-agents are production-stable in Claude Code, ElevenLabs session overrides are a documented feature, Playwright + Claude Vision with structured outputs is a working pattern, parallel CLI execution is well-understood on Mac Mini. The Max subscription cost model ($0 marginal per run) makes iteration free. The existing pipeline is 70% complete and has real client deployments proving the core concept works.

The 1.5-point deduction comes from two sources of genuine uncertainty:

**Logo extraction on Ontario contractor websites.** These sites are diverse and often poorly built. The three-strategy chain is the right approach, but the "skip if confidence too low" failsafe needs to be calibrated empirically. The initial target of 40 deployments per night assumes a certain skip rate. If more than 25% of targets have unscrappable logos, the volume target requires adjustment or a more sophisticated extraction approach.

**ElevenLabs API behavior.** The single-agent-with-overrides architecture depends on ElevenLabs honouring `override_config.tts.prompt.override_allowed: true` and related fields being settable via API rather than only via dashboard. This needs to be validated against the live API. If override enabling requires a manual dashboard step per agent, it limits automation.

### Quality Ceiling (if fully implemented): 9.2 / 10

With logo extraction via Playwright Vision, voice agents trained on real tenant data, and visual QA that uses Claude Vision to assess fidelity against a rubric — the failure modes that currently require manual review are addressable. The remaining 0.8 gap accounts for: edge cases in very unusual website structures (some contractor sites are legitimately unscrappable), the inherent limitation that Claude Vision's spatial reasoning is approximate (good for detection, not pixel-perfect extraction), and the possibility that some Ontario contractor websites have genuinely insufficient content for a compelling demo (these should be skipped by the ICP score gate).

### Current State Without This Implementation: 5.5 / 10

The pipeline is functional but fragile in the specific areas that matter most to sales conversion — logo fidelity and voice agent personality — and it requires 15-30 minutes of manual review per deployment. That manual review bottleneck means the 40-target vision is not achievable regardless of how fast the underlying scripts run.

### The Quality Benchmark to Hit

Each deployed tenant site should be able to withstand a prospect opening it, seeing their own logo and brand colours, clicking the voice button (Dominate) and having Emma introduce herself as their company's AI, and exploring the visualizer and estimate flow — all without requiring Ferdie to have touched or reviewed that specific deployment. That is the bar. That is what "100% operational" means.

---

## Reference Architecture Documents

The implementation agent should read all of the following before beginning:

1. **This document** — product context, business rationale, what to build and why
2. **BESPOKE_PRODUCTION_WORKFLOW.md** — detailed current pipeline state, all existing scripts, gap analysis, and enhancement recommendations
3. **PRODUCT_REFERENCE.md** — the product itself, Emma's architecture, database schema, API routes, feature flags
4. **Claude Code Production Pipeline Research Report** — the HOW: exact Skills/sub-agent frontmatter schemas, known bugs and workarounds, ElevenLabs API endpoints and override patterns, Playwright Vision integration, parallel execution patterns, hooks configuration

When in doubt about a design decision, default to: (a) real data over AI-generated content, (b) skip over hallucinate, (c) stable sub-agents over experimental Agent Teams, (d) isolation per worker over shared state, and (e) flag for review over silent failure.
