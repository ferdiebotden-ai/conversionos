#!/usr/bin/env bash
# optimize_prospect.sh — Generate optimized email sequence for a prospect
#
# Usage:
#   bash scripts/optimize_prospect.sh outbox/2026-02-12/company-slug
#
# Reads target.json + microsite + offer/offer.md, writes to email/ subfolder.
# Uses claude -p with structured output for consistent quality.

set -euo pipefail

PROSPECT_DIR="${1:?Usage: bash scripts/optimize_prospect.sh outbox/YYYY-MM-DD/slug}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL_DIR="${PROSPECT_DIR}/email"

# Validate inputs exist
if [ ! -f "${PROSPECT_DIR}/target.json" ]; then
  echo "ERROR: ${PROSPECT_DIR}/target.json not found"
  exit 1
fi

if [ ! -f "${REPO_ROOT}/offer/offer.md" ]; then
  echo "ERROR: offer/offer.md not found"
  exit 1
fi

mkdir -p "${EMAIL_DIR}"

TARGET_JSON=$(cat "${PROSPECT_DIR}/target.json")
OFFER_MD=$(cat "${REPO_ROOT}/offer/offer.md")

# Derive microsite URL from target slug
COMPANY_SLUG=$(python3 -c "import json,sys; print(json.load(open('${PROSPECT_DIR}/target.json'))['slug'])")
MICROSITE_URL="www.norbotsystems.com/${COMPANY_SLUG}"

# Read microsite if it exists (for personalization context)
MICROSITE_CONTEXT=""
if [ -f "${PROSPECT_DIR}/microsite/index.html" ]; then
  # Extract text content only (first 1000 chars for context)
  MICROSITE_CONTEXT=$(sed 's/<[^>]*>//g' "${PROSPECT_DIR}/microsite/index.html" | head -c 1000)
fi

echo "Generating optimized email sequence for: ${PROSPECT_DIR}"
echo "Output: ${EMAIL_DIR}/"

# Generate email sequence using Claude
claude -p "You are generating an optimized 3-email cold outreach sequence.

## INPUTS

TARGET DATA:
${TARGET_JSON}

OFFER BRIEF:
${OFFER_MD}

MICROSITE URL (use this exact URL as the CTA link in every email):
${MICROSITE_URL}

MICROSITE CONTEXT (if available):
${MICROSITE_CONTEXT}

## OUTPUT FORMAT

Output a JSON object with this exact structure:
{
  \"subjects\": {
    \"email_1\": [\"subject1\", \"subject2\", \"subject3\", \"subject4\", \"subject5\"],
    \"email_2\": [\"subject1\", \"subject2\", \"subject3\"],
    \"email_3\": [\"subject1\", \"subject2\", \"subject3\"]
  },
  \"email_1\": {
    \"body\": \"full email body with signature and CASL footer\"
  },
  \"email_2\": {
    \"body\": \"full email body with signature and CASL footer\"
  },
  \"email_3\": {
    \"body\": \"full email body with signature and CASL footer\"
  },
  \"ready_to_send\": {
    \"email_1\": \"recommended subject + full body\",
    \"email_2\": \"recommended subject + full body\",
    \"email_3\": \"recommended subject + full body\"
  }
}

## COPY RULES (MANDATORY)
- Email 1 body: <=120 words (excluding signature/footer)
- Email 2 body: <=100 words
- Email 3 body: <=100 words
- ONE CTA per email: plain URL (www.norbotsystems.com/slug) on its own line, introduced with a context sentence
- Lead with THEIR pain, not our features
- No pricing in emails 1-2. Email 3 hints at 'founding pricing' only.
- Subject lines: <=50 chars, casual, personalized
- Canadian spelling. Plain text. Human tone.
- No unverifiable claims.

## CASL FOOTER (every email)
---
Ferdie Botden | NorBot Systems Inc. | 140 Dempsey Dr, Stratford, ON N5A 0K5
If you'd prefer not to hear from me, just reply STOP and I'll remove you immediately.

Output ONLY the JSON object, no markdown fences." --output-format json | python3 -c "
import json, sys

data = json.load(sys.stdin)
prospect_dir = '${PROSPECT_DIR}'
email_dir = '${EMAIL_DIR}'

# Write subjects.txt
with open(f'{email_dir}/subjects.txt', 'w') as f:
    f.write('# Subject Line Options\n\n')
    f.write('## Email 1: Initial Outreach\n')
    for s in data['subjects']['email_1']:
        f.write(f'- {s}\n')
    f.write('\n## Email 2: Follow-Up (Day 3)\n')
    for s in data['subjects']['email_2']:
        f.write(f'- {s}\n')
    f.write('\n## Email 3: Breakup (Day 7)\n')
    for s in data['subjects']['email_3']:
        f.write(f'- {s}\n')

# Write individual emails
for i, key in enumerate(['email_1', 'email_2', 'email_3'], 1):
    names = ['01_initial.md', '02_followup.md', '03_breakup.md']
    with open(f'{email_dir}/{names[i-1]}', 'w') as f:
        f.write(data[key]['body'])

# Write READY_TO_SEND.md
with open(f'{email_dir}/READY_TO_SEND.md', 'w') as f:
    f.write('# Ready to Send — Copy-Paste Emails\n\n')
    f.write('> Review each email before sending. Address and microsite URL are pre-filled.\n\n')
    labels = ['Email 1: Initial Outreach (Day 0)', 'Email 2: Follow-Up (Day 3)', 'Email 3: Breakup (Day 7)']
    for i, key in enumerate(['email_1', 'email_2', 'email_3']):
        f.write(f'---\n\n## {labels[i]}\n\n')
        f.write(data['ready_to_send'][key])
        f.write('\n\n')

print(f'Done. Files written to {email_dir}/')
"

echo ""
echo "Generated files:"
ls -la "${EMAIL_DIR}/"
