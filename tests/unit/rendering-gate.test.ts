import { describe, it, expect } from 'vitest';
import {
  extractDesignSignals,
  calculateRenderingReadiness,
  buildSignalSummary,
  RENDERING_CONFIG,
  type DesignSignal,
} from '@/lib/ai/rendering-gate';

describe('extractDesignSignals', () => {
  // ── Material detection ─────────────────────────────────────────────────

  it('detects quartz countertop mention', () => {
    const signals = extractDesignSignals('I want quartz countertops');
    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'material', detail: 'quartz countertops', points: 25 }),
      ]),
    );
  });

  it('detects multiple materials in one message', () => {
    const signals = extractDesignSignals('I love the look of marble with brass hardware');
    const materials = signals.filter((s) => s.category === 'material');
    expect(materials.length).toBeGreaterThanOrEqual(2);
    expect(materials.map((m) => m.detail)).toEqual(
      expect.arrayContaining(['marble surfaces', 'brass hardware']),
    );
  });

  it('detects subway tile', () => {
    const signals = extractDesignSignals('Can we do a subway tile backsplash?');
    const details = signals.map((s) => s.detail);
    expect(details).toContain('subway tile');
  });

  it('detects herringbone pattern', () => {
    const signals = extractDesignSignals('I love herringbone floors');
    expect(signals.some((s) => s.detail === 'herringbone pattern')).toBe(true);
  });

  it('is case-insensitive', () => {
    const signals = extractDesignSignals('QUARTZ countertops with BRASS HARDWARE');
    const details = signals.map((s) => s.detail);
    expect(details).toContain('quartz countertops');
    expect(details).toContain('brass hardware');
  });

  // ── Structural detection ───────────────────────────────────────────────

  it('detects "knock down the wall"', () => {
    const signals = extractDesignSignals('We want to knock down the wall between the kitchen and dining room');
    expect(signals.some((s) => s.category === 'structural' && s.detail === 'remove wall')).toBe(true);
  });

  it('detects "open concept"', () => {
    const signals = extractDesignSignals('We want an open concept layout');
    expect(signals.some((s) => s.category === 'structural' && s.detail === 'open concept layout')).toBe(true);
  });

  it('detects "add island"', () => {
    const signals = extractDesignSignals("We'd like to add island space for prep work");
    expect(signals.some((s) => s.detail === 'add kitchen island')).toBe(true);
  });

  it('detects walk-in shower', () => {
    const signals = extractDesignSignals('Replace the tub with a walk-in shower');
    expect(signals.some((s) => s.detail === 'walk-in shower conversion')).toBe(true);
  });

  it('detects double vanity', () => {
    const signals = extractDesignSignals('We need a double vanity in the master bath');
    expect(signals.some((s) => s.detail === 'double vanity')).toBe(true);
  });

  // ── Finish / colour detection ──────────────────────────────────────────

  it('detects "white cabinets"', () => {
    const signals = extractDesignSignals('I want white cabinets throughout');
    expect(signals.some((s) => s.category === 'finish' && s.detail === 'white cabinetry')).toBe(true);
  });

  it('detects "matte black hardware"', () => {
    const signals = extractDesignSignals('All the hardware should be matte black hardware');
    expect(signals.some((s) => s.detail === 'matte black hardware')).toBe(true);
  });

  it('detects warm tones', () => {
    const signals = extractDesignSignals('I prefer warm tones for the overall feel');
    expect(signals.some((s) => s.detail === 'warm colour tones')).toBe(true);
  });

  it('detects two-tone cabinets', () => {
    const signals = extractDesignSignals('Thinking about two-tone cabinets');
    expect(signals.some((s) => s.detail === 'two-tone cabinetry')).toBe(true);
  });

  // ── Budget detection ───────────────────────────────────────────────────

  it('detects "$40,000 budget"', () => {
    const signals = extractDesignSignals('Our budget is about $40,000');
    expect(signals.some((s) => s.category === 'budget')).toBe(true);
    expect(signals.find((s) => s.category === 'budget')?.detail).toContain('$40,000');
  });

  it('detects "spend around 40k"', () => {
    const signals = extractDesignSignals('We want to spend around 40k');
    expect(signals.some((s) => s.category === 'budget')).toBe(true);
  });

  it('detects "can afford" mention', () => {
    const signals = extractDesignSignals("We can afford to invest more in the kitchen");
    expect(signals.some((s) => s.category === 'budget')).toBe(true);
  });

  it('only counts budget once per message', () => {
    const signals = extractDesignSignals('Our budget is $40,000 but we could spend up to $50,000');
    const budgetSignals = signals.filter((s) => s.category === 'budget');
    expect(budgetSignals.length).toBe(1);
  });

  // ── Dimensions detection ───────────────────────────────────────────────

  it('detects "200 sq ft"', () => {
    const signals = extractDesignSignals('The kitchen is about 200 sq ft');
    expect(signals.some((s) => s.category === 'dimensions')).toBe(true);
  });

  it('detects "12 by 15 feet"', () => {
    const signals = extractDesignSignals("It's roughly 12 by 15 feet");
    expect(signals.some((s) => s.category === 'dimensions')).toBe(true);
  });

  // ── Scope detection ────────────────────────────────────────────────────

  it('detects "full renovation"', () => {
    const signals = extractDesignSignals('We want a full renovation of the kitchen');
    expect(signals.some((s) => s.category === 'scope' && s.detail === 'full renovation')).toBe(true);
  });

  it('detects "just the countertops"', () => {
    const signals = extractDesignSignals('We just want to update just the countertops');
    expect(signals.some((s) => s.category === 'scope')).toBe(true);
  });

  it('detects "cosmetic update"', () => {
    const signals = extractDesignSignals('More of a cosmetic update, nothing structural');
    expect(signals.some((s) => s.category === 'scope')).toBe(true);
  });

  // ── No false positives ─────────────────────────────────────────────────

  it('returns empty for generic chat ("sounds good")', () => {
    const signals = extractDesignSignals('Sounds good, thanks!');
    expect(signals).toHaveLength(0);
  });

  it('returns empty for "hello"', () => {
    const signals = extractDesignSignals('Hello, how are you?');
    expect(signals).toHaveLength(0);
  });

  it('returns empty for assistant-style pricing questions', () => {
    // The function itself doesn't filter by role, that's the caller's job.
    // But these generic phrases shouldn't match keywords either.
    const signals = extractDesignSignals('What is your timeline for the project?');
    // "timeline" is NOT in any keyword map, so should be empty
    expect(signals).toHaveLength(0);
  });

  it('does not trigger on "what materials do you recommend"', () => {
    const signals = extractDesignSignals('What materials do you recommend?');
    // "materials" alone is not a specific material keyword
    expect(signals).toHaveLength(0);
  });

  // ── Combined signals ───────────────────────────────────────────────────

  it('detects material + structural in one message', () => {
    const signals = extractDesignSignals('I want white cabinets and to knock down the wall for open concept');
    const categories = new Set(signals.map((s) => s.category));
    expect(categories.has('material')).toBe(false); // "white cabinets" matches finish, not material
    expect(categories.has('finish')).toBe(true);
    expect(categories.has('structural')).toBe(true);
  });
});

