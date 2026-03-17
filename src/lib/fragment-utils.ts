/**
 * Fragment Utilities for Renovation Teardown Animation
 *
 * Pure math functions for generating irregular image fragments
 * (Voronoi-like tessellation) and computing scatter trajectories.
 * No React, no DOM — import these into any component.
 *
 * Used by: hero/visualizer-teardown.tsx
 */

export interface Point {
  x: number;
  y: number;
}

export interface Fragment {
  /** Unique fragment index */
  id: number;
  /** CSS polygon() clip-path value (percentages, e.g., "polygon(10% 0%, 30% 0%, ...)") */
  polygon: string;
  /** Centre point of this fragment (0-1 range) */
  centroid: Point;
  /** Pre-computed scatter trajectory */
  trajectory: {
    /** X scatter distance as fraction of container (-1 to 1) */
    dx: number;
    /** Y scatter distance as fraction of container (-1 to 1) */
    dy: number;
    /** Rotation in degrees when scattered */
    rotation: number;
    /** Scale when scattered (0.3-0.8) */
    scale: number;
  };
}

// ---------------------------------------------------------------------------
// Seeded pseudo-random number generator (deterministic)
// ---------------------------------------------------------------------------

/** Mulberry32 PRNG — fast, deterministic, 32-bit state */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Halton sequence for quasi-random point placement
// ---------------------------------------------------------------------------

