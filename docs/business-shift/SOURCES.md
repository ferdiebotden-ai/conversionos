# Sources

**Prepared:** March 2026  
**Last reviewed:** March 5, 2026

This source list is split between local repo truth and external sources reviewed for current-state market, legal, and technical context.

## Local Sources

- [PRODUCT_REFERENCE.md](/Users/norbot/norbot-ops/products/demo/docs/PRODUCT_REFERENCE.md)  
  Why it matters: current internal product overview, tenant model, feature set, and platform terminology.

- [ONBOARDING_HANDOFF.md](/Users/norbot/norbot-ops/products/demo/docs/ONBOARDING_HANDOFF.md)  
  Why it matters: current onboarding/deployment flow, tenant-builder automation, and Vercel/DNS operating pattern.

- [COMPANY_AGENT_BRIEF.md](/Users/norbot/norbot-ops/products/demo/docs/COMPANY_AGENT_BRIEF.md)  
  Why it matters: internal company narrative, ICP, tier framing, and agent-facing explanations.

- [src/proxy.ts](/Users/norbot/norbot-ops/products/demo/src/proxy.ts)  
  Why it matters: source of truth for hostname-to-tenant routing and shared-project domain handling.

- [site.ts](/Users/norbot/norbot-ops/products/demo/src/lib/db/site.ts)  
  Why it matters: runtime tenant-resolution logic and current shared-core isolation pattern.

- [20260210000000_add_site_id_multi_tenancy.sql](/Users/norbot/norbot-ops/products/demo/supabase/migrations/20260210000000_add_site_id_multi_tenancy.sql)  
  Why it matters: confirms platform-wide `site_id` model for tenant isolation.

- [20260222100000_site_id_rls_policies.sql](/Users/norbot/norbot-ops/products/demo/supabase/migrations/20260222100000_site_id_rls_policies.sql)  
  Why it matters: documents current RLS posture and tenant-isolation intent.

- [NORBOT_BUSINESS_CONTEXT_FOR_GPT.md](/Users/norbot/norbot-ops/products/website/NORBOT_BUSINESS_CONTEXT_FOR_GPT.md)  
  Why it matters: current market-facing pricing baseline, tier framing, Black Label direction, and commercial consistency notes.

## External Sources

- [Deploying Git Repositories with Vercel](https://vercel.com/docs/git)  
  Why it matters: confirms Vercel Git-driven production and preview deployment model.

- [Setting up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain)  
  Why it matters: confirms custom-domain setup, DNS record handling, and SSL issuance flow.

- [Configuring Custom Domains](https://vercel.com/platforms/docs/multi-tenant-platforms/configuring-domains)  
  Why it matters: explicitly relevant to bring-your-own-domain flows for multi-tenant platforms.

- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)  
  Why it matters: current vendor guidance on RLS as a browser-safe, defence-in-depth control.

- [Copyright Act - Section 13](https://laws-lois.justice.gc.ca/eng/acts/C-42/section-13.html)  
  Why it matters: Canadian copyright ownership and assignment baseline, including writing/signature requirement for assignments.

- [Intellectual property rights in software in Canada](https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en/intellectual-property-rights-software-canada)  
  Why it matters: official Canadian guidance that software, websites, and related assets may have separate IP implications.

- [General Questions - ICANN](https://www.icann.org/resources/pages/faqs-84-2012-02-25-en)  
  Why it matters: domain registrant and control concepts for global domain operations.

- [Support - CIRA](https://www.cira.ca/en/support/)  
  Why it matters: Canadian `.ca` domain support context for DNS, registrar, and operational questions.

- [How to transfer domains - CIRA](https://www.cira.ca/en/how-to-transfer-domains/)  
  Why it matters: transfer mechanics for `.ca` domains and distinction between transfer and normal DNS changes.

- [PIPEDA requirements in brief - Office of the Privacy Commissioner of Canada](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief?wbdisable=true)  
  Why it matters: baseline Canadian private-sector privacy obligations relevant to homeowner lead data, photos, and chat transcripts.

- [Guidelines for obtaining meaningful consent - Office of the Privacy Commissioner of Canada](https://www.priv.gc.ca/en/privacy-topics/collecting-personal-information/consent/gl_omc_201805/)  
  Why it matters: current consent expectations for product flows that collect personal data and use AI-backed processing.

- [Getting consent to send email - Canada Anti-Spam Legislation](https://ised-isde.canada.ca/site/canada-anti-spam-legislation/en/getting-consent-send-email)  
  Why it matters: CASL baseline for outreach and follow-up communications.

- [What's New in Jobber](https://www.getjobber.com/academy/product-updates/)  
  Why it matters: current evidence that a major incumbent in home services is actively shipping AI-related product updates.

- [AI Receptionist - Jobber](https://www.getjobber.com/features/ai-receptionist/)  
  Why it matters: current evidence that Jobber is pushing AI receptionist and call/text automation into the home-service market.

- [AI Assistants for Service Businesses to Automate, Scale & Grow - Housecall Pro AI Team](https://www.housecallpro.com/features/ai-team/)  
  Why it matters: current evidence that Housecall Pro is packaging multiple AI assistants into its core home-service offering.

- [ServiceTitan Introducing the Next Evolution of AI at Pantheon 2025 Keynote Sessions](https://www.servicetitan.com/press/servicetitan-introducing-the-next-evolution-of-ai-at-pantheon-2025-keynote)  
  Why it matters: current evidence that enterprise-grade trade software is framing AI as a major strategic surface.

- [Renoworks - Home Design Visualization Software Helps Close More Deals](https://www.renoworks.com/)  
  Why it matters: current evidence that visualization remains a live sales/conversion category in home improvement.

- [Hover | One Connected Platform for Construction and Renovation Projects](https://hover.to/)  
  Why it matters: current evidence that measurement, design, and estimating are converging in home-improvement software.
