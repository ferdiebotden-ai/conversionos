# Codex Tenant Polish Automation Prompt

Process every JSON file in `codex-polish/queue/pending/`.

For each queue item:

1. Read the queue file first.
2. If `queue_type` is `manual_review`, do not attempt automated polish. Leave the item in place and summarize why it still needs human review.
3. Resolve the tenant from `site_id`, `live_url`, and `original_url`.
4. Read the referenced QA artifacts (`go-live-readiness.json`, `audit-report.md`, `visual-qa.json`, `scraped.json`) if they exist.
5. Run `node scripts/polish/dump-tenant.mjs --site-id <site_id>` if `codex-polish/current-tenant.json` is missing or stale.
6. Compare the current tenant against the original brand:
   - logo fidelity
   - colour palette
   - hero image quality
   - copy tone and uniqueness
   - testimonials, services, and portfolio accuracy
7. If changes are needed:
   - write `codex-polish/patches/<site_id>.json`
   - keep changes limited to `business_info`, `branding`, and `company_profile`
   - do not edit shared app code unless the queue item explicitly allows it
8. If no changes are needed:
   - run `node scripts/polish/complete-polish.mjs --site-id <site_id> --note "No changes needed"`

Important:

- Never edit `tenant-builder/` scripts.
- Never edit `src/proxy.ts`.
- Never apply Supabase changes directly unless explicitly instructed.
- Keep work tenant-scoped and data-only by default.