/** Generate the nth value in a Halton sequence with given base */
function halton(index: number, base: number): number {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Voronoi tessellation (simplified — pixel-sampling approach)
// ---------------------------------------------------------------------------

/**
 * Generate N irregular polygon fragments that tile a unit rectangle [0,1]x[0,1].
 *
 * Algorithm:
 * 1. Place N seed points using Halton sequence (quasi-random, good coverage)
 * 2. Jitter positions using seeded PRNG for organic feel
 * 3. Sample a grid of points, assign each to nearest seed (Voronoi)
 * 4. Trace region boundaries to extract polygon vertices
 * 5. Compute centroids and scatter trajectories
 *
 * @param count Number of fragments (recommended: 12-20 for performance)
 * @param seed Deterministic seed (default: 42)
 * @returns Array of Fragment objects with polygon clip-paths and trajectories
 */
export function generateFragments(count: number = 16, seed: number = 42): Fragment[] {
  const rng = mulberry32(seed);
  const resolution = 100; // Grid resolution for Voronoi sampling

  // Step 1: Generate seed points with Halton sequence + jitter
  const seeds: Point[] = [];
  for (let i = 0; i < count; i++) {
    const hx = halton(i + 1, 2);
    const hy = halton(i + 1, 3);
    // Add small jitter for organic feel
    const jx = (rng() - 0.5) * 0.08;
    const jy = (rng() - 0.5) * 0.08;
    seeds.push({
      x: Math.max(0.02, Math.min(0.98, hx + jx)),
      y: Math.max(0.02, Math.min(0.98, hy + jy)),
    });
  }

  // Step 2: Assign each grid cell to nearest seed (Voronoi regions)
  const grid: number[][] = [];
  for (let gy = 0; gy < resolution; gy++) {
    grid[gy] = [];
    for (let gx = 0; gx < resolution; gx++) {
      const px = (gx + 0.5) / resolution;
      const py = (gy + 0.5) / resolution;
      let minDist = Infinity;
      let nearest = 0;
      for (let s = 0; s < seeds.length; s++) {
        const seed = seeds[s]!;
        const dx = px - seed.x;
        const dy = py - seed.y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          nearest = s;
        }
      }
      grid[gy]![gx] = nearest;
    }
  }

  // Step 3: Extract boundary points for each region using marching
  const fragments: Fragment[] = [];

  for (let s = 0; s < seeds.length; s++) {
    const boundaryPoints: Point[] = [];

    // Find all boundary cells for this region
    for (let gy = 0; gy < resolution; gy++) {
      for (let gx = 0; gx < resolution; gx++) {
        if (grid[gy]![gx] !== s) continue;

        // Check if this cell is on the boundary (adjacent to different region or edge)
        const isEdge =
          gx === 0 ||
          gx === resolution - 1 ||
          gy === 0 ||
          gy === resolution - 1;
        const row = grid[gy]!;
        const hasDifferentNeighbour =
          (gx > 0 && row[gx - 1] !== s) ||
          (gx < resolution - 1 && row[gx + 1] !== s) ||
          (gy > 0 && grid[gy - 1]![gx] !== s) ||
          (gy < resolution - 1 && grid[gy + 1]![gx] !== s);

        if (isEdge || hasDifferentNeighbour) {
          boundaryPoints.push({
            x: (gx + 0.5) / resolution,
            y: (gy + 0.5) / resolution,
          });
        }
      }
    }

    if (boundaryPoints.length < 3) continue;

    // Step 4: Order boundary points by angle from centroid (convex hull-like)
    const cx = boundaryPoints.reduce((sum, p) => sum + p.x, 0) / boundaryPoints.length;
    const cy = boundaryPoints.reduce((sum, p) => sum + p.y, 0) / boundaryPoints.length;

    boundaryPoints.sort(
      (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
    );

    // Simplify: keep every Nth point to reduce polygon complexity (max ~12 vertices)
    const maxVertices = 12;
    const step = Math.max(1, Math.floor(boundaryPoints.length / maxVertices));
    const simplified = boundaryPoints.filter((_, i) => i % step === 0);

    if (simplified.length < 3) continue;

    // Step 5: Build polygon clip-path string
    const polygon = toClipPath(simplified);

    // Step 6: Compute trajectory
    const distFromCentre = Math.sqrt((cx - 0.5) ** 2 + (cy - 0.5) ** 2);
    const angle = Math.atan2(cy - 0.5, cx - 0.5);
    const scatterMagnitude = 0.5 + distFromCentre * 1.5; // Edge fragments fly further

    fragments.push({
      id: s,
      polygon,
      centroid: { x: cx, y: cy },
      trajectory: {
        dx: Math.cos(angle) * scatterMagnitude * (0.8 + rng() * 0.4),
        dy: Math.sin(angle) * scatterMagnitude * (0.8 + rng() * 0.4),
        rotation: (rng() - 0.5) * 90, // -45 to +45 degrees
        scale: 0.3 + rng() * 0.5,     // 0.3 to 0.8
      },
    });
  }

  return fragments;
}

/**
 * Convert an array of points to a CSS polygon() clip-path string.
 * Points are in 0-1 range, output is percentages.
 */
export function toClipPath(vertices: Point[]): string {
  const points = vertices
    .map((v) => `${(v.x * 100).toFixed(1)}% ${(v.y * 100).toFixed(1)}%`)
    .join(', ');
  return `polygon(${points})`;
}

/**
 * Interpolate a fragment's transform values based on slider position.
 *
 * @param position Slider position 0-1 (0 = fully "before", 1 = fully "after")
 * @param fragment The fragment to compute transforms for
 * @param phase "before" (fragments scatter as position increases) or "after" (fragments assemble as position increases)
 * @returns CSS transform values
 */
export function interpolateFragment(
  position: number,
  fragment: Fragment,
  phase: 'before' | 'after'
): {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
} {
  // Smooth easing curve
  const t = phase === 'before' ? position : 1 - position;
  const eased = t * t * (3 - 2 * t); // smoothstep

  const { dx, dy, rotation, scale } = fragment.trajectory;

  return {
    x: eased * dx * 100,         // percentage of container
    y: eased * dy * 100,
    rotate: eased * rotation,
    scale: 1 - eased * (1 - scale),
    opacity: 1 - eased * 0.6,    // fade to 40% opacity at max scatter
  };
}
