# Bespoke Build Skill

Build a complete bespoke demo for a target contractor from their website URL.

## Usage
```
/bespoke-build <target-website-url>
```

## Prerequisites
- `.env.local` with: GOOGLE_GENERATIVE_AI_API_KEY, ELEVENLABS_API_KEY, base agent IDs
- Node.js 18+, npm
- Git configured with push access to origin

## Pipeline (6 Stages)

### Stage 1: Research + Scrape
1. Check `~/.config/last30days/memory/` for relevant AI capability updates
2. Use Playwright MCP (`browser_navigate` + `browser_snapshot`) or WebFetch to scrape:
   - Homepage, About, Services, Contact, Testimonials/Reviews, Gallery
3. Extract structured data into `bespoke-targets/[slug].json` (see brand-schema.json)
4. Analyze visual aesthetic: color palette, typography feel, imagery style
5. Capture EXACT testimonial quotes, staff names, certification details
6. If data is incomplete, note gaps in JSON for manual review before proceeding

**Output:** `bespoke-targets/[slug].json` populated

### Stage 2: Branch + Customize
1. `git checkout main && git pull && git checkout -b bespoke/[slug]`
2. Read `.claude/memory/build-patterns.md` for learned patterns
3. **Phase 1 — Bulk sed:** Replace universal tokens across all `src/**/*.{ts,tsx}`:
   - Company name, phone, email, domain, location, principal names, brand hex
4. **Phase 2 — Content files:** Manual edits for:
   - `company.ts`, `services.ts` — full company knowledge base
   - `testimonials.tsx` — exact quotes only
   - `page.tsx` — hero copy, process steps, "Why Choose Us" cards
   - `about/page.tsx` — team bios, certifications, service areas
   - `contact/page.tsx` — address, phone, email, hours, booking URL
   - `footer.tsx`, `header.tsx`, `layout.tsx` — branding, metadata
5. **Phase 3 — Colors:** Convert brand color hex → OKLCH, update `globals.css`
6. **Phase 4 — AI Knowledge:** Update `company.ts` and `services.ts` with complete data
7. **Phase 5 — AI Personas:** Update all 3 persona files + prompt assembler + prompts.ts
8. **Verify:** `grep -r "ConversionOS Demo" src/` must return zero results

### Stage 3: Generate Images
1. Use `scripts/generate-image.mjs` with Gemini `gemini-3.1-flash-image-preview` (Nano Banana 2)
2. Generate at minimum:
   - Hero image reflecting target's primary service type
   - "Why Choose Us" / craftsmanship detail image
   - Service-specific images as needed
3. Prompts must reflect target's actual services and local aesthetic
4. Every image: photorealistic, professional photography quality
5. Save to `public/images/demo/`

**Example:**
```bash
node scripts/generate-image.mjs --prompt "A stunning kitchen renovation..." --output public/images/demo/hero-kitchen.png
```

### Stage 4: Create ElevenLabs Voice Agents
1. Duplicate 3 base agents:
   ```bash
   curl -X POST "https://api.elevenlabs.io/v1/convai/agents/${BASE_ID}/duplicate" \
     -H "xi-api-key: ${ELEVENLABS_API_KEY}"
   ```
2. PATCH each with target-specific system prompt, first message, knowledge base:
   ```bash
   curl -X PATCH "https://api.elevenlabs.io/v1/convai/agents/${NEW_ID}" \
     -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
     -H "Content-Type: application/json" \
     -d '{"conversation_config": {"agent": {"prompt": {"prompt": "..."}, "first_message": "..."}}}'
   ```
3. Update `.env.local` with new agent IDs
4. Verify each: `GET /v1/convai/agents/${NEW_ID}` returns 200

### Stage 5: Build + Verify
1. `npm run build` — must pass with zero errors
2. Run quality checklist from `.claude/memory/quality-checklist.md`
3. `grep -r "ConversionOS Demo" src/` — zero results
4. `grep -r "RW" src/components/admin/` — zero results
5. Visual spot-check key pages if browser MCP available

### Stage 6: Deploy
1. Push branch: `git push -u origin bespoke/[slug]`
2. Create Vercel project or use preview deployment
3. Set env vars via Vercel API:
   ```bash
   curl -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
     -H "Authorization: Bearer ${VERCEL_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"key": "VAR_NAME", "value": "...", "type": "encrypted", "target": ["production"]}'
   ```
4. Return live URL
5. Update `.claude/memory/` with new learnings

## Learning Loop
After every build, write learnings:
1. What went wrong → `build-patterns.md`
2. Site-specific scraping quirks → `scraping-patterns.md`
3. New quality criteria → `quality-checklist.md`
4. One-line summary → `MEMORY.md`

## Cost Estimate
- Gemini image generation: ~$0.05-0.10 per image
- ElevenLabs agent duplication: free (API call)
- Total per bespoke build: ~$0.30-0.60 in API costs
- Human time (with skill): ~15-30 minutes for review
