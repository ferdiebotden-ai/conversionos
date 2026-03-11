# Dominate Site Preservation - Business Shift Dossier

**Prepared:** March 2026  
**Status:** Strategic documentation only. This package does not authorize implementation work by itself.  
**Primary audience:** Internal AI agents  
**Secondary audience:** Ferdie Botden / founder review

## Thesis

ConversionOS should explore a premium Dominate motion built around **high-fidelity migration of a contractor's current website feel onto the shared ConversionOS platform**. The offer is not "we replace your site with our template" and it is not "we copy your code." The offer is: **we keep the feel of the site you like, keep your domain, and upgrade the brain behind it with AI visualizer, chat, quoting, admin, and conversion tooling.**

## Reading Order

1. `07_AGENT_BRIEF.md` - fastest operational overview for internal agents
2. `01_SHIFT_THESIS.md` - why this direction exists
3. `03_DOMINATE_OFFER.md` - what Dominate now means in this model
4. `04_TECHNICAL_OPERATING_MODEL.md` - how this works with the current stack
5. `05_LEGAL_IP_DNS_PRIVACY.md` - what can and cannot be promised
6. `06_DELIVERY_PLAYBOOK.md` - how a deal would move from sales to go-live
7. `02_MARKET_OPPORTUNITY.md` - market rationale and fit criteria
8. `08_FOUNDER_NOTES.md` - direct business-partner recommendations
9. `SOURCES.md` - local and external references

## Definitions

- **Shared core:** The existing ConversionOS platform layer that remains common across tenants: Next.js app, AI routes, Supabase-backed data model, entitlements, visualizer, receptionist/chat, quoting, admin, invoicing, analytics, and tenant resolution.
- **Custom shell:** A tenant-specific public-site presentation layer on top of the shared core. This includes public information architecture, navigation, page templates, visual system, animations, and section order.
- **High-fidelity migration:** Rebuilding the feel, flow, and important interactions of a contractor's current website onto ConversionOS without promising one-to-one source-code reuse.
- **Clean rebuild:** Recreating a website's user-facing experience using approved assets, content, and design references, rather than relying on ownership of the original codebase.
- **Dominate scope:** The premium contractor offer that includes high-touch onboarding, city exclusivity, full ConversionOS platform access, and now this site-preservation motion by default within a defined migration envelope.
- **Black Label:** A separate, more bespoke implementation track for broader business automation or unusually complex delivery that exceeds the normal Dominate envelope.

## Fact vs Inference

- **Fact** means grounded in the current repo, current NorBot business docs, or current external sources reviewed in March 2026.
- **Inference** means a recommendation, interpretation, or likely strategic implication drawn from those facts.

## Current Pricing Baseline Used in This Package

This dossier uses the **current market-facing pricing stack** reflected in the NorBot business context and website-side pricing materials:

- Elevate: **$299/mo** + **$1,500 activation**
- Accelerate: **$699/mo** + **$4,500 activation**
- Dominate: **$2,500/mo** + **$20,000 activation**
- Black Label: **$5,000/mo** + **$40,000 activation**

Note: some older docs in `products/demo` still show Elevate at `$249/mo`. This package treats that as a legacy internal inconsistency, not the current commercial baseline.

## What This Package Is For

- Give AI agents a safe, consistent way to explain the new Dominate direction
- Help Ferdie pressure-test whether this is a product advantage or an agency trap
- Tie together market reasoning, legal guardrails, and the real operating model in `products/demo`
- Create a reusable internal reference before any shell architecture is implemented

## What This Package Is Not

- Not a technical PRD
- Not a legal opinion
- Not approval to fork the platform per client
- Not approval to market "website copying" as a service
