'use client';

/**
 * Hero Visualiser Teardown Section — Video Frame Scrubber
 *
 * Premium before/after hero powered by AI-generated renovation videos.
 * Veo 3.1 creates a cinematic transformation video from the before photo
 * to each after-style photo. FFmpeg extracts JPEG frame sequences.
 * The slider scrubs through frames — users literally watch the kitchen
 * being demolished and rebuilt as they drag.
 *
 * Fallback chain:
 * 1. Frame sequence exists → canvas scrubber (premium)
 * 2. Static images only → cascading tile flip (good)
 * 3. Reduced motion → simple opacity slider (accessible)
 */

import { useState, useEffect, useRef, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useSliderMotion } from '@/hooks/use-slider-motion';
import type { SectionBaseProps } from '@/lib/section-types';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

// ── Image & frame config ──────────────────────────────────────────

interface HeroVisualizerImages {
  before: string;
  styles: Array<{ label: string; after: string }>;
}

interface HeroVisualizerFrames {
  styles: Array<{
    label: string;
    frameCount: number;
    baseUrl: string;
  }>;
}

interface StyleOption {
  label: string;
  after: string;
  /** If frames exist for this style */
  frameCount?: number;
  frameBaseUrl?: string;
}

const DEFAULT_BEFORE = '/images/hero/before-kitchen.png';
const DEFAULT_STYLES: StyleOption[] = [
  { label: 'Modern', after: '/images/hero/after-modern.png' },
  { label: 'Transitional', after: '/images/hero/after-transitional.png' },
  { label: 'Farmhouse', after: '/images/hero/after-farmhouse.png' },
  { label: 'Industrial', after: '/images/hero/after-industrial.png' },
  { label: 'Scandinavian', after: '/images/hero/after-scandinavian.png' },
];

// ── Canvas cover drawing (centered crop, not top-left) ────────────

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvasW: number, canvasH: number) {
  const imgAR = img.naturalWidth / img.naturalHeight;
  const canvasAR = canvasW / canvasH;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgAR > canvasAR) {
    sw = img.naturalHeight * canvasAR;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / canvasAR;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
}

// ── Frame Scrubber sub-component ──────────────────────────────────

function FrameScrubber({
  frameCount,
  baseUrl,
  position,
}: {
  frameCount: number;
  baseUrl: string;
  position: MotionValue<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const lastDrawnRef = useRef(-1);
  const cssSizeRef = useRef({ w: 0, h: 0 }); // CSS dimensions for DPR-aware drawing

  // Preload frames progressively — keyframes first, then fill
  useEffect(() => {
    const frames: (HTMLImageElement | null)[] = new Array(frameCount).fill(null);
    framesRef.current = frames;

    // Keyframes first (every 10th frame for instant scrubbing)
    const keyframeIndices = [];
    for (let i = 0; i < frameCount; i += Math.max(1, Math.floor(frameCount / 8))) {
      keyframeIndices.push(i);
    }
    if (!keyframeIndices.includes(frameCount - 1)) {
      keyframeIndices.push(frameCount - 1);
    }

    // Then fill remaining
    const allIndices = [...keyframeIndices];
    for (let i = 0; i < frameCount; i++) {
      if (!allIndices.includes(i)) allIndices.push(i);
    }

    let loaded = 0;
    for (const idx of allIndices) {
      const img = new window.Image();
      img.src = `${baseUrl}frame_${String(idx).padStart(3, '0')}.webp`;
      img.onload = () => {
        frames[idx] = img;
        loaded++;
        // Update state periodically (not every frame to avoid re-renders)
        if (loaded % 20 === 0 || loaded === frameCount) {
          setLoadedCount(loaded);
        }
      };
      img.onerror = () => {
        // Frame missing — skip silently
        loaded++;
      };
    }

    return () => {
      // Cleanup
      framesRef.current = [];
    };
  }, [frameCount, baseUrl]);

  // Draw frame on slider change
  useMotionValueEvent(position, 'change', (latest) => {
    const frameIndex = Math.min(
      Math.round((latest / 100) * (frameCount - 1)),
      frameCount - 1
    );

    if (frameIndex === lastDrawnRef.current) return;
    lastDrawnRef.current = frameIndex;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Find the closest loaded frame
    let frame = framesRef.current[frameIndex];
    if (!frame?.complete) {
      // Search nearby frames as fallback
      for (let offset = 1; offset <= 5; offset++) {
        const before = framesRef.current[frameIndex - offset];
        if (before?.complete) { frame = before; break; }
        const after = framesRef.current[frameIndex + offset];
        if (after?.complete) { frame = after; break; }
      }
    }

    if (frame?.complete) {
      const ctx = canvas.getContext('2d');
      const { w, h } = cssSizeRef.current;
      if (ctx && w > 0) {
        drawImageCover(ctx, frame, w, h);
      }
    }
  });

  // Set canvas size on mount + resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      cssSizeRef.current = { w: rect.width, h: rect.height };
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      // Redraw current frame at new size
      lastDrawnRef.current = -1;
      const current = position.get();
      const idx = Math.round((current / 100) * (frameCount - 1));
      const frame = framesRef.current[idx];
      if (frame?.complete && ctx) {
        drawImageCover(ctx, frame, rect.width, rect.height);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [frameCount, position]);

  // Draw first frame once loaded
  useEffect(() => {
    if (loadedCount > 0) {
      const canvas = canvasRef.current;
      const frame = framesRef.current[0];
      if (canvas && frame?.complete && lastDrawnRef.current === -1) {
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawImageCover(ctx, frame, rect.width, rect.height);
          lastDrawnRef.current = 0;
        }
      }
    }
  }, [loadedCount]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: 'auto' }}
    />
  );
}

