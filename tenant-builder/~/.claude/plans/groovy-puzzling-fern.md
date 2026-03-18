# Plan: V3 Cold Outreach Email Template + Gmail Draft Bulk Update

## Context

Ferdie wants a new cold outreach email template (v3) that:
- Opens with a **credibility compliment** ("strong reputation, {company_name} stood out") instead of jumping straight to the rebuild
- Adds **48-hour urgency** ("it'll be up for 48 hours")
- Has a **clearer CTA** ("reply to this email or shoot me a text")
- Offers a **custom version** ("within a couple of days")

This requires (1) updating the pipeline code so future runs use v3, and (2) updating all 31 existing cold outreach Gmail drafts in-place.

## Scope

- **38 total Gmail drafts** (confirmed via full pagination — no more pages)
- **7 warm leads — SKIP:** CCR Renovations, Red White Reno, Gracia Makeovers, DALM Construction, Senso Design, Dundas Home Renos, Gilbert+Burke
  - Identified by: subject contains "AI-Enhanced Website Demo" or "[NEEDS EMAIL]", or To: ferdie@norbotsystems.com
- **31 cold outreach — UPDATE ALL:** all use v2 template ("I rebuilt X's website... actually works for you while you're out on a job")

## New Template (v3)

```
Hi {firstName},

I'm Ferdie out of Stratford. I've been looking at renovation contractors in {city} with a strong reputation, and {company_name} stood out.

I rebuilt your website from the ground up — same brand, same projects, same reviews — but brought up to a premium standard with a brain behind it.

Homeowners can take or upload a photo of their space and see what the renovation would look like. Visitors don't slip through the cracks. Leads, quotes, and invoices — all managed in one place.

There's a demo I've built for you live right now — it'll be up for 48 hours. Poke around and try it yourself — upload a photo and see what happens:
{demoUrl}

After you've had a look, just reply to this email or shoot me a text. I can have a fully custom version built for {company_name} within a couple of days.

Cheers,
Ferdie
```

Variables: `{firstName}`, `{city}`, `{company_name}` (2x — regex `/g`), `{demoUrl}`
Signature + CASL footer: unchanged (appended after body as before)

### Key differences from v2
| v2 | v3 |
|----|-----|
| `{locationClause}` conditional (omit for FAR_CITIES) | Always "out of Stratford" (hardcoded) |
| "I rebuilt {company_name}'s website" opens directly | "I've been looking at contractors in {city}... {company_name} stood out" |
| "ballpark estimate on the spot" | Removed |
| "every inquiry captured and followed up on" | "Visitors don't slip through the cracks" |
| "It's live right now under your name" | "There's a demo I've built for you live right now — it'll be up for 48 hours" |
| "If this is something you'd want... just reply" | "reply to this email or shoot me a text... custom version within a couple of days" |
| Sign-off: "Ferdie" | "Cheers,\nFerdie" |
| `{company_name}` used 1x | `{company_name}` used 2x (opening + CTA) |
| `{city}` only in subject | `{city}` in subject + body paragraph 1 |

---

## Implementation Steps

### Step 1: Update `generate-email.mjs` (permanent pipeline fix)

**File:** `~/norbot-ops/products/demo/scripts/outreach/generate-email.mjs`

1. **Lines 13-16:** Update version comment to `v3` with note: "Reputation-first opener, 48h urgency, reply/text CTA"
2. **Lines 43-54:** Replace `BODY_TEMPLATE` with v3 text above
3. **Lines 216-220:** Update `.replace()` chain:
   - Remove `.replace('{locationClause}', locationClause)`
   - Use `.replace(/\{company_name\}/g, companyName)` (regex with `/g` for 2 occurrences)
   - Add `.replace('{city}', city)` for the new body usage
4. **Line 197:** Remove `const locationClause = getLocationClause(city);` from `generateEmail()`
5. Keep `getLocationClause()` exported (backward compat), add `@deprecated` JSDoc
6. Subject lines: **no change** (stay as "Estimate Request - {city}" with rotation)

### Step 2: Add Gmail API update functions to `create-draft.mjs`

**File:** `~/norbot-ops/products/demo/scripts/outreach/create-draft.mjs`

Add 3 new exported functions (reuse existing `getAccessToken()`):

- `listGmailDrafts(credentials)` — `GET /users/me/drafts` with pagination
- `getGmailDraft(draftId, credentials)` — `GET /users/me/drafts/{id}?format=metadata` for headers
- `updateGmailDraft(draftId, email, credentials)` — `PUT /users/me/drafts/{id}` with new MIME message (same `buildMimeMessage()` + base64url encoding pattern)

### Step 3: Write `update-cold-drafts.mjs` (one-off script)

**File:** `~/norbot-ops/products/demo/scripts/outreach/update-cold-drafts.mjs` (new)

