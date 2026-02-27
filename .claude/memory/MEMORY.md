# ConversionOS Bespoke Build Memory

## Build Patterns
- 38+ files need updating per target (see file-map.md for exact list)
- Bulk sed for universal tokens first, then manual edits for content-specific files
- Always verify with `grep -r "ConversionOS Demo" src/` after — zero results required
- See build-patterns.md for detailed patterns

## Scraping Lessons
- Always scrape: homepage, about, services, contact, testimonials, gallery
- Testimonials MUST be exact quotes — never paraphrase
- Look for booking URLs (myonlinebooking.co, Calendly, etc.)
- See scraping-patterns.md for site-specific patterns

## Quality Gates
- `npm run build` must pass with zero errors
- No remaining base template references in src/
- All 3 ElevenLabs agents customized with real company data
- Visual check: hero, services, testimonials, about, contact, admin
- See quality-checklist.md for full checklist

## Color System
- OKLCH in globals.css: `--primary: oklch(L C H)`
- Convert hex → OKLCH: use oklch.com or calculateOKLCH()
- McCarty Squared: oklch(0.45 0.18 250) = #1565C0 (blue)

## Target #1: McCarty Squared (London, ON)
- 73 files modified from base template
- ElevenLabs agents duplicated and customized (Emma, Marcus, Mia)
- All images regenerated with Gemini gemini-3.1-flash-image-preview (Nano Banana 2)
- Exact testimonials from Ziad A., Megan E., Jenny K. S.
- RenoMark certified, LHBA, NetZero Home, Houzz Pro
- Principals: Garnet (lead builder) + Carisa (business manager)
