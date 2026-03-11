# 06. Delivery Playbook

**Prepared:** March 2026

## Purpose

This is the end-to-end operating workflow for a Dominate deal using the site-preservation model. It defines how NorBot should qualify, scope, deliver, and cut over a contractor website onto ConversionOS without pretending the custom-shell architecture already exists.

## Delivery Principle

Move from:

- "Can we build this?"

to:

- "Should this be standard Dominate, Dominate plus scoped addendum, or Black Label?"

The biggest delivery mistake would be treating every attractive website as a standard-scope Dominate job.

## Stage 1 - Sales Qualification

### Goal

Determine whether the contractor is a credible fit for Dominate site preservation.

### Required questions

- Do you want to keep the feel of your current website?
- Do you control the domain or know who does?
- Who built the current site?
- Do you have access to your images, logo, and written content?
- What parts of the current site matter most to preserve?
- What is missing from the current site operationally?

### Output

- preliminary fit rating
- initial list of must-preserve pages/interactions
- initial domain/IP readiness view

### Stop conditions

- no domain/DNS path
- no commercial fit for Dominate
- no meaningful attachment to current site

## Stage 2 - Rights and Domain Audit

### Goal

Confirm whether the client can actually authorize the migration.

### Required checks

- registrant / registrar / DNS authority
- written rights confirmation for logo, copy, photos, testimonials
- list of third-party embeds, tools, plugins, forms, booking systems
- whether the old agency or developer still controls critical assets

### Output

- rights and domain readiness checklist
- red/yellow/green delivery risk status

### Stop conditions

- rights are disputed or unconfirmable
- domain authority is unclear and no remediation path exists

## Stage 3 - Public-Site Audit

### Goal

Document what is actually being preserved.

### Audit dimensions

- page inventory
- information architecture
- navigation depth
- hero structure
- forms and lead flows
- FAQ/blog/resources footprint
- project/gallery footprint
- interaction patterns
- mobile behaviour
- performance issues and content weaknesses

### Practical tooling

- live browser inspection
- current NorBot scrape / tenant-builder outputs where useful
- screenshot and parity notes

### Output

- public-site audit doc
- must-match / nice-to-match / do-not-carry-forward list

## Stage 4 - Scope Classification

### Goal

Classify the deal before anyone starts treating it like standard delivery.

### Classification options

#### Standard Dominate

- inside the migration envelope
- site structure is recognizable and bounded
- content volume is manageable
- interactions are normal marketing-site interactions

#### Dominate + scoped addendum

- mostly inside Dominate but with clear complexity overages
- examples: oversized blog footprint, extra templates, heavier motion, special integrations

#### Black Label

- too bespoke or operationally broad
- examples: multilingual, franchise complexity, complex app flows, ERP-level integration, major workflow consulting

### Output

- signed scope decision
- activation and addendum expectation if applicable

## Stage 5 - Migration Plan

### Goal

Translate the audit into a bounded build plan.

### Plan contents

- page/template map
- content migration plan
- asset approval list
- preserve / improve decisions
- CTA and conversion upgrades
- domain cutover plan
- redirect plan for retired or archived URLs

### Important rule

This plan should always distinguish:

- what is preserved for familiarity
- what is improved for conversion

## Stage 6 - Build and Integration

### Goal

Rebuild the public site on ConversionOS while keeping the shared platform core intact.

### Working principle

- public experience may be custom
- platform core remains shared
- AI/admin flows remain native ConversionOS features

### During build

- reuse existing platform features wherever possible
- avoid one-off logic in the core unless it benefits the platform broadly
- treat site-specific customizations as shell-level behaviour, not tenant forks

### Output

- staging-ready tenant experience
- working domain plan
- testable parity artefacts

## Stage 7 - QA and Readiness Review

### Goal

Make sure the site is safe to launch commercially and operationally.

### QA categories

- desktop/mobile layout parity
- navigation parity
- CTA and form behaviour
- visualizer/chat integration
- admin and lead routing
- privacy/cookie/consent language placement
- domain and SSL readiness
- redirects and metadata

### Readiness questions

- does it feel like the contractor's current site?
- is the conversion experience stronger than before?
- is anything legally risky or operationally unclear?
- is the client domain ready for cutover?

### Stop conditions

- unresolved rights issues
- unresolved cutover control
- major parity misses on critical pages
- broken lead routing or platform integration

## Stage 8 - Cutover

### Goal

Move traffic from the old site to the ConversionOS-hosted site with minimal disruption.

### Typical steps

1. Add client domain to Vercel project
2. Verify domain
3. Update DNS records
4. Confirm SSL issuance
5. Smoke-test key public routes and lead flows
6. Monitor post-launch behaviour

### Operating note

Registrar transfer is not the default requirement. DNS cutover is usually enough.

## Stage 9 - Post-Launch Support

### Goal

Stabilize the launch and turn the site into an ongoing conversion asset.

### First 30 days

- monitor leads and form completion
- monitor mobile friction
- review homeowner use of visualizer/chat
- gather contractor feedback on brand fidelity
- identify obvious CRO improvements

### Strategic value

This is where Dominate should start proving:

- faster response
- better lead context
- better homeowner engagement
- better close quality

## Internal Artefacts to Create Per Deal

- qualification summary
- rights/domain audit
- public-site audit
- scope classification memo
- migration plan
- launch readiness checklist
- cutover record
- 30-day review notes

## Core Delivery Rule

If the client asks for "their current site but better," the team should answer:

- yes, within a bounded envelope
- yes, on the shared platform core
- yes, with rights/domain confirmation first

If the request becomes "build whatever we imagine with no boundary," the answer should move toward:

- scoped addendum
- or Black Label
