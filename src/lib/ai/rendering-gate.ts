/**
 * Rendering Readiness Gate
 * Determines when enough design-relevant context has accumulated during
 * the estimate conversation to warrant re-generating the starred concept.
 *
 * Scoring model:
 * | Signal Category             | Points |
 * |-----------------------------|--------|
 * | Material preference         | +25    |
 * | Structural change           | +25    |
 * | Finish / colour preference  | +15    |
 * | Budget / finish level       | +15    |
 * | Room dimensions confirmed   | +10    |
 * | Scope clarified             | +10    |
 *
 * Threshold: 50 points — requires at least 2 substantive design signals.
 * Cooldown: 30 seconds between refinements.
 * Cap: 3 refinements per session.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type SignalCategory =
  | 'material'
  | 'structural'
  | 'finish'
  | 'budget'
  | 'dimensions'
  | 'scope';

export interface DesignSignal {
  category: SignalCategory;
  /** Human-readable detail, e.g. "quartz countertops" */
  detail: string;
  points: number;
}

export interface RenderingReadiness {
  score: number;
  isReady: boolean;
  /** Deduplicated signals that contributed to the score */
  signals: DesignSignal[];
}

// ── Configuration ────────────────────────────────────────────────────────────

export const RENDERING_CONFIG = {
  /** Minimum score to trigger a refinement */
  readinessThreshold: 50,
  /** Maximum refinements per session */
  maxRefinements: 3,
  /** Minimum gap between refinements (ms) */
  cooldownMs: 30_000,
} as const;

// ── Keyword maps ─────────────────────────────────────────────────────────────
// Keys are lowercase phrases to match; values are human-readable descriptions.

const MATERIAL_KEYWORDS = new Map<string, string>([
  ['quartz', 'quartz countertops'],
  ['marble', 'marble surfaces'],
  ['granite', 'granite countertops'],
  ['porcelain', 'porcelain tile'],
  ['ceramic', 'ceramic tile'],
  ['hardwood', 'hardwood flooring'],
  ['vinyl plank', 'vinyl plank flooring'],
  ['laminate', 'laminate flooring'],
  ['subway tile', 'subway tile'],
  ['mosaic', 'mosaic tile'],
  ['butcher block', 'butcher block countertop'],
  ['stainless steel', 'stainless steel appliances'],
  ['brass hardware', 'brass hardware'],
  ['matte black hardware', 'matte black hardware'],
  ['chrome hardware', 'chrome hardware'],
  ['brushed nickel', 'brushed nickel hardware'],
  ['concrete countertop', 'concrete countertop'],
  ['soapstone', 'soapstone countertop'],
  ['terrazzo', 'terrazzo surfaces'],
  ['shiplap', 'shiplap walls'],
  ['wainscoting', 'wainscoting panels'],
  ['backsplash', 'backsplash tile'],
  ['penny tile', 'penny tile'],
  ['herringbone', 'herringbone pattern'],
  ['chevron', 'chevron pattern'],
]);

const STRUCTURAL_KEYWORDS = new Map<string, string>([
  ['knock down wall', 'remove wall'],
  ['knock down the wall', 'remove wall'],
  ['remove wall', 'remove wall'],
  ['tear down wall', 'remove wall'],
  ['open concept', 'open concept layout'],
  ['open floor plan', 'open concept layout'],
  ['add island', 'add kitchen island'],
  ['kitchen island', 'add kitchen island'],
  ['remove tub', 'remove bathtub'],
  ['remove the tub', 'remove bathtub'],
  ['walk-in shower', 'walk-in shower conversion'],
  ['walk in shower', 'walk-in shower conversion'],
  ['extend the room', 'room extension'],
  ['enlarge', 'enlarge the space'],
  ['move plumbing', 'plumbing relocation'],
  ['reconfigure layout', 'layout reconfiguration'],
  ['reconfigure the layout', 'layout reconfiguration'],
  ['add window', 'add window'],
  ['skylight', 'add skylight'],
  ['built-in shelving', 'built-in shelving'],
  ['built in shelving', 'built-in shelving'],
  ['half wall', 'half wall'],
  ['peninsula', 'peninsula counter'],
  ['breakfast bar', 'breakfast bar'],
  ['double vanity', 'double vanity'],
]);

const FINISH_KEYWORDS = new Map<string, string>([
  ['white cabinets', 'white cabinetry'],
  ['dark cabinets', 'dark cabinetry'],
  ['light wood', 'light wood finish'],
  ['dark wood', 'dark wood finish'],
  ['natural wood', 'natural wood finish'],
  ['painted cabinets', 'painted cabinetry'],
  ['stained', 'stained finish'],
  ['matte finish', 'matte finish'],
  ['glossy', 'glossy finish'],
  ['high gloss', 'high gloss finish'],
  ['satin', 'satin finish'],
  ['rustic', 'rustic aesthetic'],
  ['minimalist', 'minimalist aesthetic'],
  ['warm tones', 'warm colour tones'],
  ['cool tones', 'cool colour tones'],
  ['navy', 'navy blue accents'],
  ['sage green', 'sage green accents'],
  ['charcoal', 'charcoal accents'],
  ['gold accents', 'gold accent details'],
  ['black accents', 'black accent details'],
  ['two-tone', 'two-tone cabinetry'],
]);

