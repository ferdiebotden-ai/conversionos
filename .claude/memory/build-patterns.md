# Build Patterns

## Build Sequence (Learned from McCarty Squared)

### Phase 1: Bulk Sed (Universal Tokens)
Replace across all `.ts`/`.tsx` files in `src/`:
- Company name: "ConversionOS Demo" → target name
- Domain: placeholder → target domain
- Phone: placeholder → target phone
- Email: placeholder → target email
- Location/city references
- Person name placeholders → real principal names

### Phase 2: Content-Specific Edits
Manual edits required for:
- `src/lib/ai/knowledge/company.ts` — full company data
- `src/lib/ai/knowledge/services.ts` — all service offerings with descriptions
- `src/components/testimonials.tsx` — exact customer quotes
- `src/app/page.tsx` — hero copy, process steps, "Why Choose Us" cards
- `src/app/about/page.tsx` — team bios, certifications, service areas, about copy
- `src/app/contact/page.tsx` — address, phone, email, hours, booking URL
- `src/components/footer.tsx` — links, address, contact info
- `src/components/header.tsx` — logo, nav items

### Phase 3: AI Personas
Update all 3 persona files + prompt assembler:
- `src/lib/ai/personas/receptionist.ts` — Emma's prompts with real company data
- `src/lib/ai/personas/quote-specialist.ts` — Marcus's knowledge of real services/pricing
- `src/lib/ai/personas/design-consultant.ts` — Mia's style awareness
- `src/lib/ai/personas/prompt-assembler.ts` — company context references
- `src/lib/ai/prompts.ts` — system prompts with company name

### Phase 4: Color System
- Extract brand color from target's website
- Convert hex → OKLCH
- Update `src/app/globals.css`: `--primary: oklch(L C H)`

### Phase 5: Config
- `.env.local` — site ID, ElevenLabs agent IDs
- `src/app/layout.tsx` — metadata title, description, og tags

## Key Insight: Read company.ts and services.ts First
These two files contain the most concentrated company knowledge.
Understanding them tells you exactly what the AI knowledge base needs.

## ElevenLabs Agent Workflow
1. Duplicate base agent: `POST /v1/convai/agents/{base_id}/duplicate`
2. PATCH with target-specific: system prompt, first message, knowledge
3. Verify: `GET /v1/convai/agents/{new_id}` returns 200
4. Store new IDs in `.env.local`

## Image Generation
- Use specific, detailed prompts (style, lighting, materials, room type)
- Every prompt should reference the target's actual service specialties
- Gemini `gemini-3.1-flash-image-preview` (Nano Banana 2) with `responseModalities: ['image', 'text']`
- Script: `scripts/generate-image.mjs --prompt "..." --output path/to/file.png`
