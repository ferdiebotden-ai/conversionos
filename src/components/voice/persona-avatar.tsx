'use client';

/**
 * Persona Avatar
 * Animated circle with page-context icon for voice interactions
 * Static, listening (pulse), speaking (ripple) states
 * Always represents Emma — icon varies by page context
 */

import { cn } from '@/lib/utils';
import {
  MessageCircle,
  Calculator,
  Palette,
} from 'lucide-react';
import type { PageContext } from '@/lib/ai/personas/types';

const CONTEXT_CONFIG: Record<
  PageContext,
  { icon: typeof MessageCircle; color: string; bgColor: string; ringColor: string }
> = {
  general: {
    icon: MessageCircle,
    color: 'text-primary-foreground',
    bgColor: 'bg-primary',
    ringColor: 'ring-primary/30',
  },
  estimate: {
    icon: Calculator,
    color: 'text-white',
    bgColor: 'bg-blue-600',
    ringColor: 'ring-blue-600/30',
  },
  visualizer: {
    icon: Palette,
    color: 'text-white',
    bgColor: 'bg-purple-600',
    ringColor: 'ring-purple-600/30',
  },
};

const SIZES = {
  sm: { container: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { container: 'h-12 w-12', icon: 'h-6 w-6' },
  lg: { container: 'h-20 w-20', icon: 'h-10 w-10' },
} as const;

interface PersonaAvatarProps {
  context: PageContext;
  size?: keyof typeof SIZES;
  state?: 'static' | 'listening' | 'speaking';
  outputVolume?: number;
  className?: string;
}

export function PersonaAvatar({
  context,
  size = 'md',
  state = 'static',
  outputVolume = 0,
  className,
}: PersonaAvatarProps) {
  const config = CONTEXT_CONFIG[context];
  const sizeConfig = SIZES[size];
  const Icon = config.icon;

  // Scale animation intensity based on volume (0-1)
  const volumeScale = 1 + outputVolume * 0.15;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* Outer ring animations */}
      {state === 'listening' && (
        <div
          className={cn(
            'absolute inset-0 rounded-full ring-2 animate-pulse',
            config.ringColor
          )}
          style={{ animationDuration: '2s' }}
        />
      )}
      {state === 'speaking' && (
        <>
          <div
            className={cn(
              'absolute rounded-full opacity-20',
              config.bgColor
            )}
            style={{
              inset: `-${Math.round(outputVolume * 12)}px`,
              transition: 'inset 150ms ease-out',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            className={cn(
              'absolute rounded-full opacity-10',
              config.bgColor
            )}
            style={{
              inset: `-${Math.round(outputVolume * 20)}px`,
              transition: 'inset 150ms ease-out',
              animation: 'pulse 1.5s ease-in-out infinite 0.3s',
            }}
          />
        </>
      )}

      {/* Main avatar circle */}
      <div
        className={cn(
          'rounded-full flex items-center justify-center transition-transform duration-150',
          sizeConfig.container,
          config.bgColor,
          config.color
        )}
        style={{
          transform: state === 'speaking' ? `scale(${volumeScale})` : 'scale(1)',
        }}
      >
        <Icon className={sizeConfig.icon} />
      </div>
    </div>
  );
}