const BUDGET_PATTERNS = [
  /\$\s*[\d,]+/,
  /\b(\d+)\s*k\b/i,
  /\b(\d+)\s*thousand\b/i,
  /budget\s+(?:is|of|around|about)/i,
  /spend\s+(?:around|about|up to)/i,
  /afford/i,
  /price range/i,
  /investment\s+of/i,
];

const DIMENSION_PATTERNS = [
  /\b(\d+)\s*(?:sq\.?\s*(?:ft|feet)|square\s*feet|sqft)\b/i,
  /\b(\d+)\s*(?:by|x)\s*(\d+)\s*(?:feet|ft)?\b/i,
  /\b(\d+)\s*(?:linear|lin\.?)\s*(?:feet|ft)\b/i,
];

const SCOPE_KEYWORDS = [
  'full renovation',
  'full remodel',
  'gut renovation',
  'gut job',
  'complete overhaul',
  'just the countertops',
  'just the cabinets',
  'just the flooring',
  'partial renovation',
  'cosmetic update',
  'refresh',
  'face-lift',
  'facelift',
];

// ── Signal Extraction ────────────────────────────────────────────────────────

/**
 * Extract design-relevant signals from a user message.
 * Only analyses user messages — assistant messages are excluded by the caller.
 */
export function extractDesignSignals(message: string): DesignSignal[] {
  const lower = message.toLowerCase();
  const signals: DesignSignal[] = [];

  // Materials (+25 each, deduplicated by detail)
  for (const [keyword, detail] of MATERIAL_KEYWORDS) {
    if (lower.includes(keyword)) {
      signals.push({ category: 'material', detail, points: 25 });
    }
  }

  // Structural changes (+25 each)
  for (const [keyword, detail] of STRUCTURAL_KEYWORDS) {
    if (lower.includes(keyword)) {
      signals.push({ category: 'structural', detail, points: 25 });
    }
  }

  // Finish / colour preferences (+15 each)
  for (const [keyword, detail] of FINISH_KEYWORDS) {
    if (lower.includes(keyword)) {
      signals.push({ category: 'finish', detail, points: 15 });
    }
  }

  // Budget mentions (+15, once)
  for (const pattern of BUDGET_PATTERNS) {
    if (pattern.test(lower)) {
      const amountMatch = message.match(/\$\s*([\d,]+)/);
      const detail = amountMatch ? `budget ~$${amountMatch[1]}` : 'budget discussed';
      signals.push({ category: 'budget', detail, points: 15 });
      break; // Only count budget once per message
    }
  }

  // Dimensions (+10, once)
  for (const pattern of DIMENSION_PATTERNS) {
    if (pattern.test(lower)) {
      signals.push({ category: 'dimensions', detail: 'room dimensions confirmed', points: 10 });
      break;
    }
  }

  // Scope clarity (+10, once)
  for (const keyword of SCOPE_KEYWORDS) {
    if (lower.includes(keyword)) {
      signals.push({ category: 'scope', detail: keyword, points: 10 });
      break;
    }
  }

  return signals;
}

// ── Readiness Calculation ────────────────────────────────────────────────────

/**
 * Deduplicate signals by category + detail.
 * If the same detail appears multiple times, keep only the first.
 */
function deduplicateSignals(signals: DesignSignal[]): DesignSignal[] {
  const seen = new Set<string>();
  const result: DesignSignal[] = [];

  for (const signal of signals) {
    const key = `${signal.category}:${signal.detail}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(signal);
    }
  }

  return result;
}

/**
 * Calculate rendering readiness from accumulated signals.
 */
export function calculateRenderingReadiness(
  accumulatedSignals: DesignSignal[],
  refinementCount: number,
  lastRefinementTime: number | null,
): RenderingReadiness {
  // Deduplicate — same material mentioned twice counts once
  const signals = deduplicateSignals(accumulatedSignals);
  const score = signals.reduce((sum, s) => sum + s.points, 0);

  // Check all conditions
  const aboveThreshold = score >= RENDERING_CONFIG.readinessThreshold;
  const belowCap = refinementCount < RENDERING_CONFIG.maxRefinements;
  const cooldownElapsed =
    lastRefinementTime === null ||
    Date.now() - lastRefinementTime >= RENDERING_CONFIG.cooldownMs;

  return {
    score,
    isReady: aboveThreshold && belowCap && cooldownElapsed,
    signals,
  };
}

/**
 * Build a human-readable summary of the signals for display.
 * e.g. "quartz countertops, open concept layout"
 */
export function buildSignalSummary(signals: DesignSignal[]): string {
  const unique = deduplicateSignals(signals);
  return unique.map((s) => s.detail).join(', ');
}
