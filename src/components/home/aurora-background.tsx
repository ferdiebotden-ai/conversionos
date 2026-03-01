'use client'

import { motion, useReducedMotion } from 'framer-motion'

const BLOBS = [
  {
    // Brand anchor — tenant's primary colour
    color: 'var(--primary)',
    size: '55%',
    blur: 100,
    blendMode: 'hard-light' as const,
    duration: 25,
    x: [-40, 40] as [number, number],
    y: [-30, 30] as [number, number],
    scale: [0.9, 1.1] as [number, number],
    opacity: [0.5, 0.7] as [number, number],
    position: { top: '10%', left: '20%' },
  },
  {
    // Warm wood / lighting — amber undertone
    color: 'color-mix(in oklch, var(--primary) 40%, oklch(0.75 0.15 80))',
    size: '45%',
    blur: 90,
    blendMode: 'hard-light' as const,
    duration: 30,
    x: [30, -50] as [number, number],
    y: [20, -40] as [number, number],
    scale: [0.85, 1.15] as [number, number],
    opacity: [0.35, 0.55] as [number, number],
    position: { top: '30%', right: '10%' },
  },
  {
    // Depth and drama — indigo
    color: 'color-mix(in oklch, var(--primary) 35%, oklch(0.35 0.15 260))',
    size: '50%',
    blur: 110,
    blendMode: 'hard-light' as const,
    duration: 35,
    x: [-60, 30] as [number, number],
    y: [40, -20] as [number, number],
    scale: [0.8, 1.05] as [number, number],
    opacity: [0.3, 0.5] as [number, number],
    position: { bottom: '5%', left: '5%' },
  },
  {
    // Warmth — terracotta / rose
    color: 'color-mix(in oklch, var(--primary) 30%, oklch(0.6 0.18 350))',
    size: '40%',
    blur: 80,
    blendMode: 'screen' as const,
    duration: 20,
    x: [20, -30] as [number, number],
    y: [-20, 35] as [number, number],
    scale: [0.9, 1.1] as [number, number],
    opacity: [0.25, 0.45] as [number, number],
    position: { top: '15%', right: '25%' },
  },
  {
    // Central spotlight — warm highlight
    color: 'color-mix(in oklch, var(--primary) 50%, oklch(0.85 0.1 90))',
    size: '35%',
    blur: 120,
    blendMode: 'screen' as const,
    duration: 18,
    x: [-10, 10] as [number, number],
    y: [-8, 8] as [number, number],
    scale: [0.95, 1.05] as [number, number],
    opacity: [0.3, 0.5] as [number, number],
    position: { top: '25%', left: '30%' },
  },
] as const

export function AuroraBackground() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: 'oklch(0.12 0.02 220)' }}
      aria-hidden="true"
    >
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={
            shouldReduceMotion
              ? {
                  x: (blob.x[0] + blob.x[1]) / 2,
                  y: (blob.y[0] + blob.y[1]) / 2,
                  scale: (blob.scale[0] + blob.scale[1]) / 2,
                  opacity: (blob.opacity[0] + blob.opacity[1]) / 2,
                }
              : {
                  x: blob.x,
                  y: blob.y,
                  scale: blob.scale,
                  opacity: blob.opacity,
                }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  duration: blob.duration,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'mirror',
                }
          }
          className="absolute rounded-full"
          style={{
            width: blob.size,
            height: blob.size,
            ...blob.position,
            background: blob.color,
            filter: `blur(${blob.blur}px)`,
            mixBlendMode: blob.blendMode,
            willChange: 'transform, opacity',
          }}
        />
      ))}

      {/* Grain/noise texture overlay */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.03]" aria-hidden="true">
        <filter id="aurora-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#aurora-grain)" />
      </svg>
    </div>
  )
}
