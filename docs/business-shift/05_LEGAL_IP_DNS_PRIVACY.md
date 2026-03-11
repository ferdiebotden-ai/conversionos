# 05. Legal, IP, DNS, and Privacy

**Prepared:** March 2026  
**Important:** This document is general business guidance only. It is **not legal advice**. NorBot should use counsel before finalizing contract language or making customer-facing legal representations.

## Why This Matters

The site-preservation version of Dominate only works safely if NorBot separates four different things that many non-technical buyers blur together:

- domain ownership
- website code ownership
- content and asset rights
- hosting / DNS control

Agents must understand those differences before they speak confidently about "taking over a website."

## 1. Code, Content, and Domain Are Different Assets

### Facts

- In Canada, copyright ownership and assignment are governed by the Copyright Act.
- Section 13(4) states that assignment or grant of rights is not valid unless it is in writing and signed by the owner or authorized agent.
- Official Canadian IP guidance indicates that software, website text/pages, and visual assets may each attract their own intellectual-property protections.

### Practical implication

A contractor paying for a website does **not** automatically mean they own:

- the source code
- the theme/framework
- licensed stock images
- plugin licenses
- all written copy
- all visual assets

They may own some of those items, license some of them, and have no transferable rights to others.

## 2. What NorBot Should Assume by Default

Assume the following until proven otherwise:

- the contractor likely owns or can authorize use of their business name, logo, and contact details
- the contractor may or may not own the underlying website code
- the contractor may or may not have transferable rights to all images and design assets
- the contractor may or may not personally control the registrar or DNS

That is why the default NorBot delivery model should be a **clean rebuild** rather than a promise to reuse or extract code.

## 3. Safe Legal/Commercial Position

NorBot should position the service as:

- high-fidelity migration
- clean rebuild onto ConversionOS
- use of client-approved and client-authorized assets/content

NorBot should **not** position the service as:

- code copying
- source-code cloning
- direct takeover of a developer's work product without rights confirmation

## 4. Domain Ownership vs Registrar vs DNS vs Hosting

### Domain ownership / registrant

- The registrant is the party with the formal rights/control relationship over the domain registration.
- In practice, this is sometimes the client, but sometimes the prior agency or developer registered the domain on the client's behalf.

### Registrar

- The registrar is the company through which the domain is registered.
- Moving registrars is a transfer process, not the same as changing hosting.

### DNS / nameservers

- DNS controls where the domain points.
- A site can be cut over by changing DNS records or nameservers without changing registrars.

### Hosting / deployment

- Hosting is where the website or app actually runs.
- In this model, the migrated site would run on ConversionOS / Vercel, while the client may keep their existing registrar and even their existing DNS provider.

## 5. Practical Cutover Model

### Standard path

1. Confirm registrant and DNS authority
2. Add client domain to the Vercel project
3. Verify domain ownership
4. Update DNS records at the client's provider
5. Wait for SSL issuance and propagation
6. Cut traffic to the new site

### Important note

NorBot usually does **not** need to take registrar ownership to launch the new site.

### When a problem exists

There is a commercial/legal problem if:

- the old developer controls the registrar and will not cooperate
- the client does not know who controls DNS
- the client cannot prove they are authorized to approve the move

That should slow the deal down immediately.

## 6. Common Rights Scenarios

### Scenario A: Client owns brand/content, but not code

This is often workable. NorBot can:

- rebuild the site feel
- use approved copy and assets
- avoid reusing proprietary source code

### Scenario B: Client has unclear rights to images

NorBot should:

- request written confirmation
- replace disputed assets
- or use newly licensed / newly created assets

### Scenario C: Prior developer built the site on a licensed theme or page builder

NorBot should assume:

- theme/plugin rights may not transfer
- code reuse may be inappropriate or impossible
- clean rebuild is safer

### Scenario D: Domain is under a third party's account

This is a red flag until:

- registrant control is clarified
- transfer authority or DNS authority is confirmed

## 7. Do Not Say This

Agents must avoid these statements:

- "We can just copy your current website."
- "You automatically own all of your site code."
- "We need to transfer your domain to us."
- "Your current developer has no rights once you paid them."
- "There is no legal issue as long as the client wants it."
- "We can preserve everything exactly, no matter what is under the hood."

## 8. Better Language to Use

- "We rebuild the feel and structure of your current site on our platform."
- "We usually keep your current domain."
- "We confirm content and asset rights before migration."
- "We normally do a clean rebuild rather than depend on the old codebase."
- "Registrar transfer is optional; DNS cutover is usually enough."

## 9. Privacy and Consent

### Facts

- PIPEDA applies to private-sector commercial handling of personal information in Canada.
- OPC guidance emphasizes meaningful consent and making key elements clear up front.
- CASL requires consent before commercial electronic messages, plus sender identification and unsubscribe requirements.

### Practical implication for ConversionOS

The migrated site may collect:

- names
- email addresses
- phone numbers
- room photos
- project notes
- chat transcripts
- quote/estimate context

NorBot should assume that clear front-end disclosure is required for:

- what data is collected
- why it is collected
- which vendors/processors are involved
- when AI is used to generate or analyse output
- how the contractor will use that information

### Working best-practice stance

For photo upload, AI analysis, and homeowner lead submission, NorBot should prefer:

- clear, front-of-flow disclosure
- affirmative action by the user
- privacy language that is understandable without reading a full legal policy first

## 10. CASL Practical Guardrails

If the migrated experience triggers follow-up email or text outreach:

- do not send without a valid consent basis
- keep records of consent where possible
- ensure sender identification is clear
- provide unsubscribe where required

This matters both for NorBot and for contractor-driven follow-up flows.

## 11. Pre-Migration Legal Checklist

Before a Dominate site-preservation deal is treated as ready:

- confirm the client's legal business name
- confirm the registrant / registrar / DNS contact
- confirm who can approve DNS changes
- get written confirmation of rights to logo, copy, photos, testimonials, and downloadable assets
- identify any stock-photo or licensed third-party asset risk
- identify whether the prior developer owns any non-transferable code/themes/plugins
- confirm privacy policy and consent language need updates for AI/photo/chat handling
- confirm any CASL-sensitive outbound automation plans
- confirm whether cookies / analytics disclosures need refreshing

## 12. When to Escalate to Counsel

Escalate when:

- rights to assets are disputed
- domain control is unclear
- the client insists NorBot must reuse proprietary code
- the client wants warranties about IP ownership that NorBot cannot safely give
- data-sharing practices change materially
- homeowner data use becomes more aggressive than current lead capture norms

## Bottom Line

The safe commercial/legal posture is:

- rebuild, do not promise raw code copying
- keep the client's domain where possible
- require written rights confirmation
- separate domain control from code ownership in every conversation
- treat privacy and consent as product requirements, not post-launch paperwork
