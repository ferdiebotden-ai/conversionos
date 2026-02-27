/**
 * Rate limiting module.
 * Uses Upstash Redis if available, falls back to in-memory Map.
 * Edge-compatible (no Node.js-specific APIs).
 */

import { NextResponse, type NextRequest } from 'next/server';

// ─── Rate Limit Configuration ───────────────────────────────────────────────

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // AI endpoints — higher cost per call
  '/api/ai/visualize': { windowMs: 60_000, maxRequests: 5 },
  '/api/ai/chat': { windowMs: 60_000, maxRequests: 20 },
  '/api/ai/receptionist': { windowMs: 60_000, maxRequests: 20 },
  '/api/ai/visualizer-chat': { windowMs: 60_000, maxRequests: 15 },
  '/api/ai/analyze-photo': { windowMs: 60_000, maxRequests: 10 },
  '/api/ai/summarize-voice': { windowMs: 60_000, maxRequests: 10 },
  '/api/transcribe': { windowMs: 60_000, maxRequests: 5 },
  // Public form endpoints — prevent spam
  '/api/contact': { windowMs: 60_000, maxRequests: 5 },
  '/api/leads:POST': { windowMs: 60_000, maxRequests: 5 },
};

// ─── In-Memory Rate Limiter (per-instance fallback) ─────────────────────────

interface WindowEntry {
  count: number;
  resetTime: number;
}

const windows = new Map<string, WindowEntry>();

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 300_000;

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of windows) {
    if (now > entry.resetTime) {
      windows.delete(key);
    }
  }
}

function checkInMemory(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetMs: number } {
  cleanupStaleEntries();
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    windows.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetMs: config.windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetMs = entry.resetTime - now;

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetMs };
  }

  return { allowed: true, remaining, resetMs };
}

// ─── Upstash Rate Limiter (global, if configured) ──────────────────────────

let upstashLimiter: {
  limit: (key: string, config: RateLimitConfig) => Promise<{ allowed: boolean; remaining: number; resetMs: number }>;
} | null = null;

async function initUpstash() {
  if (upstashLimiter !== null) return;

  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];

  if (!url || !token) {
    upstashLimiter = { limit: async () => ({ allowed: true, remaining: 999, resetMs: 0 }) };
    return;
  }

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url, token });

    // Create rate limiters per config
    const limiters = new Map<string, InstanceType<typeof Ratelimit>>();

    upstashLimiter = {
      limit: async (key: string, config: RateLimitConfig) => {
        const configKey = `${config.windowMs}-${config.maxRequests}`;
        let limiter = limiters.get(configKey);
        if (!limiter) {
          limiter = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs}ms`),
            prefix: 'conversionos',
          });
          limiters.set(configKey, limiter);
        }
        const result = await limiter.limit(key);
        return {
          allowed: result.success,
          remaining: result.remaining,
          resetMs: result.reset - Date.now(),
        };
      },
    };
  } catch {
    // Upstash import failed — fall back to in-memory
    upstashLimiter = { limit: async () => ({ allowed: true, remaining: 999, resetMs: 0 }) };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the client IP from a request.
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Resolve rate limit config for a given pathname + method.
 * Returns null if no limit applies.
 */
function resolveConfig(pathname: string, method: string): RateLimitConfig | null {
  // Check method-specific key first (e.g. /api/leads:POST)
  const methodKey = `${pathname}:${method}`;
  if (RATE_LIMITS[methodKey]) return RATE_LIMITS[methodKey];

  // Check exact path match
  if (RATE_LIMITS[pathname]) return RATE_LIMITS[pathname];

  // Check prefix match (e.g. /api/ai/visualize/stream matches /api/ai/visualize)
  for (const [route, config] of Object.entries(RATE_LIMITS)) {
    if (route.includes(':')) continue; // Skip method-specific keys
    if (pathname.startsWith(route)) return config;
  }

  return null;
}

/**
 * Apply rate limiting to a request.
 * Returns a 429 response if rate limit exceeded, or null if allowed.
 *
 * Usage in route handlers:
 * ```ts
 * import { applyRateLimit } from '@/lib/rate-limit';
 * const limited = await applyRateLimit(request);
 * if (limited) return limited;
 * ```
 */
export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const config = resolveConfig(request.nextUrl.pathname, request.method);
  if (!config) return null;

  const ip = getClientIP(request);
  const key = `${request.nextUrl.pathname}:${ip}`;

  // Try Upstash first, fall back to in-memory
  const useUpstash = process.env['UPSTASH_REDIS_REST_URL'] && process.env['UPSTASH_REDIS_REST_TOKEN'];

  let result: { allowed: boolean; remaining: number; resetMs: number };

  if (useUpstash) {
    await initUpstash();
    result = await upstashLimiter!.limit(key, config);
  } else {
    result = checkInMemory(key, config);
  }

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.resetMs / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
        },
      }
    );
  }

  return null;
}
