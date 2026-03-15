/**
 * Timeline Estimator
 * Estimates renovation project timeline by phase, using scope of work,
 * labour estimates, and permit requirements.
 *
 * Pure function — no API calls, no async.
 * Uses standard Ontario renovation phase sequencing.
 */

import type { ScopeOfWork } from './scope-of-work-analysis';
import type { TradeLabourEstimate } from './trade-labour-estimator';
import type { PermitRequirement } from './knowledge/ontario-permit-rules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelineEstimate {
  /** Total project duration range in business days */
  totalDays: { low: number; high: number };
  /** Ordered phases with durations */
  phases: TimelinePhase[];
  /** Phases on the critical path (longest sequential chain) */
  criticalPath: string[];
  /** Phases that can run simultaneously */
  parallelOpportunities: string[];
}

export interface TimelinePhase {
  /** Phase name */
  name: string;
  /** Duration range in business days (low estimate) */
  daysLow: number;
  /** Duration range in business days (high estimate) */
  daysHigh: number;
  /** Trades involved in this phase */
  trades: string[];
  /** Phases that must complete before this one starts */
  dependsOn: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hours per business day (8-hour workday) */
const HOURS_PER_DAY = 8;

/** Minimum days for any phase that has work */
const MIN_PHASE_DAYS = 0.5;

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

/**
 * Estimate the project timeline from scope, labour, and permit data.
 *
 * Follows standard Ontario renovation phase sequencing:
 * 1. Demolition
 * 2. Structural work
 * 3. Rough-in (plumbing, electrical, HVAC — can run in parallel)
 * 4. Permit inspections (if required)
 * 5. Insulation + drywall
 * 6. Tile + flooring
 * 7. Cabinetry + countertops
 * 8. Paint
 * 9. Fixtures + hardware + appliances
 * 10. Final touches + cleanup
 */
export function estimateTimeline(
  scope: ScopeOfWork,
  labour: TradeLabourEstimate[],
  permits: PermitRequirement[],
): TimelineEstimate {
  const tradeHours = buildTradeHoursMap(labour);
  const phases = buildPhases(scope, tradeHours, permits);

  // Filter out zero-duration phases
  const activePhases = phases.filter((p) => p.daysLow > 0 || p.daysHigh > 0);

  // Calculate critical path (longest sequential chain)
  const criticalPath = computeCriticalPath(activePhases);

  // Identify parallel opportunities
  const parallelOpportunities = findParallelOpportunities(activePhases);

  // Calculate total days
  const totalDays = computeTotalDays(activePhases);

  return {
    totalDays,
    phases: activePhases,
    criticalPath,
    parallelOpportunities,
  };
}

// ---------------------------------------------------------------------------
// Phase Construction
// ---------------------------------------------------------------------------

function buildPhases(
  scope: ScopeOfWork,
  tradeHours: Map<string, { low: number; high: number }>,
  permits: PermitRequirement[],
): TimelinePhase[] {
  const phases: TimelinePhase[] = [];

  // Phase 1: Demolition
  const demoHours = getTradeHours(tradeHours, 'Demolition');
  const generalHours = getTradeHours(tradeHours, 'General Labourer');
  const demoTotalLow = (demoHours.low + generalHours.low * 0.3);
  const demoTotalHigh = (demoHours.high + generalHours.high * 0.3);
  if (scope.demolition.length > 0) {
    phases.push({
      name: 'Demolition',
      daysLow: hoursToDay(demoTotalLow),
      daysHigh: hoursToDay(demoTotalHigh),
      trades: uniqueTrades(scope.demolition.map((d) => d.trade)),
      dependsOn: [],
    });
  }

  // Phase 2: Structural work
  if (scope.structural.length > 0) {
    const roughCarpHours = getTradeHours(tradeHours, 'Carpenter (Rough)');
    phases.push({
      name: 'Structural Work',
      daysLow: Math.max(hoursToDay(roughCarpHours.low), 1),
      daysHigh: Math.max(hoursToDay(roughCarpHours.high), 3),
      trades: ['Carpenter (Rough)', 'General Labourer'],
      dependsOn: scope.demolition.length > 0 ? ['Demolition'] : [],
    });
  }

  // Phase 3: Rough-in (plumbing, electrical, HVAC — parallel)
  const roughInDeps = scope.structural.length > 0
    ? ['Structural Work']
    : scope.demolition.length > 0
      ? ['Demolition']
      : [];

  const plumbHours = getTradeHours(tradeHours, 'Plumber');
  const elecHours = getTradeHours(tradeHours, 'Electrician');
  const hvacHours = getTradeHours(tradeHours, 'HVAC Technician');

  const hasRoughIn = plumbHours.high > 0 || elecHours.high > 0 || hvacHours.high > 0;

  if (hasRoughIn) {
    // Rough-in trades can work in parallel — duration is max, not sum
    const roughInTrades: string[] = [];
    if (plumbHours.high > 0) roughInTrades.push('Plumber');
    if (elecHours.high > 0) roughInTrades.push('Electrician');
    if (hvacHours.high > 0) roughInTrades.push('HVAC Technician');

    const roughInLow = Math.max(
      hoursToDay(plumbHours.low),
      hoursToDay(elecHours.low),
      hoursToDay(hvacHours.low),
      MIN_PHASE_DAYS,
    );
    const roughInHigh = Math.max(
      hoursToDay(plumbHours.high),
      hoursToDay(elecHours.high),
      hoursToDay(hvacHours.high),
    );

    phases.push({
      name: 'Rough-In',
      daysLow: roughInLow,
      daysHigh: roughInHigh,
      trades: roughInTrades,
      dependsOn: roughInDeps,
    });
  }

  // Phase 4: Permit inspections (if any permits required)
  if (permits.length > 0) {
    const totalInspections = permits.reduce((sum, p) => sum + p.inspectionsRequired, 0);
    const maxWait = Math.max(...permits.map((p) => p.typicalWaitDays));

    phases.push({
      name: 'Permit Inspections',
      daysLow: Math.max(2, Math.ceil(maxWait * 0.5)),
      daysHigh: maxWait + totalInspections,
      trades: [],
      dependsOn: hasRoughIn ? ['Rough-In'] : roughInDeps,
    });
  }

  // Phase 5: Insulation + Drywall
  const drywallHours = getTradeHours(tradeHours, 'Drywall Installer');
  if (drywallHours.high > 0) {
    const drywallDeps = permits.length > 0
      ? ['Permit Inspections']
      : hasRoughIn
        ? ['Rough-In']
        : roughInDeps;

    phases.push({
      name: 'Insulation + Drywall',
      daysLow: hoursToDay(drywallHours.low),
      daysHigh: hoursToDay(drywallHours.high),
      trades: ['Drywall Installer'],
      dependsOn: drywallDeps,
    });
  }

  // Phase 6: Tile + Flooring (can partially parallel in different areas)
  const tileHours = getTradeHours(tradeHours, 'Tile Setter');
  const floorHours = getTradeHours(tradeHours, 'Flooring Installer');
  const hasFloorWork = tileHours.high > 0 || floorHours.high > 0;

  if (hasFloorWork) {
    const floorTrades: string[] = [];
    if (tileHours.high > 0) floorTrades.push('Tile Setter');
    if (floorHours.high > 0) floorTrades.push('Flooring Installer');

    const prevPhase = drywallHours.high > 0
      ? 'Insulation + Drywall'
      : permits.length > 0
        ? 'Permit Inspections'
        : hasRoughIn
          ? 'Rough-In'
          : scope.demolition.length > 0
            ? 'Demolition'
            : undefined;

    phases.push({
      name: 'Tile + Flooring',
      daysLow: Math.max(hoursToDay(tileHours.low), hoursToDay(floorHours.low)),
      daysHigh: hoursToDay(tileHours.high) + hoursToDay(floorHours.high),
      trades: floorTrades,
      dependsOn: prevPhase ? [prevPhase] : [],
    });
  }

  // Phase 7: Cabinetry + Countertops
  const finishCarpHours = getTradeHours(tradeHours, 'Carpenter (Finish)');
  const hasCabinetry = scope.newInstallation.some(
    (i) => i.category === 'cabinetry' || i.category === 'countertops',
  );

  if (hasCabinetry || finishCarpHours.high > 0) {
    const prevPhase = hasFloorWork
      ? 'Tile + Flooring'
      : drywallHours.high > 0
        ? 'Insulation + Drywall'
        : undefined;

    phases.push({
      name: 'Cabinetry + Countertops',
      daysLow: Math.max(hoursToDay(finishCarpHours.low), 1),
      daysHigh: Math.max(hoursToDay(finishCarpHours.high), 3),
      trades: ['Carpenter (Finish)'],
      dependsOn: prevPhase ? [prevPhase] : [],
    });
  }

  // Phase 8: Paint
  const paintHours = getTradeHours(tradeHours, 'Painter');
  if (paintHours.high > 0) {
    const prevPhase = hasCabinetry || finishCarpHours.high > 0
      ? 'Cabinetry + Countertops'
      : hasFloorWork
        ? 'Tile + Flooring'
        : drywallHours.high > 0
          ? 'Insulation + Drywall'
          : undefined;

    phases.push({
      name: 'Paint',
      daysLow: hoursToDay(paintHours.low),
      daysHigh: hoursToDay(paintHours.high),
      trades: ['Painter'],
      dependsOn: prevPhase ? [prevPhase] : [],
    });
  }

  // Phase 9: Fixtures + Hardware + Appliances
  const hasFixtureWork = scope.newInstallation.some(
    (i) => i.category === 'fixtures' || i.category === 'appliances' || i.category === 'hardware',
  );

  if (hasFixtureWork) {
    const prevPhase = paintHours.high > 0
      ? 'Paint'
      : hasCabinetry || finishCarpHours.high > 0
        ? 'Cabinetry + Countertops'
        : undefined;

    phases.push({
      name: 'Fixtures + Hardware',
      daysLow: 0.5,
      daysHigh: 2,
      trades: ['Plumber', 'Electrician'],
      dependsOn: prevPhase ? [prevPhase] : [],
    });
  }

  // Phase 10: Final touches + cleanup (always present)
  const lastPhase = phases.length > 0 ? phases[phases.length - 1]!.name : undefined;
  phases.push({
    name: 'Final Touches + Cleanup',
    daysLow: 0.5,
    daysHigh: 1,
    trades: ['General Labourer'],
    dependsOn: lastPhase ? [lastPhase] : [],
  });

  return phases;
}

// ---------------------------------------------------------------------------
// Critical Path & Parallel Opportunities
// ---------------------------------------------------------------------------

/**
 * Compute the critical path — the longest sequential chain of phases.
 * Uses a simple topological longest-path approach.
 */
function computeCriticalPath(phases: TimelinePhase[]): string[] {
  // Build adjacency map (phase name -> phases that depend on it)
  const phaseMap = new Map<string, TimelinePhase>();
  for (const p of phases) phaseMap.set(p.name, p);

  // Calculate longest path ending at each phase
  const longestPath = new Map<string, { days: number; path: string[] }>();

  function resolve(name: string): { days: number; path: string[] } {
    const cached = longestPath.get(name);
    if (cached) return cached;

    const phase = phaseMap.get(name);
    if (!phase) return { days: 0, path: [] };

    if (phase.dependsOn.length === 0) {
      const result = { days: phase.daysHigh, path: [name] };
      longestPath.set(name, result);
      return result;
    }

    let bestPrev = { days: 0, path: [] as string[] };
    for (const dep of phase.dependsOn) {
      const depResult = resolve(dep);
      if (depResult.days > bestPrev.days) {
        bestPrev = depResult;
      }
    }

    const result = {
      days: bestPrev.days + phase.daysHigh,
      path: [...bestPrev.path, name],
    };
    longestPath.set(name, result);
    return result;
  }

  // Find the phase with the longest path
  let best = { days: 0, path: [] as string[] };
  for (const p of phases) {
    const result = resolve(p.name);
    if (result.days > best.days) {
      best = result;
    }
  }

  return best.path;
}

/**
 * Identify phases that can run in parallel with other phases.
 */
function findParallelOpportunities(phases: TimelinePhase[]): string[] {
  const opportunities: string[] = [];

  // Group phases by their dependency set
  const depGroups = new Map<string, string[]>();
  for (const p of phases) {
    const depKey = p.dependsOn.sort().join(',');
    const group = depGroups.get(depKey) ?? [];
    group.push(p.name);
    depGroups.set(depKey, group);
  }

  // Any group with 2+ phases has parallel opportunity
  for (const [, group] of depGroups) {
    if (group.length >= 2) {
      opportunities.push(`${group.join(' + ')} can run in parallel`);
    }
  }

  return opportunities;
}

/**
 * Calculate total project days, accounting for parallel phases.
 * Uses the critical path length as the primary estimate.
 */
function computeTotalDays(
  phases: TimelinePhase[],
): { low: number; high: number } {
  if (phases.length === 0) return { low: 0, high: 0 };

  // Build longest path for low and high estimates
  const phaseMap = new Map<string, TimelinePhase>();
  for (const p of phases) phaseMap.set(p.name, p);

  function longestPathDays(useHigh: boolean): number {
    const memo = new Map<string, number>();

    function resolve(name: string): number {
      const cached = memo.get(name);
      if (cached !== undefined) return cached;

      const phase = phaseMap.get(name);
      if (!phase) return 0;

      const selfDays = useHigh ? phase.daysHigh : phase.daysLow;

      if (phase.dependsOn.length === 0) {
        memo.set(name, selfDays);
        return selfDays;
      }

      let maxDep = 0;
      for (const dep of phase.dependsOn) {
        maxDep = Math.max(maxDep, resolve(dep));
      }

      const total = maxDep + selfDays;
      memo.set(name, total);
      return total;
    }

    let max = 0;
    for (const p of phases) {
      max = Math.max(max, resolve(p.name));
    }
    return max;
  }

  return {
    low: Math.max(1, Math.ceil(longestPathDays(false))),
    high: Math.ceil(longestPathDays(true)),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert labour hours to business days */
function hoursToDay(hours: number): number {
  if (hours <= 0) return 0;
  return Math.max(MIN_PHASE_DAYS, Math.round((hours / HOURS_PER_DAY) * 2) / 2);
}

/** Get hours for a trade from the map, defaulting to 0 */
function getTradeHours(
  map: Map<string, { low: number; high: number }>,
  trade: string,
): { low: number; high: number } {
  return map.get(trade) ?? { low: 0, high: 0 };
}

/** Build a map of trade -> hours from labour estimates */
function buildTradeHoursMap(
  labour: TradeLabourEstimate[],
): Map<string, { low: number; high: number }> {
  const map = new Map<string, { low: number; high: number }>();
  for (const estimate of labour) {
    map.set(estimate.trade, estimate.hours);
  }
  return map;
}

/** Deduplicate trade names */
function uniqueTrades(trades: string[]): string[] {
  return [...new Set(trades)];
}