Script flow:
1. Load env vars (Gmail OAuth2 creds from `pipeline/scripts/.env`, Turso creds)
2. List ALL Gmail drafts via `listGmailDrafts()`
3. For each draft, get metadata via `getGmailDraft(id)` — extract `To` and `Subject` headers
4. **Classify:**
   - Warm lead → subject contains "AI-Enhanced Website Demo" or "[NEEDS EMAIL]" or To is `ferdie@norbotsystems.com` → **SKIP**
   - Cold outreach → subject starts with "Estimate Request" or contains "Custom Estimate Portal" or "Renovation Website Demo" → **UPDATE**
   - Other → **SKIP** (log warning)
5. For cold outreach drafts: match `To` email against Turso `targets` table
6. If Turso match: call `generateEmail(target)` with v3 template → `updateGmailDraft(draftId, email, creds)`
7. If no Turso match: **skip** with warning (don't parse old body — too fragile)
8. 250ms delay between Gmail API calls (rate limiting)
9. Summary: `{updated: N, skipped_warm: N, skipped_no_match: N, failed: N}`

**Flags:** `--dry-run` (classify + match but don't update), `--verbose` (log each draft's classification)

### Step 4: Update tests

**File:** `~/norbot-ops/products/demo/scripts/outreach/tests/test-email-template.mjs`

The test file has assertions from v1 that are already broken against v2. Fix for v3:

| Current assertion | Action |
|---|---|
| `includes('519-555-1234')` (phone in body) | Remove — phone not in template since v2 |
| `includes('keep it private')` | Remove — v1 wording |
| `includes('48 hours')` | **Keep** — v3 has this |
| HARD STOP: no phone → `skipped: true` | Change to: generates email even without phone (`skipped: false`) |
| `includes('at 519-555-1234')` (phone in body) | Replace with: company_name appears in CTA |

**Add v3 assertions:**
- `includes('stood out')` — credibility opener
- `includes('shoot me a text')` — CTA
- `includes('Cheers,')` — sign-off
- `includes('contractors in London')` — city in body
- `{company_name}` appears 2+ times in body
- No `{locationClause}` unfilled variable

### Step 5: Run and verify

```bash
cd ~/norbot-ops/products/demo

# 1. Run tests (verify template logic)
node scripts/outreach/tests/test-email-template.mjs

# 2. Dry-run the draft update (preview which drafts get updated)
node scripts/outreach/update-cold-drafts.mjs --dry-run

# 3. Execute the update
node scripts/outreach/update-cold-drafts.mjs

# 4. Verify via Gmail MCP — list drafts, check snippets show new wording
```

### Step 6: Sync to monorepo + commit

```bash
# Copy changes back to monorepo
cp ~/norbot-ops/products/demo/scripts/outreach/generate-email.mjs \
   ~/Norbot-Systems/products/conversionos/scripts/outreach/generate-email.mjs
# (same for create-draft.mjs, test file, new script)

# Commit in deploy repo
cd ~/norbot-ops/products/demo
git add scripts/outreach/generate-email.mjs scripts/outreach/create-draft.mjs \
       scripts/outreach/update-cold-drafts.mjs scripts/outreach/tests/test-email-template.mjs
git commit -m "feat: v3 cold outreach template + bulk draft update script"
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Warm lead accidentally updated | Triple filter: subject pattern + To address + explicit slug list |
| PUT fails, draft lost | Gmail PUT is atomic — old draft survives on failure |
| Turso target not found | Skip with warning, don't update that draft |
| Template variable unfilled | `validateEmail()` catches any `{var}` in body |
| Rate limiting by Gmail API | 250ms delay between calls |
| Tests still fail | Run tests before committing |

## Verification

1. Run test suite: `node scripts/outreach/tests/test-email-template.mjs` — all pass
2. Dry-run update script: shows 7 skipped (warm), ~31 to update (cold), 0 errors
3. After update: `gmail_list_drafts` via MCP — snippets should show "stood out" and "48 hours"
4. Read 2-3 random updated drafts to verify formatting, CASL footer, variables filled
5. Run `validateEmail()` on a regenerated email to confirm no banned terms

---

**TLDR:** Replace BODY_TEMPLATE in generate-email.mjs from v2 (direct rebuild pitch) to v3 (reputation-first opener, 48h urgency, "reply or text" CTA, company name in 2 places). Write a one-off `update-cold-drafts.mjs` that lists Gmail drafts, skips 7 warm leads by subject pattern, matches 31 cold drafts to Turso targets by email, regenerates bodies with v3, and updates via Gmail API PUT. Fix 6 broken test assertions. Subject lines unchanged.
**Complexity:** MEDIUM — 2 files modified, 1 new script, 1 test file updated. Gmail PUT is standard. Warm-lead filtering is reliable (distinct subject patterns). Dry-run before live execution.