// ── Tile Flip fallback (from previous implementation) ─────────────

const COLS = 6;
const ROWS = 4;
const WAVE_WIDTH = 0.25;

interface TileConfig {
  id: number;
  col: number;
  row: number;
  wavePosition: number;
}

function generateTiles(): TileConfig[] {
  const tiles: TileConfig[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      tiles.push({
        id: row * COLS + col,
        col,
        row,
        wavePosition: col / (COLS - 1) + (row / (ROWS - 1)) * 0.06,
      });
    }
  }
  return tiles;
}

const TILES = generateTiles();

function getTileFlipProgress(sliderNorm: number, tileWavePos: number): number {
  const sweepPos = sliderNorm * (1 + WAVE_WIDTH) - WAVE_WIDTH;
  const distance = tileWavePos - sweepPos;
  if (distance <= 0) return 1;
  if (distance >= WAVE_WIDTH) return 0;
  const t = 1 - distance / WAVE_WIDTH;
  return t * t * (3 - 2 * t);
}

const FlipTile = memo(function FlipTile({
  tile, beforeUrl, afterUrl, position,
}: {
  tile: TileConfig;
  beforeUrl: string;
  afterUrl: string;
  position: MotionValue<number>;
}) {
  const rotateY = useMotionValue(0);
  const shadowOpacity = useMotionValue(0);

  useMotionValueEvent(position, 'change', (latest) => {
    const flip = getTileFlipProgress(latest / 100, tile.wavePosition);
    rotateY.set(flip * 180);
    shadowOpacity.set(flip < 0.5 ? flip * 2 * 0.4 : (1 - flip) * 2 * 0.4);
  });

  const tileW = 100 / COLS;
  const tileH = 100 / ROWS;
  const bgPos = `${(tile.col / (COLS - 1)) * 100}% ${(tile.row / (ROWS - 1)) * 100}%`;
  const bgSize = `${COLS * 100}% ${ROWS * 100}%`;

  return (
    <div
      className="absolute"
      style={{
        left: `${tile.col * tileW}%`, top: `${tile.row * tileH}%`,
        width: `${tileW}%`, height: `${tileH}%`,
        perspective: '800px',
      }}
    >
      <motion.div className="relative h-full w-full" style={{ rotateY, transformStyle: 'preserve-3d', willChange: 'transform' }}>
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', backgroundImage: `url(${beforeUrl})`, backgroundSize: bgSize, backgroundPosition: bgPos }} />
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundImage: `url(${afterUrl})`, backgroundSize: bgSize, backgroundPosition: bgPos }} />
        <motion.div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: shadowOpacity, backfaceVisibility: 'hidden' }} />
      </motion.div>
    </div>
  );
});

