# AI Design Visualizer — Codebase Briefing

> **Purpose:** Everything a strategic partner needs to write a precise, implementable PRD for enhancing the AI Design Visualizer and its integration with the quoting engine.
>
> **Codebase:** `/Users/norbot/norbot-ops/products/demo/` (ConversionOS multi-tenant demo platform)
>
> **Stack:** Next.js 16.1.6 (App Router) · React 19 · TypeScript 5 (strict) · Supabase · Vercel AI SDK v6 · Tailwind v4 · shadcn/ui · Framer Motion

---

## Table of Contents

1. [Current User Flow](#1-current-user-flow)
2. [Component Map](#2-component-map)
3. [Style System](#3-style-system)
4. [AI Integration Pipeline & Photo Analysis Deep Dive](#4-ai-integration-pipeline--photo-analysis-deep-dive)
5. [Photo Handling](#5-photo-handling)
6. [Database Schema](#6-database-schema)
7. [Architectural Constraints & Pain Points](#7-architectural-constraints--pain-points)
8. [Visualizer → Lead → Quote Data Flow](#8-visualizer--lead--quote-data-flow)
9. [Marcus (Quote Specialist) Architecture](#9-marcus-quote-specialist-architecture)
10. [Mia (Design Consultant) → Marcus Handoff](#10-mia-design-consultant--marcus-handoff)
11. [Visual Audit — Playwright Screenshots](#11-visual-audit--playwright-screenshots)

---

## 1. Current User Flow

The visualizer operates in a **streamlined single-page flow** (the legacy "conversation mode" with Mia-driven chat exists in code but is not the default path). Entry point: `/visualizer`.

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  /visualizer (page.tsx)                                         │
│                                                                 │
│  HERO: "Visualize Your Dream Space"                             │
│  Trust bar: 100% Free · ~30 sec · Private                       │
│                                                                 │
│  Step 1: PHOTO UPLOAD                                           │
│  ├── Drag & drop zone or click to browse                        │
│  ├── Accepts JPG, PNG, HEIC (20MB max pre-compression)          │
│  ├── Client-side compression (→ max 1920×1920, JPEG 0.85)       │
│  └── On upload → transition to 'form' step                      │
│                                                                 │
│  Step 2: FORM (single scrollable page)                          │
│  ├── Sticky photo summary bar (preview + "Change photo")        │
│  ├── Room Type: 8 options (kitchen, bathroom, living_room,      │
│  │   bedroom, basement, dining_room, exterior, other)           │
│  │   → Auto-scroll to Style section on selection                │
│  ├── Style: 6 predefined + "Other" with custom text             │
│  │   (modern, traditional, farmhouse, industrial, minimalist,   │
│  │    contemporary) — each with AI-generated preview image       │
│  │   → Auto-scroll to Preferences section on selection          │
│  ├── Preferences: Equal-prominence choice cards                 │
│  │   ├── "Type your vision" → textarea (500 char max)           │
│  │   └── "Talk to Mia" → ElevenLabs voice consultation          │
│  │       ├── Microphone permission dialog                       │
│  │       ├── Real-time transcript with chat bubbles              │
│  │       └── Auto-summarize on disconnect → AI summary card      │
│  ├── Selection Summary card (Room + Style + preferences)        │
│  └── Floating "Generate My Vision" CTA (sticky bottom)          │
│                                                                 │
│  Step 3: GENERATING                                             │
│  ├── Animated loading screen with progress bar                  │
│  ├── Sparkle icon, rotating tips carousel                       │
│  ├── Cancel button                                              │
│  └── Progress simulation: 0→97% over ~90s                       │
│                                                                 │
│  Step 4: RESULTS                                                │
│  ├── "Your Vision is Ready!" header with generation time        │
│  ├── Before/After slider (draggable, labels: Current/Concept N) │
│  ├── 4 concept thumbnails (selectable, checkmark on active)     │
│  ├── Action buttons:                                            │
│  │   ├── "Get a Quote for This Design" (primary CTA)            │
│  │   ├── Download (with email capture gate)                     │
│  │   └── Share                                                  │
│  ├── "Start Over with a Different Photo"                        │
│  ├── Sticky bottom CTA (appears after 3s)                       │
│  └── Disclaimer: "AI-generated visualization for concept..."    │
│                                                                 │
│  Step 5: QUOTE HANDOFF                                          │
│  ├── Serialize handoff context to sessionStorage                │
│  ├── Store: designPreferences, visualizationData, transcript    │
│  └── Navigate to /estimate?visualization={id}                   │
└─────────────────────────────────────────────────────────────────┘
```

### State Machine

```typescript
type Step = 'photo' | 'form' | 'generating' | 'result' | 'error';
// File: src/components/visualizer/visualizer-form.tsx:38
```

The `VisualizerFormInner` component manages all state. It's wrapped in `<VoiceProvider>` for voice session management.

### Key State Shape

```typescript
// File: src/components/visualizer/visualizer-form.tsx:40-52
interface FormData {
  photo: string | null;                      // base64 data URL
  photoFile: File | null;                    // original File object
  roomType: RoomTypeSelection | null;        // 'kitchen' | ... | 'other'
  customRoomType: string;                    // free text when 'other'
  style: DesignStyleSelection | null;        // 'modern' | ... | 'other'
  customStyle: string;                       // free text when 'other'
  textPreferences: string;                   // 500 char max
  voiceTranscript: VoiceTranscriptEntry[];   // real-time transcript
  voicePreferencesSummary?: string;          // AI summary of voice call
  voiceExtractedPreferences?: VoiceExtractedPreferences; // structured extraction
  photoAnalysis?: RoomAnalysis;              // GPT Vision analysis
}
```

---

## 2. Component Map

### Visualizer Components (`src/components/visualizer/`)

| Component | File | Role | Key Props/Dependencies |
|-----------|------|------|----------------------|
| **VisualizerForm** | `visualizer-form.tsx` | Top-level orchestrator. Manages all state, step transitions, API calls, handoff. | Wraps `VisualizerFormInner` in `<VoiceProvider>` |
| **PhotoUpload** | `photo-upload.tsx` | Drag/drop + click upload zone with preview. | `value: string \| null`, `onChange: (base64, file) => void` |
| **PhotoSummaryBar** | `photo-summary-bar.tsx` | Sticky header showing uploaded photo thumbnail + "Change photo" button. | `photoSrc`, `detectedRoomType?`, `onChangePhoto` |
| **RoomTypeSelector** | `room-type-selector.tsx` | 8-option grid with icons. Supports custom "other" with text input. | `value`, `onChange`, `allowCustom`, `customValue` |
| **StyleSelector** | `style-selector.tsx` | 6 predefined styles + custom. AI-generated preview images per style. | `value`, `onChange`, `allowCustom`, `customValue` |
| **PreferencesSection** | `preferences-section.tsx` | Equal-prominence text/voice choice cards → active mode → post-call summary. | `textValue`, `onTextChange`, `voiceTranscript`, `voiceSummary`, `onVoiceSummaryReady` |
| **VoiceChatBubble** | `voice-chat-bubble.tsx` | Individual transcript message bubble (user right-aligned, Mia left-aligned). | `entry: VoiceTranscriptEntry`, `compact?: boolean` |
| **FloatingGenerateButton** | `floating-generate-button.tsx` | Sticky bottom CTA "Generate My Vision". Fades in when room + style selected. | `visible`, `onClick`, `disabled` |
| **GenerationLoading** | `generation-loading.tsx` | Full-screen loading state with progress bar, tips carousel, cancel button. | `style`, `roomType`, `progress`, `onCancel` |
| **ResultDisplay** | `result-display.tsx` | Full results view with slider, thumbnails, actions, sticky CTA. | `visualization`, `originalImage`, `onStartOver`, `onGetQuote` |
| **BeforeAfterSlider** | `before-after-slider.tsx` | Draggable comparison slider between original and generated concept. | `beforeImage`, `afterImage`, `beforeLabel`, `afterLabel` |
| **ConceptThumbnails** | `concept-thumbnails.tsx` | Horizontal row of 4 concept thumbnail cards with selection state. | `concepts`, `selectedIndex`, `onSelect` |
| **DownloadButton** | `download-button.tsx` | Downloads generated concept image. Triggers email capture gate first time. | `imageUrl`, `onBeforeDownload` |
| **EmailCaptureModal** | `email-capture-modal.tsx` | Modal collecting email before download (lead capture). | `open`, `onOpenChange`, `visualizationId`, `onEmailSubmitted` |
| **SaveVisualizationModal** | `save-visualization-modal.tsx` | Share modal with link generation. | `open`, `onOpenChange`, `visualizationId` |
| **VisualizerChat** | `visualizer-chat.tsx` | Legacy conversation mode chat with Mia (not used in streamlined flow). | Uses `useChat` from Vercel AI SDK |

### Voice Components (`src/components/voice/`)

| Component | File | Role |
|-----------|------|------|
| **VoiceProvider** | `voice-provider.tsx` | React context providing `startVoice()`, `endVoice()`, `status`, `transcript` |
| **TalkButton** | `talk-button.tsx` | "Talk to Mia" button that initiates ElevenLabs WebSocket connection |
| **MicrophonePermissionDialog** | `microphone-permission-dialog.tsx` | Permission dialog before voice connection |
| **VoiceIndicator** | `voice-indicator.tsx` | Active call indicator (pulsing dot, "Connected" status) |
| **PersonaAvatar** | `persona-avatar.tsx` | Persona icon with optional animation state (static/speaking/listening) |
| **VoiceTranscriptMessage** | `voice-transcript-message.tsx` | Individual transcript line (used in voice indicator) |

### Chat Components (`src/components/chat/`)

| Component | File | Role |
|-----------|------|------|
| **ChatInterface** | `chat-interface.tsx` | Marcus's chat UI on `/estimate` page. Receives visualization handoff context. |

### Receptionist Widget (`src/components/receptionist/`)

| Component | File | Role |
|-----------|------|------|
| **ReceptionistWidget** | `receptionist-widget.tsx` | Emma's floating action button (FAB) on all pages |

---

## 3. Style System

### Predefined Styles (6 + Custom)

Each style has two levels of definition:

**Basic** (`src/lib/schemas/visualization.ts:112-119`):
```typescript
export const STYLE_DESCRIPTIONS: Record<DesignStyle, string> = {
  modern: 'Clean lines, neutral colors, open spaces, minimal ornamentation, sleek finishes...',
  traditional: 'Classic design elements, rich wood tones, elegant moldings...',
  farmhouse: 'Rustic charm, shiplap walls, barn doors, natural wood...',
  industrial: 'Exposed brick and ductwork, metal accents, concrete floors...',
  minimalist: 'Ultra-clean aesthetic, monochromatic palette, hidden storage...',
  contemporary: 'Current design trends, bold accent colors, mixed materials...',
};
```

**Detailed** (`src/lib/ai/prompt-builder.ts:47-103`) — each style has:
- `narrative` — Rich prose description for prompt context
- `materials[]` — e.g., `['polished concrete', 'tempered glass', 'brushed stainless steel']`
- `colors[]` — e.g., `['crisp white', 'warm gray', 'charcoal', 'black accents']`
- `finishes[]` — e.g., `['matte lacquer', 'high-gloss paint', 'brushed metal']`
- `fixtures[]` — e.g., `['frameless cabinets', 'handleless drawers', 'integrated appliances']`
- `lighting` — Prose description of lighting approach

### Detailed Style Breakdown

| Style | Narrative Excerpt | Key Materials | Signature Elements |
|-------|-------------------|---------------|-------------------|
| **Modern** | "Sophisticated...clean horizontal lines, geometric precision" | polished concrete, tempered glass, engineered quartz | frameless cabinets, waterfall countertops, recessed LED |
| **Traditional** | "Timeless...classical European design, elegant symmetry" | solid hardwood, natural stone, crown molding | raised panel cabinets, apron-front sinks, crystal chandeliers |
| **Farmhouse** | "Warm...rustic charm with modern comfort" | reclaimed wood, shiplap, subway tile, butcher block | farmhouse sinks, open shelving, barn door hardware |
| **Industrial** | "Bold...converted warehouses, urban lofts" | exposed brick, raw concrete, blackened steel | metal-frame cabinets, pipe shelving, Edison bulbs |
| **Minimalist** | "Serene...simplicity as art, every element serves a purpose" | white oak, seamless quartz, frosted glass | handleless everything, hidden storage, concealed LED strips |
| **Contemporary** | "Dynamic...current trends, bold statements" | mixed metals, textured tiles, statement stone | sculptural hardware, statement faucets, pendant clusters |

### Room-Specific Contexts

Each room type has detailed renovation focus areas (`src/lib/ai/prompt-builder.ts:108-148`):

```typescript
const DETAILED_ROOM_CONTEXTS: Record<RoomType, {
  primary: string[];       // Main renovation elements
  secondary: string[];     // Supporting elements
  preservationPriority: string[];  // Must-preserve structural items
}>;
```

Example for `kitchen`:
- **Primary:** cabinet doors, countertop material, backsplash tile, lighting
- **Secondary:** hardware/pulls, faucet, open shelving, accessories
- **Preserve:** cabinet box locations, appliance positions, window placement, ceiling height

### Custom Style Support

When `style === 'other'`, the prompt builder adapts (`prompt-builder.ts:217-228`):
- Falls back to the user's `customStyle` text as the style description
- Skips detailed material/colour lookups
- Tells Gemini to "interpret this style description creatively"

---

## 4. AI Integration Pipeline & Photo Analysis Deep Dive

### Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  POST /api/ai/visualize (route.ts, maxDuration: 120s)               │
│                                                                      │
│  1. VALIDATE REQUEST (Zod enhanced schema)                           │
│  2. UPLOAD ORIGINAL to Supabase Storage                              │
│  3. PHOTO ANALYSIS (GPT-5.2 Vision) ← ~2-3s                         │
│  4. STRUCTURAL CONDITIONING (parallel)                               │
│     ├── Depth estimation (Replicate) ← DISABLED                      │
│     └── Edge detection (sharp) ← enabled, local, free               │
│  5. BUILD PROMPT (6-part structured)                                 │
│  6. GENERATE CONCEPTS (Gemini 3 Pro Image) ← ~60-90s                │
│     ├── Batch 1: concepts 0+1 in parallel                           │
│     └── Batch 2: concepts 2+3 in parallel                           │
│     └── Rate limit retry with exponential backoff (5s, 10s)         │
│  7. UPLOAD GENERATED to Supabase Storage                             │
│  8. SAVE to visualizations table                                     │
│  9. RECORD METRICS (fire-and-forget)                                 │
│  10. RETURN VisualizationResponse                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### Models Used

| Stage | Model | Provider | Cost |
|-------|-------|----------|------|
| Photo Analysis | `gpt-5.2` (multimodal) | OpenAI | ~$0.015/call |
| Design Intent Extraction | `gpt-5.2` | OpenAI | ~$0.005/call |
| Depth Estimation | `depth-anything-v3-metric` | Replicate | ~$0.002/call (DISABLED) |
| Edge Detection | `sharp` (local) | Local npm | $0 |
| Image Generation | `gemini-3.1-flash-image-preview` | Google AI | ~$0.075/concept |
| Structure Validation | `gpt-5.2` (multimodal) | OpenAI | ~$0.01/call |
| Voice Summarization | `gpt-5.2` | OpenAI | ~$0.005/call |
| **Total per 4-concept generation** | | | **~$0.475** |

### Configuration

```typescript
// File: src/lib/ai/config.ts
export const AI_CONFIG = {
  openai: {
    chat: 'gpt-5.2',
    extraction: 'gpt-5.2',
    vision: 'gpt-5.2',      // 86.3% spatial reasoning accuracy
  },
  google: {
    imageGeneration: 'gemini-3.1-flash-image-preview',
  },
  pipeline: {
    enableDepthEstimation: false,   // REPLICATE_API_TOKEN not configured
    enableEdgeDetection: true,      // Local sharp, zero cost
    enableIterativeRefinement: false, // Causes timeouts on free tier
  },
};

// File: src/lib/ai/gemini.ts
export const VISUALIZATION_CONFIG = {
  model: 'gemini-3.1-flash-image-preview',
  structureReferenceStrength: 0.90,  // How much to preserve room layout
  styleStrength: 0.40,               // How aggressively to apply style
  outputCount: 4,
  resolution: '2048x2048',
  timeout: 75000,                    // Per-concept timeout (ms)
};
```

### Photo Analysis Deep Dive

**File:** `src/lib/ai/photo-analyzer.ts`

The `analyzeRoomPhotoForVisualization()` function sends the uploaded photo to GPT-5.2 Vision with a structured 18-field analysis prompt. The response is validated against `VisualizationRoomAnalysisSchema` (Zod).

**Full Analysis Schema:**

```typescript
// File: src/lib/ai/photo-analyzer.ts:16-115
VisualizationRoomAnalysisSchema = z.object({
  roomType: z.enum([...]),                    // Detected room type
  currentCondition: z.enum([...]),            // excellent/good/dated/needs_renovation
  structuralElements: z.array(z.string()),    // Load-bearing walls, supports
  identifiedFixtures: z.array(z.string()),    // Islands, sinks, fireplaces
  layoutType: z.string(),                     // "galley", "L-shaped", "open concept"
  lightingConditions: z.string(),             // Natural light direction, shadows
  perspectiveNotes: z.string(),               // Camera position, focal length
  preservationConstraints: z.array(z.string()), // Plumbing, electrical, windows
  confidenceScore: z.number(),                // 0-1 analysis confidence
  currentStyle: z.string().nullable(),        // Existing design style
  estimatedDimensions: z.string().nullable(), // Approximate room size
  potentialFocalPoints: z.array(z.string()).nullable(),
  wallCount: z.number().nullable(),           // Visible walls (0-6)
  wallDimensions: z.array(z.object({          // Per-wall details
    wall: z.string(),                         // "left wall", "back wall"
    estimatedLength: z.string(),              // "~12 feet"
    hasWindow: z.boolean(),
    hasDoor: z.boolean(),
  })).nullable(),
  estimatedCeilingHeight: z.string().nullable(), // "~8 feet standard"
  spatialZones: z.array(z.object({            // Functional zones
    name: z.string(),                         // "cooking zone", "prep area"
    description: z.string(),
    approximateLocation: z.string(),          // "left third of room"
  })).nullable(),
  openings: z.array(z.object({               // Doors, windows, archways
    type: z.enum(['window', 'door', 'archway']),
    wall: z.string(),
    approximateSize: z.string(),
    approximatePosition: z.string(),
  })).nullable(),
  architecturalLines: z.object({             // Dominant geometry
    dominantDirection: z.string(),
    vanishingPointDescription: z.string(),
    symmetryAxis: z.string().nullable(),
  }).nullable(),
});
```

**The analysis prompt** (lines 142-224) asks GPT Vision to provide:
1. Room type identification
2. Current condition rating
3. Structural elements that MUST be preserved
4. Identified fixtures and features
5. Layout type (galley, L-shaped, etc.)
6. Lighting conditions (direction, time of day, artificial sources)
7. Perspective notes (camera position, focal length, foreground/background)
8. Preservation constraints (plumbing, electrical, structural)
9. Confidence score
10. Current style assessment
11. Estimated dimensions
12. Potential focal points
13. Wall count and per-wall dimensions
14. Estimated ceiling height
15. Spatial zones
16. Door/window/archway catalog
17. Dominant architectural lines and vanishing points

**Settings:** `maxOutputTokens: 2500`, `temperature: 0.3`

### 6-Part Structured Prompt

**File:** `src/lib/ai/prompt-builder.ts` — `buildRenovationPrompt()`

The function constructs a multi-section prompt from the photo analysis, style data, and user preferences:

```
=== SCENE DESCRIPTION ===
Transform this [roomType] into a [style] design renovation.
[Style narrative] + [Room focus areas]

=== STRUCTURAL PRESERVATION (CRITICAL) ===
ABSOLUTE REQUIREMENTS — room dimensions, windows, camera angle...
[Photo analysis structural elements]
[Photo analysis preservation constraints]
[Room-specific preservation priority]
[Wall dimensions, openings, spatial zones, architectural lines if available]

=== STRUCTURAL CONDITIONING ===  (only if depth/edge maps present)
DEPTH MAP: lighter = closer...
EDGE MAP: lines = architectural features...

=== MATERIAL & FINISH SPECIFICATIONS ===
Style: [STYLE]
Primary Materials: [...]
Color Palette: [...]
Finish Types: [...]
Fixture Styles: [...]
[User material preferences if provided]

=== LIGHTING INSTRUCTIONS ===
[Style-specific lighting description]
[Photo analysis lighting conditions]

=== PERSPECTIVE INSTRUCTIONS ===
Maintain EXACT camera position...
[Photo analysis perspective notes]

=== OUTPUT QUALITY REQUIREMENTS ===
Photorealistic, 2048x2048, publication-ready...

=== USER PREFERENCES ===  (if provided)
[User's text preferences]

=== DESIGN INTENT (from consultation) ===  (if conversation/voice data)
Desired Changes: [...]
Elements to Preserve: [...]

=== VOICE CONSULTATION CONTEXT ===  (if voice session occurred)
[AI summary of Mia consultation]

=== VARIATION N ===  (for concepts 2-4)
[Variation hint: warmer tones / organic materials / streamlined / accent details]

=== GENERATE ===
Create a single photorealistic visualization...
```

### Gemini System Instruction

**File:** `src/lib/ai/gemini.ts:104-123`

Gemini receives a permanent system instruction emphasizing:
- Preserve EXACT room geometry, camera angle, structural elements
- Transform ONLY finishes, fixtures, colours, and decor
- Common pitfalls to avoid (changing dimensions, altering windows, etc.)
- Photo analysis context injected dynamically if available

### Concept Generation Strategy

**File:** `src/app/api/ai/visualize/route.ts:456-542`

- **Batch generation:** Concepts 0+1 in parallel (batch 1), then 2+3 in parallel (batch 2)
- **Rate limit handling:** Exponential backoff (5s, 10s) on 429/timeout errors
- **Time budget:** If >80s elapsed after batch 1 with 2+ concepts, returns early
- **Minimum viable:** Must generate at least 1 concept or throws error
- **Retry per concept:** Up to 2 retries with backoff

### Structure Validation

**File:** `src/lib/ai/validation.ts`

Optional quality gate using GPT-5.2 Vision to compare original vs generated:

```typescript
// quickValidateImage() — fast check, returns { isAcceptable, score }
// Score >= 0.7 passes
// Only runs on first 2 attempts to save costs
// On validation failure: retry with stronger structure emphasis
// On error: permissive (returns true) — never blocks generation
```

---

## 5. Photo Handling

### Upload Pipeline

```
User selects/drops file
  │
  ├── Type check: must start with 'image/'
  ├── Size check: max 20MB pre-compression
  │
  ├── HEIC Detection (isHeicFile)
  │   ├── Checks file.type ('image/heic', 'image/heif')
  │   └── Checks file.name extension (.heic, .heif)
  │   └── If HEIC → dynamic import heic2any → convert to JPEG
  │
  ├── Compression (compressImage)
  │   ├── If already <2MB and ≤1920px and JPEG/PNG → skip
  │   ├── Resize: max 1920×1920 (preserving aspect ratio)
  │   ├── Canvas draw + toBlob('image/jpeg', 0.85)
  │   └── If still >2MB → reduce quality iteratively (0.7, 0.6, 0.5...)
  │
  ├── Base64 conversion (fileToBase64 via FileReader)
  │
  └── Stored in React state as data URL string
```

**File:** `src/lib/utils/image.ts`

**Constants:**
```typescript
const MAX_SIZE = 2 * 1024 * 1024;   // 2MB target
const MAX_DIMENSION = 1920;          // Max width/height
const JPEG_QUALITY = 0.85;           // Initial quality
```

### Server-Side Storage

**File:** `src/app/api/ai/visualize/route.ts:329-377`

1. Original photo: Extract base64 → decode to buffer → upload to `visualizations/original/{timestamp}-{random}.{ext}`
2. Generated concepts: Each concept → `visualizations/generated/{timestamp}-{index}-{random}.{ext}`
3. Fallback: If Supabase Storage upload fails, falls back to base64 data URL (keeps working but bloats DB)

### Storage Bucket

```sql
-- File: supabase/migrations/20260203000001_visualizations_storage.sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('visualizations', 'visualizations', true, 52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]);
```

### Supported Formats

| Format | Support | Notes |
|--------|---------|-------|
| JPEG | Native | Most common, primary target format |
| PNG | Native | Supported, converted to JPEG on compress |
| HEIC/HEIF | Via conversion | Dynamic import of `heic2any`, converts to JPEG |
| WebP | Storage only | Accepted in Supabase bucket but not in upload UI |

---

## 6. Database Schema

### `visualizations` Table

**Migration:** `20260201000000_visualizations_table.sql` + `20260206000000_enhanced_visualizations.sql`

```sql
CREATE TABLE visualizations (
  -- Identity
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ DEFAULT NOW(),
  site_id                       TEXT NOT NULL,  -- multi-tenancy (via withSiteId)

  -- User Info
  email                         TEXT,

  -- Original Input
  original_photo_url            TEXT NOT NULL,
  room_type                     TEXT NOT NULL CHECK (IN ('kitchen','bathroom','living_room','bedroom','basement','dining_room')),
  style                         TEXT NOT NULL CHECK (IN ('modern','traditional','farmhouse','industrial','minimalist','contemporary')),
  constraints                   TEXT,

  -- Generated Output
  generated_concepts            JSONB NOT NULL DEFAULT '[]',  -- [{id, imageUrl, description, generatedAt}]
  generation_time_ms            INTEGER,

  -- Relationships
  lead_id                       UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Sharing
  shared                        BOOLEAN DEFAULT false,
  share_token                   TEXT UNIQUE,

  -- Tracking
  downloaded                    BOOLEAN DEFAULT false,
  download_count                INTEGER DEFAULT 0,
  source                        TEXT DEFAULT 'visualizer',  -- 'visualizer' | 'visualizer_conversation'
  device_type                   TEXT,
  user_agent                    TEXT,

  -- Enhanced Fields (migration 20260206)
  conversation_context          JSONB,          -- Full conversation state
  photo_analysis                JSONB,          -- GPT Vision RoomAnalysis
  prompt_used                   TEXT,           -- Actual prompt sent to Gemini
  admin_notes                   TEXT,           -- Contractor notes
  selected_concept_index        INTEGER,        -- Preferred concept (0-3)
  contractor_feasibility_score  INTEGER CHECK (1-5),
  estimated_cost_impact         TEXT,
  technical_concerns            TEXT[],
);
```

**RLS Policies:**
- Public insert (anyone can create visualizations)
- Public select (shared or has share_token)
- Admin full access (JWT role = admin)
- Service role bypass

**Indexes:**
- `created_at DESC`, `email`, `share_token`, `lead_id`
- `source WHERE source = 'visualizer_conversation'`

### `visualization_metrics` Table

**Migration:** `20260207000000_visualization_metrics.sql`

```sql
CREATE TABLE visualization_metrics (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  site_id                       TEXT NOT NULL,

  -- Link
  visualization_id              UUID REFERENCES visualizations(id) ON DELETE CASCADE,

  -- Generation metrics
  generation_time_ms            INTEGER NOT NULL,
  retry_count                   INTEGER DEFAULT 0,
  concepts_requested            INTEGER DEFAULT 4,
  concepts_generated            INTEGER NOT NULL,

  -- Quality metrics
  structure_validation_score    NUMERIC(3,2),
  photorealism_score            NUMERIC(3,2),
  validation_passed             BOOLEAN,

  -- Mode tracking
  mode                          TEXT CHECK (IN ('quick', 'conversation')) DEFAULT 'quick',
  photo_analyzed                BOOLEAN DEFAULT false,
  conversation_turns            INTEGER DEFAULT 0,

  -- Cost tracking
  estimated_cost_usd            NUMERIC(6,4),
  analysis_cost_usd             NUMERIC(6,4),
  generation_cost_usd           NUMERIC(6,4),
  validation_cost_usd           NUMERIC(6,4),

  -- Outcome tracking
  proceeded_to_quote            BOOLEAN DEFAULT false,
  admin_selected                BOOLEAN DEFAULT false,
  user_downloaded               BOOLEAN DEFAULT false,
  user_shared                   BOOLEAN DEFAULT false,

  -- Error tracking
  error_occurred                BOOLEAN DEFAULT false,
  error_code                    TEXT,
  error_message                 TEXT,
);
```

**Views:**
- `visualization_metrics_daily` — Daily aggregates (count, avg time, success rate, cost)
- `visualization_metrics_hourly` — Last 24h hourly monitoring

**Helper Functions:**
- `record_visualization_metrics()` — Insert metrics row
- `update_visualization_outcome()` — Update post-generation outcomes
- `get_visualization_summary(days)` — Dashboard summary stats

### `lead_visualizations` Junction Table

**Migration:** `20260206000000_enhanced_visualizations.sql`

```sql
CREATE TABLE lead_visualizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  visualization_id    UUID NOT NULL REFERENCES visualizations(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_primary          BOOLEAN DEFAULT false,
  admin_selected      BOOLEAN DEFAULT false,
  display_order       INTEGER DEFAULT 0,
  relationship_notes  TEXT,
  UNIQUE(lead_id, visualization_id)
);
```

**Helper Functions:**
- `link_visualization_to_lead(lead_id, viz_id, is_primary, admin_selected)` — Upsert link, auto-unsets previous primary
- `get_lead_visualizations(lead_id)` — Returns all linked visualizations ordered by primary/selected/date

### `leads` Table (Relevant Columns)

```sql
-- Relevant visualization-related columns on leads table:
  lead_id             UUID,     -- referenced by visualizations.lead_id
  visualization_id    UUID,     -- direct reference (legacy, before junction table)
  room_type           TEXT,
  style               TEXT,
  -- Contact info: name, email, phone, address
  -- Estimate data: estimated_total, square_footage, material_preference
```

### Storage Bucket: `visualizations`

- Public read access
- Service role write/update/delete
- 50MB file size limit
- Allowed types: `image/jpeg`, `image/png`, `image/webp`

---

## 7. Architectural Constraints & Pain Points

### Current Limitations

1. **No iterative refinement.** Users generate 4 concepts and that's it. No "make concept 2 warmer" or "try with darker cabinets." The `enableIterativeRefinement` flag exists in config but is `false` — it causes timeouts on Vercel's free tier. Each regeneration is a full new session.

2. **Ephemeral canvas.** Generated concepts only persist in the `visualizations` table row. There's no session history — if the user starts over, previous generations are gone from the UI (still in DB).

3. **No style switching without regeneration.** Changing style from "Modern" to "Farmhouse" requires a full new generation cycle (~60-90s). No quick style preview.

4. **Room type DB enum gap.** The DB CHECK constraint only allows 6 room types (`kitchen`, `bathroom`, `living_room`, `bedroom`, `basement`, `dining_room`). The UI supports 8 (`exterior`, `other`). These are mapped to `living_room`/`contemporary` as fallbacks for DB writes.

5. **Single photo only.** The visualizer accepts one photo per session. No multi-angle support, no panoramic, no floorplan integration.

6. **No undo/history.** No way to go back to a previous generation or compare across sessions.

7. **Vercel timeout pressure.** `maxDuration: 120s` on the API route. Gemini generation for 4 concepts takes 60-90s. Time budget management is already tight — early return if >80s elapsed.

8. **Voice consultation is separate from generation context.** The voice transcript is summarized by AI and injected as text into the prompt. There's no structured extraction of dimensions, materials, or spatial preferences from voice.

9. **Photo analysis runs server-side during generation**, not during upload. The `runPhotoAnalysis` callback in the form is a no-op (lines 103-115). This means the analysis adds to the generation time rather than running in parallel during the form fill.

10. **No AB testing infrastructure.** No way to compare prompt variations, style definitions, or UI layouts.

### Technical Debt Indicators

- `VisualizerChat` component exists but is unused in the streamlined flow
- Legacy `generateConceptsWithGemini` function wraps the enhanced version
- `buildVisualizationPrompt` marked `@deprecated`
- `roomType === 'other'` maps to `'living_room'` for DB — losing the custom type name
- `eslint-disable` on metrics insert due to dynamic table access
- `@ts-expect-error` on Gemini's `responseModalities` config (older type defs)

### Missing Data That Would Enrich the Quote

From a visualization session, the following data exists but is NOT carried through to Marcus:
- **Photo analysis JSONB** — room dimensions, wall count, ceiling height, spatial zones
- **Material preferences from prompt** — what specific materials were requested
- **Structural constraints** — what can/can't change
- **Iteration history** — which styles were tried before settling
- **Concept selection** — which of the 4 concepts the user preferred
- **Voice transcript details** — raw conversation with Mia (only summary is passed)

---

## 8. Visualizer → Lead → Quote Data Flow

### Data Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│  VISUALIZATION SESSION                                              │
│  ├── User uploads photo → compressed base64                        │
│  ├── Selects room type + style + preferences                       │
│  ├── Optional: Voice consultation with Mia                         │
│  ├── Generation → 4 concepts stored in Supabase                    │
│  └── visualization.id = UUID (in visualizations table)             │
│                                                                     │
│  "GET A QUOTE FOR THIS DESIGN" clicked                              │
│                                                                     │
│  HANDOFF SERIALIZATION (visualizer-form.tsx:271-328)                │
│  ├── serializeHandoffContext('design-consultant', 'quote-specialist')│
│  │   └── Stores in sessionStorage['demo_handoff_context']           │
│  ├── Rich handoff data includes:                                    │
│  │   ├── fromPersona: 'design-consultant'                           │
│  │   ├── toPersona: 'quote-specialist'                              │
│  │   ├── summary: "User designed a kitchen renovation in modern..." │
│  │   ├── recentMessages: last 6 voice transcript entries            │
│  │   ├── designPreferences: {roomType, style, textPreferences,      │
│  │   │                        voicePreferencesSummary}               │
│  │   ├── visualizationData: {id, concepts[], originalImageUrl,      │
│  │   │                        roomType, style}                      │
│  │   └── timestamp: Date.now()                                      │
│  │                                                                   │
│  └── Navigate to /estimate?visualization={visualization.id}         │
│                                                                     │
│  /ESTIMATE PAGE                                                     │
│  ├── Reads sessionStorage['demo_handoff_context']                   │
│  ├── 15-minute TTL (readHandoffContext checks timestamp)            │
│  ├── Builds handoff prompt prefix for Marcus                        │
│  ├── Marcus's system prompt includes:                               │
│  │   ├── "## Handoff from Design Visualizer"                       │
│  │   ├── Room: kitchen | Style: modern                              │
│  │   ├── Text Preferences: "..."                                    │
│  │   ├── Voice Summary: "..."                                       │
│  │   └── Visualization: 4 concepts generated (ID: ...)             │
│  └── Marcus greets warmly and acknowledges context                  │
│                                                                     │
│  LEAD CREATION                                                      │
│  ├── Triggered when user submits contact info via Marcus chat       │
│  ├── POST /api/leads creates lead row                               │
│  ├── Links visualization via lead_visualizations junction table     │
│  └── Sets is_primary = true for the triggering visualization       │
└─────────────────────────────────────────────────────────────────────┘
```

### HandoffContext Interface

```typescript
// File: src/lib/chat/handoff.ts:10-36
export interface HandoffContext {
  fromPersona: PersonaKey;               // 'design-consultant'
  toPersona: PersonaKey;                 // 'quote-specialist'
  summary: string;                       // Auto-generated from messages
  recentMessages: { role, content }[];   // Last 6 messages
  extractedData?: Record<string, unknown>;
  visualizationData?: {
    id: string;
    concepts: { id, imageUrl, description? }[];
    originalImageUrl: string;
    roomType: string;
    style: string;
  };
  designPreferences?: {
    roomType: string;
    customRoomType?: string;
    style: string;
    customStyle?: string;
    textPreferences: string;
    voicePreferencesSummary?: string;
  };
  timestamp: number;                     // TTL anchor
}
```

### What's Missing in the Handoff

| Data Available in Visualizer | Passed to Marcus? | Notes |
|-------|------|-------|
| Room type + style | Yes | In designPreferences |
| Text preferences | Yes | In designPreferences.textPreferences |
| Voice summary | Yes | In designPreferences.voicePreferencesSummary |
| Visualization concepts (URLs) | Yes | In visualizationData.concepts |
| **Photo analysis (dimensions, walls, zones)** | **No** | JSONB in DB but not in handoff |
| **Raw voice transcript** | **Partial** | Only last 6 messages |
| **Material preferences (structured)** | **No** | Lost after prompt construction |
| **Which concept user selected** | **No** | selectedConceptIndex not passed |
| **Structural constraints** | **No** | Available in photo analysis but not forwarded |
| **Generation cost** | **No** | In metrics table but not visible |

---

## 9. Marcus (Quote Specialist) Architecture

### Persona Definition

**File:** `src/lib/ai/personas/quote-specialist.ts`

```typescript
QUOTE_SPECIALIST_PERSONA = {
  name: 'Marcus',
  role: 'Budget & Cost Specialist',
  tagline: 'Your renovation numbers guy',
  personalityTraits: [
    'Detail-oriented and thorough with numbers',
    'Reassuring about costs — removes the anxiety of the unknown',
    'Patient with questions about pricing',
    'Honest about what things cost — no sugarcoating',
    'Uses "we" language to create partnership',
  ],
  capabilities: [
    'Provide detailed preliminary renovation estimates',
    'Analyze room photos to assess scope',
    'Break down costs by materials, labor, and HST',
    'Explain pricing tiers (economy, standard, premium)',
    'Guide through the full estimate intake process',
    'Collect contact info and submit lead requests',
  ],
  boundaries: [
    'Never make binding commitments on pricing — always preliminary',
    'Always present estimates as RANGE with ±15% variance',
    'Always include disclaimer about in-person assessment',
    'For design visualization, suggest Mia → /visualizer',
  ],
};
```

### Marcus's Conversation Flow

From `QUOTE_SPECIALIST_PROMPT_RULES`:

1. Greet warmly, invite photo or description
2. If photo: analyze room type, assess condition
3. Confirm project type, ask about goals
4. Ask about scope (full remodel vs. partial)
5. Inquire about material preferences / finish level
6. Ask about timeline
7. **Pricing readiness gate:** Do NOT give price until you know project type + (size OR finish level OR scope)
8. Collect contact information
9. Present preliminary estimate with disclaimers

### Pricing Confidence Gate

```
"I want to give you an accurate range, not a guess —
let me ask a couple quick questions first."
```

Marcus will NOT jump to pricing without at least:
- Project type (kitchen, bathroom, etc.)
- One of: room size, finish level (economy/standard/premium), or scope

### System Prompt Assembly

**File:** `src/lib/ai/personas/prompt-assembler.ts`

Marcus's prompt is assembled in 4 layers:

```
Layer 1: COMPANY_SUMMARY + SERVICES_KNOWLEDGE (full 13 categories)
Layer 2: PRICING_FULL + ONTARIO_BUDGET_KNOWLEDGE
Layer 3: SALES_TRAINING (yes-ladder, qualifying, objection handling)
Layer 4: Persona identity + personality + capabilities + boundaries + rules
```

**Dynamic knowledge injection:** If user message contains design keywords, Marcus gets `ONTARIO_DESIGN_KNOWLEDGE` injected dynamically.

### Visualization Handoff Processing

When Marcus receives a handoff from the visualizer (`prompt-assembler.ts:209-233`):

```typescript
if (options?.handoffContext && personaKey === 'quote-specialist') {
  // Extract designPreferences → Room + Style label
  // Extract visualizationData → Concept count + ID
  // Append as "## Handoff from Design Visualizer" section
}
```

### Knowledge Base Files

| File | Purpose | Content |
|------|---------|---------|
| `knowledge/pricing.ts` | `PRICING_FULL` + `PRICING_SUMMARY` | Price ranges by room type and finish level |
| `knowledge/services.ts` | `SERVICES_KNOWLEDGE` + `SERVICES_SUMMARY` | 13 service categories with descriptions |
| `knowledge/company.ts` | `COMPANY_PROFILE` + `COMPANY_SUMMARY` | Company info, certifications, team |
| `knowledge/ontario-renovation.ts` | Regional knowledge | `ONTARIO_GENERAL_KNOWLEDGE`, `ONTARIO_BUDGET_KNOWLEDGE`, `ONTARIO_DESIGN_KNOWLEDGE` |
| `knowledge/sales-techniques.ts` | `SALES_TRAINING` | Yes-ladder, qualifying questions, objection handling |

---

## 10. Mia (Design Consultant) → Marcus Handoff

### Mia's Role in the Visualizer

**File:** `src/lib/ai/personas/design-consultant.ts`

Mia appears in two contexts:
1. **Voice consultation** (preferences-section.tsx) — ElevenLabs voice call where Mia gathers design preferences
2. **Legacy chat** (visualizer-chat.tsx) — Text-based conversation mode (not used in streamlined flow)

```typescript
DESIGN_CONSULTANT_PERSONA = {
  name: 'Mia',
  role: 'Design Consultant',
  tagline: 'Your creative renovation partner',
  personalityTraits: [
    'Creative and visually descriptive — paints pictures with words',
    'Enthusiastic about design ideas — gets excited with the homeowner',
    'Knowledgeable about styles, materials, and current trends',
    'Encouraging — validates ideas and builds confidence',
    'Uses vivid, sensory language to describe possibilities',
  ],
  boundaries: [
    'For detailed cost breakdowns, suggest Marcus → /estimate',
    'Do NOT promise what final renovation will look like',
    'Focus on GATHERING design intent, not generating images',
    'After 3–4 exchanges, suggest moving to visualization generation',
  ],
};
```

### Voice Consultation Flow

```
User clicks "Talk to Mia"
  │
  ├── MicrophonePermissionDialog appears
  │   └── User clicks "Allow & Connect"
  │
  ├── VoiceProvider.startVoice('design-consultant')
  │   ├── Fetches signed WebSocket URL from /api/voice/signed-url
  │   └── Establishes ElevenLabs WebSocket connection
  │
  ├── Real-time conversation
  │   ├── User speaks → Whisper STT → text
  │   ├── Mia responds via ElevenLabs TTS
  │   └── Transcript entries accumulate (VoiceTranscriptEntry[])
  │
  ├── User ends call (or disconnects)
  │   └── Auto-detected via status change: 'connected' → 'disconnected'
  │
  ├── Auto-summarization
  │   ├── POST /api/ai/summarize-voice with transcript
  │   ├── Returns: { summary: string, extractedPreferences: VoiceExtractedPreferences }
  │   └── VoiceExtractedPreferences = {
  │         desiredChanges: string[],
  │         materialPreferences: string[],
  │         styleIndicators: string[],
  │         preservationNotes: string[]
  │       }
  │
  └── Summary displayed in PreferencesSection
      ├── "Mia captured your preferences:" card
      ├── Collapsible full transcript
      └── Optional additional text input
```

### Handoff Mechanism: Mia → Marcus

The handoff is NOT a direct agent-to-agent communication. It flows through `sessionStorage`:

```
Visualizer (Mia context)
  │
  ├── serializeHandoffContext() writes to sessionStorage
  │   Key: 'demo_handoff_context'
  │   Value: HandoffContext JSON
  │
  ├── Additional rich data stored separately:
  │   Key: 'demo_handoff_context' (overwritten with full data)
  │   Includes: designPreferences, visualizationData
  │
  └── Router navigates to /estimate?visualization={id}

Estimate page (Marcus context)
  │
  ├── readHandoffContext() reads from sessionStorage
  │   ├── Checks 15-minute TTL
  │   └── Returns HandoffContext or null
  │
  ├── buildHandoffPromptPrefix() generates Marcus context:
  │   "## Handoff Context
  │    The user was just speaking with Mia (the design consultant).
  │    Here's what was discussed: [summary]
  │
  │    ## Handoff from Design Visualizer
  │    Room: kitchen | Style: modern
  │    Text Preferences: "..."
  │    Voice Summary: "..."
  │    Visualization: 4 concepts generated (ID: ...)
  │
  │    Greet them warmly and acknowledge you know what they
  │    were discussing. Don't repeat everything — just show
  │    awareness and pick up where they left off."
  │
  └── Marcus's system prompt includes this prefix
```

### What Shared Context Looks Like

When handoff is complete, Marcus knows:
- That user came from Mia (the design consultant)
- Room type and design style selected
- Text preferences entered
- Voice consultation summary
- That concepts were generated and their IDs
- Recent conversation messages (last 6)

### Voice Agent Configuration

**File:** `src/lib/voice/config.ts`

Agent IDs are read from environment variables per-tenant:
```typescript
// Each tenant deployment can have different voice agent IDs
ELEVENLABS_AGENT_EMMA    → env var
ELEVENLABS_AGENT_MARCUS  → env var
ELEVENLABS_AGENT_MIA     → env var
```

Voice prompts use a compressed version of the full prompt (`buildVoiceSystemPrompt`):
- 1-2 sentences max per response
- ONE topic at a time
- No lists, no markdown — natural speech
- Verbal acknowledgments: "Got it", "Love that"
- Offer 2-3 concrete options when they're unsure

---

## 11. Visual Audit — Playwright Screenshots

38 screenshots captured from the live production deployment at `mccarty.norbotsystems.com/visualizer`.

All screenshots are saved in `VISUALIZER_SCREENSHOTS/` relative to the project root.

### Screenshot Inventory

#### Landing Page (Initial State)

| File | Viewport | Description |
|------|----------|-------------|
| `01-landing-desktop.png` | 1280×800 | Full landing with hero, upload zone, tips, stats bar |
| `01-landing-mobile.png` | 375×812 | Mobile responsive layout |
| `02-hero-section-desktop.png` | 1280×800 | "Visualize Your Dream Space" hero |
| `03-upload-area-desktop.png` | 1280×800 | Upload zone with drag/drop, file limits, tips |
| `04-stats-bar-desktop.png` | 1280×800 | Trust indicators: Free, ~30 sec, Private |

#### After Photo Upload (Room & Style Selection)

| File | Viewport | Description |
|------|----------|-------------|
| `05-after-upload-desktop.png` | 1280×800 | Full page: preview + room types + style cards |
| `05-after-upload-mobile.png` | 375×812 | Mobile 2-column grid layout |
| `05a-uploaded-preview-desktop.png` | 1280×800 | Photo preview with "Change photo" |
| `06-room-type-selection-desktop.png` | 1280×800 | 8 room type cards with icons |
| `06-room-type-selection-mobile.png` | 375×812 | Mobile 2-column room types |
| `07-style-selection-desktop.png` | 1280×800 | 7 style cards with AI preview images |
| `07-style-selection-mobile.png` | 375×812 | Mobile 2-column styles |
| `08-room-type-kitchen-selected-desktop.png` | 1280×800 | Kitchen selected (red border + highlight) |

#### Ready to Generate (Room + Style Selected)

| File | Viewport | Description |
|------|----------|-------------|
| `09-ready-to-generate-desktop.png` | 1280×800 | Full page with Kitchen + Modern selected, preferences section, summary, generate CTA |
| `09-ready-to-generate-mobile.png` | 375×812 | Mobile ready-to-generate state |
| `10-vision-input-options-desktop.png` | 1280×800 | "Type your vision" / "Talk to Mia" equal-prominence cards |

#### Text Input Mode

| File | Viewport | Description |
|------|----------|-------------|
| `13-text-input-desktop.png` | 1280×800 | Empty textarea with placeholder examples |
| `14-text-input-filled-desktop.png` | 1280×800 | Filled: "White marble countertops..." (89/500 chars) |
| `14-text-input-filled-mobile.png` | 375×812 | Mobile filled text input |

#### Voice Consultation (Talk to Mia)

| File | Viewport | Description |
|------|----------|-------------|
| `15-talk-to-mia-desktop.png` | 1280×800 | Mia consultation card with purple avatar, "Talk to Mia" button |
| `15-talk-to-mia-mobile.png` | 375×812 | Mobile Mia consultation card |
| `16-mia-microphone-dialog-desktop.png` | 1280×800 | Microphone permission dialog overlay |
| `16-mia-microphone-dialog-mobile.png` | 375×812 | Mobile permission dialog (buttons stacked) |
| `16a-mia-dialog-closeup-desktop.png` | 1280×800 | Close-up of permission dialog |

#### Selection Summary & Generate CTA

| File | Viewport | Description |
|------|----------|-------------|
| `11-selection-summary-desktop.png` | 1280×800 | "Your Selection" card: Room + Style |
| `17-selection-summary-with-desc-desktop.png` | 1280×800 | Summary with typed description in quotes |
| `12-generate-button-desktop.png` | 1280×800 | Red "Generate My Vision" CTA with sparkle icon |

#### Generation Progress

| File | Viewport | Description |
|------|----------|-------------|
| `18-generating-progress-desktop.png` | 1280×800 | Bottom of progress state: loading dots, cancel |
| `18-generating-fullpage-desktop.png` | 1280×800 | Full generation: sparkle at 81%, progress bar, tips, cancel |

#### Results (AI-Generated Concepts)

| File | Viewport | Description |
|------|----------|-------------|
| `19-results-ready-desktop.png` | 1280×800 | Full results: header, slider, thumbnails, CTA, actions |
| `19-results-ready-mobile.png` | 375×812 | Mobile results with sticky bottom CTA |
| `20-vision-ready-header-desktop.png` | 1280×800 | "Your Vision is Ready!" with "Generated in 43s" |
| `21-before-after-slider-desktop.png` | 1280×800 | Before/after slider: original vs modern kitchen render |
| `22-concept-thumbnails-desktop.png` | 1280×800 | 4 concept thumbnails with selection state |
| `22-concept-thumbnails-mobile.png` | 375×812 | Mobile horizontal scroll thumbnails |
| `23-action-buttons-desktop.png` | 1280×800 | "Get a Quote", download, share buttons |
| `24-concept2-comparison-desktop.png` | 1280×800 | Concept 2 selected: grey cabinets, marble island |

#### Mobile Navigation

| File | Viewport | Description |
|------|----------|-------------|
| `25-mobile-nav-menu.png` | 375×812 | Hamburger menu: Home, Services, Projects, About, Admin |
| `26-sticky-cta-mobile.png` | 375×812 | Sticky "Get a Quote" button on mobile results |

### States Not Captured

- Active voice conversation with Mia (requires real microphone + ElevenLabs)
- Share modal/dialog (would require clicking share button)
- `/estimate` page after handoff (separate page)
- Error states (network failure, unsupported format)
- Email capture modal (requires download click)

---

## Appendix: Key File Index

### Entry Points
| File | Purpose |
|------|---------|
| `src/app/visualizer/page.tsx` | Page entry, metadata, hero, layout |
| `src/app/api/ai/visualize/route.ts` | Main generation API (POST, maxDuration: 120s) |
| `src/app/api/ai/visualizer-chat/route.ts` | Mia's chat endpoint (legacy mode) |
| `src/app/api/ai/summarize-voice/route.ts` | Post-call voice summarization |
| `src/app/api/voice/signed-url/route.ts` | ElevenLabs WebSocket URL generator |
| `src/app/api/visualizations/route.ts` | Save/share visualization |

### AI Pipeline
| File | Purpose |
|------|---------|
| `src/lib/ai/config.ts` | Model constants (gpt-5.2, gemini-3-pro) |
| `src/lib/ai/gemini.ts` | Gemini provider, VISUALIZATION_CONFIG, `generateImageWithGemini()` |
| `src/lib/ai/visualization.ts` | `generateVisualizationConcept()`, retry logic |
| `src/lib/ai/prompt-builder.ts` | 6-part `buildRenovationPrompt()`, style/room details |
| `src/lib/ai/photo-analyzer.ts` | `analyzeRoomPhotoForVisualization()`, 18-field schema |
| `src/lib/ai/validation.ts` | Structure preservation validation (GPT Vision) |
| `src/lib/ai/depth-estimation.ts` | Replicate depth maps (DISABLED) |
| `src/lib/ai/edge-detection.ts` | Sharp edge extraction (enabled) |

### Personas & Knowledge
| File | Purpose |
|------|---------|
| `src/lib/ai/personas/quote-specialist.ts` | Marcus persona + rules |
| `src/lib/ai/personas/design-consultant.ts` | Mia persona + rules |
| `src/lib/ai/personas/receptionist.ts` | Emma persona |
| `src/lib/ai/personas/prompt-assembler.ts` | 4-layer prompt builder + dynamic knowledge |
| `src/lib/ai/personas/types.ts` | `PersonaKey`, `AgentPersona` types |
| `src/lib/ai/knowledge/pricing.ts` | Pricing ranges by room/finish |
| `src/lib/ai/knowledge/services.ts` | 13 service categories |
| `src/lib/ai/knowledge/company.ts` | Company profile |
| `src/lib/ai/knowledge/ontario-renovation.ts` | Regional knowledge |
| `src/lib/ai/knowledge/sales-techniques.ts` | Sales training prompts |

### Schemas & Types
| File | Purpose |
|------|---------|
| `src/lib/schemas/visualization.ts` | Core types: RoomType, DesignStyle, VisualizationResponse |
| `src/lib/schemas/design-preferences.ts` | DesignPreferences, mergeDesignIntent() |
| `src/lib/schemas/visualizer-extraction.ts` | DesignIntent extraction schema |

### Data Flow
| File | Purpose |
|------|---------|
| `src/lib/chat/handoff.ts` | HandoffContext, sessionStorage serialization, 15-min TTL |
| `src/lib/db/site.ts` | `getSiteId()`, `withSiteId()` multi-tenancy |
| `src/lib/db/server.ts` | Supabase client helpers |
| `src/lib/utils/image.ts` | Compression, HEIC conversion, base64 encoding |

### Database Migrations
| File | Purpose |
|------|---------|
| `supabase/migrations/20260201000000_visualizations_table.sql` | Base visualizations table |
| `supabase/migrations/20260203000001_visualizations_storage.sql` | Storage bucket + policies |
| `supabase/migrations/20260206000000_enhanced_visualizations.sql` | Enhanced columns + junction table |
| `supabase/migrations/20260207000000_visualization_metrics.sql` | Metrics table + views + functions |