describe('calculateRenderingReadiness', () => {
  const makeSignal = (category: DesignSignal['category'], detail: string): DesignSignal => ({
    category,
    detail,
    points: category === 'material' ? 25 : category === 'structural' ? 25 : category === 'finish' ? 15 : category === 'budget' ? 15 : 10,
  });

  it('returns not ready below threshold', () => {
    const signals = [makeSignal('finish', 'white cabinetry')]; // 15 points
    const result = calculateRenderingReadiness(signals, 0, null);
    expect(result.isReady).toBe(false);
    expect(result.score).toBe(15);
  });

  it('returns ready at exactly threshold (50 points)', () => {
    const signals = [
      makeSignal('material', 'quartz countertops'), // 25
      makeSignal('structural', 'open concept layout'), // 25
    ];
    const result = calculateRenderingReadiness(signals, 0, null);
    expect(result.isReady).toBe(true);
    expect(result.score).toBe(50);
  });

  it('returns not ready when max refinements reached', () => {
    const signals = [
      makeSignal('material', 'quartz countertops'),
      makeSignal('structural', 'open concept layout'),
    ];
    const result = calculateRenderingReadiness(signals, RENDERING_CONFIG.maxRefinements, null);
    expect(result.isReady).toBe(false);
  });

  it('returns not ready during cooldown period', () => {
    const signals = [
      makeSignal('material', 'quartz countertops'),
      makeSignal('structural', 'open concept layout'),
    ];
    const result = calculateRenderingReadiness(signals, 1, Date.now() - 5000); // 5s ago, cooldown is 30s
    expect(result.isReady).toBe(false);
  });

  it('returns ready after cooldown elapsed', () => {
    const signals = [
      makeSignal('material', 'quartz countertops'),
      makeSignal('structural', 'open concept layout'),
    ];
    const result = calculateRenderingReadiness(signals, 1, Date.now() - 35000); // 35s ago, cooldown is 30s
    expect(result.isReady).toBe(true);
  });

  it('deduplicates same signal mentioned twice', () => {
    const signals = [
      makeSignal('material', 'quartz countertops'),
      makeSignal('material', 'quartz countertops'), // Duplicate
      makeSignal('structural', 'open concept layout'),
    ];
    const result = calculateRenderingReadiness(signals, 0, null);
    expect(result.score).toBe(50); // Not 75
    expect(result.signals).toHaveLength(2);
  });

  it('material + finish = not ready (25+15=40)', () => {
    const signals = [
      makeSignal('material', 'quartz countertops'),
      makeSignal('finish', 'white cabinetry'),
    ];
    const result = calculateRenderingReadiness(signals, 0, null);
    expect(result.isReady).toBe(false);
    expect(result.score).toBe(40);
  });

  it('material + finish + budget = ready (25+15+15=55)', () => {
    const signals = [
      makeSignal('material', 'quartz countertops'),
      makeSignal('finish', 'white cabinetry'),
      makeSignal('budget', 'budget ~$40,000'),
    ];
    const result = calculateRenderingReadiness(signals, 0, null);
    expect(result.isReady).toBe(true);
    expect(result.score).toBe(55);
  });

  it('structural + structural = ready (25+25=50)', () => {
    const signals = [
      makeSignal('structural', 'open concept layout'),
      makeSignal('structural', 'add kitchen island'),
    ];
    const result = calculateRenderingReadiness(signals, 0, null);
    expect(result.isReady).toBe(true);
    expect(result.score).toBe(50);
  });

  it('returns empty signals when no input', () => {
    const result = calculateRenderingReadiness([], 0, null);
    expect(result.score).toBe(0);
    expect(result.isReady).toBe(false);
    expect(result.signals).toHaveLength(0);
  });
});

describe('buildSignalSummary', () => {
  it('builds comma-separated summary', () => {
    const signals: DesignSignal[] = [
      { category: 'material', detail: 'quartz countertops', points: 25 },
      { category: 'structural', detail: 'open concept layout', points: 25 },
    ];
    expect(buildSignalSummary(signals)).toBe('quartz countertops, open concept layout');
  });

  it('deduplicates before summarising', () => {
    const signals: DesignSignal[] = [
      { category: 'material', detail: 'quartz countertops', points: 25 },
      { category: 'material', detail: 'quartz countertops', points: 25 },
    ];
    expect(buildSignalSummary(signals)).toBe('quartz countertops');
  });

  it('returns empty string for no signals', () => {
    expect(buildSignalSummary([])).toBe('');
  });
});