function TileGrid({ beforeUrl, afterUrl, position }: { beforeUrl: string; afterUrl: string; position: MotionValue<number> }) {
  return <>{TILES.map(t => <FlipTile key={t.id} tile={t} beforeUrl={beforeUrl} afterUrl={afterUrl} position={position} />)}</>;
}

// ── Main component ────────────────────────────────────────────────

interface Props extends SectionBaseProps {
  config: CompanyConfig;
}

export function VisualizerTeardownHero({ branding, config, className }: Props) {
  const shouldReduce = useReducedMotion();

  const configRecord = config as unknown as Record<string, unknown>;

  // Image config
  const vizConfig = configRecord['heroVisualizerImages'] as HeroVisualizerImages | undefined;
  const beforeImage = vizConfig?.before ?? DEFAULT_BEFORE;

  // Frame config (from admin_settings or local files)
  const frameConfig = configRecord['heroVisualizerFrames'] as HeroVisualizerFrames | undefined;

  // Merge styles with frame info
  const styles: StyleOption[] = (() => {
    const baseStyles = vizConfig?.styles && vizConfig.styles.length > 0
      ? vizConfig.styles.map(s => ({ label: s.label, after: s.after }))
      : DEFAULT_STYLES;

    // Merge frame config if available
    if (frameConfig?.styles) {
      return baseStyles.map(s => {
        const frameStyle = frameConfig.styles.find(f => f.label === s.label);
        return frameStyle
          ? { ...s, frameCount: frameStyle.frameCount, frameBaseUrl: frameStyle.baseUrl }
          : s;
      });
    }

    // Check for local frame directories (dev mode)
    return baseStyles.map(s => {
      const slug = s.label.toLowerCase();
      // In dev, frames served from public/images/hero/frames/{slug}/
      // We check at runtime by attempting to load frame_000.jpg
      return { ...s, frameBaseUrl: `/images/hero/frames/${slug}/`, frameCount: 157 };
    });
  })();

  const [activeIndex, setActiveIndex] = useState(0);
  const active = styles[activeIndex]!;
  const headline = config.heroHeadline || branding.tagline;

  // Detect if current style has frames available
  const [hasFrames, setHasFrames] = useState(false);
  useEffect(() => {
    // Probe for frame_000.jpg to verify frames exist
    const img = new window.Image();
    const baseUrl = active.frameBaseUrl;
    if (!baseUrl) {
      img.onerror = () => setHasFrames(false);
      img.src = '';
      return;
    }
    img.onload = () => setHasFrames(true);
    img.onerror = () => setHasFrames(false);
    img.src = `${baseUrl}frame_000.webp`;
  }, [active.frameBaseUrl, activeIndex]);

  // Slider hook
  const {
    position, isDragging, showLabels, trackRef, handlers,
    runIntroAnimation, cancelAnimation,
  } = useSliderMotion({ reducedMotion: !!shouldReduce });

  const fillWidth = useTransform(position, (v) => `${v}%`);
  const thumbLeft = useTransform(position, (v) => `${v}%`);

  const [ariaValueNow, setAriaValueNow] = useState(shouldReduce ? 90 : 0);
  useMotionValueEvent(position, 'change', (latest) => {
    const rounded = Math.round(latest);
    setAriaValueNow((prev) => (prev !== rounded ? rounded : prev));
  });

  // Auto-animate on mount
  const hasAnimatedRef = useRef(false);
  useEffect(() => {
    if (hasAnimatedRef.current || shouldReduce) return;
    hasAnimatedRef.current = true;
    requestAnimationFrame(() => runIntroAnimation());
  }, [runIntroAnimation, shouldReduce]);

  // Preload images
  useEffect(() => {
    const preload = (src: string) => { const img = new window.Image(); img.src = src; };
    preload(beforeImage);
    styles.forEach((s) => preload(s.after));
  }, [beforeImage, styles]);

  // Tab switch
  const handleTabSwitch = (index: number) => {
    cancelAnimation();
    clearPhaseTimer();
    setHeroPhase('idle');
    setActiveIndex(index);
    position.set(0);
    hasAnimatedRef.current = false;
    requestAnimationFrame(() => {
      hasAnimatedRef.current = true;
      runIntroAnimation();
    });
  };

  // Determine render mode
  const renderMode: 'frames' | 'tiles' | 'opacity' = shouldReduce
    ? 'opacity'
    : hasFrames
      ? 'frames'
      : 'tiles';

  // Hero background image: use tenant's heroImageUrl if available
  const heroImageUrl = config.heroImageUrl;
  const hasHeroBg = Boolean(heroImageUrl);

  // ── Brand reveal state machine ─────────────────────────────────
  // idle → revealing → inviting (slider pulse)
  // User interaction at any point → idle
  const [heroPhase, setHeroPhase] = useState<'idle' | 'revealing' | 'inviting'>('idle');
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPhaseTimer = () => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  };

  useMotionValueEvent(position, 'change', (latest) => {
    if (latest >= 96 && !isDragging && heroPhase === 'idle') {
      if (!phaseTimerRef.current) {
        phaseTimerRef.current = setTimeout(() => {
          setHeroPhase('revealing');
          phaseTimerRef.current = setTimeout(() => {
            setHeroPhase('inviting');
            phaseTimerRef.current = null;
          }, 3500); // Auto-dismiss after 3.5s → invite slider interaction
        }, 200);
      }
    } else if (isDragging || latest < 85) {
      clearPhaseTimer();
      if (heroPhase !== 'idle') setHeroPhase('idle');
    }
  });

  return (
    <section className={cn('relative overflow-hidden', hasHeroBg ? 'min-h-[600px] md:min-h-[700px]' : 'bg-gradient-to-br from-zinc-900 via-primary/20 to-zinc-950', className)}>
      {/* Background hero image from the contractor's website */}
      {hasHeroBg && (
        <>
          <Image
            src={heroImageUrl!}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/30" />
        </>
      )}
      <div className={cn('container relative mx-auto px-4', hasHeroBg ? 'py-20 md:py-24 lg:py-28' : 'py-16 md:py-20 lg:py-24')}>
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          {/* Left: Tagline + CTA */}
          <div className="order-2 space-y-6 md:order-1">
            <h1 className={cn('text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl', hasHeroBg ? 'text-white' : 'text-foreground')}>
              {headline}
            </h1>
            <p className={cn('text-lg leading-8 md:text-xl', hasHeroBg ? 'text-white/80' : 'text-muted-foreground')}>
              See your renovation vision come to life. Our AI Design Visualiser
              lets you explore styles before construction begins.
            </p>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-14 rounded-full px-8 text-lg">
                <Link href="/visualizer">
                  Visualise Your Dream Space
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
              {branding.phone && (
                <a href={`tel:${branding.phone.replace(/\D/g, '')}`} className="text-base text-muted-foreground transition-colors hover:text-foreground">
                  {branding.phone}
                </a>
              )}
            </div>
          </div>

          {/* Right: Before/After card */}
          <div className="order-1 max-w-lg mx-auto space-y-4 md:order-2 md:max-w-none">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tracking-wide text-card-foreground">
                <Sparkles className="size-3 text-primary" />
                AI-Powered
              </span>
            </div>

            {/* Glow wrapper — soft ambient primary-tinted glow */}
            <div className="relative">
              <div className="absolute -inset-2 -z-10 rounded-[2.25rem] bg-primary/[0.07] blur-xl" aria-hidden="true" />
              <div className="absolute -inset-px -z-10 rounded-[1.85rem] bg-primary/[0.04]" aria-hidden="true" />

            <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-2xl shadow-black/10 ring-1 ring-primary/10">
              {/* Style tabs — horizontally scrollable with fade hint */}
              <div className="relative border-b border-border">
                <div className="flex gap-0.5 overflow-x-auto scrollbar-hide px-2 pt-2 pb-1.5 sm:gap-1 sm:px-4 sm:pt-3 sm:pb-2">
                  {styles.map((style, i) => (
                    <button
                      key={style.label}
                      onClick={() => handleTabSwitch(i)}
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide transition-all duration-300 sm:px-4 sm:py-1.5 sm:text-xs',
                        i === activeIndex
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
                {/* Right-edge gradient fade to hint scrollability */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent" aria-hidden="true" />
              </div>

              {/* Image area */}
              <div className="relative aspect-video select-none overflow-hidden sm:aspect-[16/10]">
                {renderMode === 'opacity' ? (
                  <>
                    <Image src={beforeImage} alt="Kitchen before renovation" fill className="object-cover object-center" sizes="(max-width: 768px) 100vw, 600px" priority />
                    <Image src={active.after} alt={`${active.label} style renovation`} fill className="object-cover object-center" style={{ opacity: 1 }} sizes="(max-width: 768px) 100vw, 600px" priority />
                  </>
                ) : renderMode === 'frames' ? (
                  <FrameScrubber
                    key={`frames-${activeIndex}`}
                    frameCount={active.frameCount ?? 80}
                    baseUrl={active.frameBaseUrl ?? ''}
                    position={position}
                  />
                ) : (
                  <TileGrid beforeUrl={beforeImage} afterUrl={active.after} position={position} />
                )}

                {/* Corner labels — hide during brand reveal */}
                <div className={cn('absolute left-3 top-3 z-10 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm transition-opacity duration-500', showLabels && heroPhase !== 'revealing' ? 'opacity-100' : 'opacity-0')}>
                  Before
                </div>
                <div className={cn('absolute right-3 top-3 z-10 rounded-full bg-primary/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur-sm transition-opacity duration-500', showLabels && heroPhase !== 'revealing' ? 'opacity-100' : 'opacity-0')}>
                  After
                </div>

                {/* Brand reveal — fades in, auto-dismisses after 3.5s */}
                <div
                  className={cn(
                    'absolute inset-0 z-20 flex flex-col items-center justify-center transition-all ease-out',
                    heroPhase === 'revealing'
                      ? 'opacity-100 duration-1000'
                      : 'pointer-events-none opacity-0 translate-y-2 duration-700'
                  )}
                >
                  <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/15 px-5 py-4 backdrop-blur-[2px] sm:gap-4 sm:px-12 sm:py-8">
                    {branding.logoUrl ? (
                      <img
                        src={branding.logoUrl}
                        alt={branding.name}
                        className="h-7 max-w-[150px] object-contain brightness-0 invert sm:h-10 sm:max-w-[220px]"
                      />
                    ) : (
                      <span className="text-lg font-bold tracking-tight text-white sm:text-2xl">
                        {branding.name}
                      </span>
                    )}
                    <div className="h-px w-12 bg-white/30" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70 sm:text-xs">
                      {active.label} Design
                    </span>
                  </div>
                </div>

                {/* Slider bar */}
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/70">Before</span>
                    <div
                      ref={trackRef}
                      role="slider"
                      tabIndex={0}
                      aria-label="Before and after comparison"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={ariaValueNow}
                      className={cn(
                        'relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/15',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black/50',
                        isDragging && 'cursor-grabbing'
                      )}
                      onMouseDown={handlers.onMouseDown}
                      onTouchStart={handlers.onTouchStart}
                      onKeyDown={handlers.onKeyDown}
                    >
                      <motion.div className="absolute inset-y-0 left-0 rounded-full bg-primary/60" style={{ width: fillWidth }} />
                      <motion.div
                        className={cn(
                          'absolute top-1/2 -translate-y-1/2',
                          'h-4 w-4 rounded-full border-2 border-primary bg-white shadow-lg',
                          '[@media(hover:none)]:h-10 [@media(hover:none)]:w-10',
                          'transition-all duration-200',
                          isDragging && 'scale-110 cursor-grabbing',
                          heroPhase === 'inviting' && 'h-6 w-6 scale-125 shadow-primary/40 shadow-xl animate-pulse cursor-grab'
                        )}
                        style={{ left: thumbLeft, x: '-50%' }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/70">After</span>
                  </div>
                </div>
              </div>

              {/* CTA bar */}
              <div className="flex items-center justify-between border-t border-border px-3 py-2 sm:px-4 sm:py-3">
                <p className={cn(
                  'text-[10px] text-muted-foreground sm:text-xs transition-opacity duration-500',
                  heroPhase === 'inviting' ? 'opacity-100' : 'opacity-60'
                )}>
                  {heroPhase === 'inviting' ? 'Drag the slider to explore' : 'Drag to compare'}
                </p>
                <Button asChild size="sm" className="group h-8 rounded-full px-4 text-xs font-semibold transition-shadow duration-300 hover:shadow-md hover:shadow-primary/20">
                  <Link href="/visualizer">
                    Try with Your Space
                    <ArrowRight className="ml-1.5 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
            {/* /glow wrapper */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
