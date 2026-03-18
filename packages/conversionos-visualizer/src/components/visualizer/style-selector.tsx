'use client';

/**
 * Style Selector
 * Multi-select cards for choosing up to 2 design styles.
 * "Don't Have a Style in Mind?" offers a conversational alternative.
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Check, Palette, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type DesignStyle =
  | 'modern'
  | 'traditional'
  | 'farmhouse'
  | 'industrial'
  | 'minimalist'
  | 'contemporary'
  | 'transitional'
  | 'scandinavian'
  | 'coastal'
  | 'mid_century_modern';

export type DesignStyleSelection = DesignStyle | 'other';

interface StyleOption {
  id: DesignStyle;
  label: string;
  description: string;
  keywords: string[];
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'modern',
    label: 'Modern',
    description: 'Clean lines, minimal ornamentation, sleek finishes',
    keywords: ['minimalist', 'sleek', 'geometric'],
  },
  {
    id: 'traditional',
    label: 'Traditional',
    description: 'Classic details, rich colors, timeless elegance',
    keywords: ['classic', 'elegant', 'ornate'],
  },
  {
    id: 'farmhouse',
    label: 'Farmhouse',
    description: 'Rustic charm, natural textures, warm and welcoming',
    keywords: ['rustic', 'cozy', 'shiplap'],
  },
  {
    id: 'industrial',
    label: 'Industrial',
    description: 'Raw materials, exposed brick, metal accents',
    keywords: ['urban', 'raw', 'edgy'],
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    description: 'Simple, uncluttered, focus on essential elements',
    keywords: ['simple', 'clean', 'functional'],
  },
  {
    id: 'contemporary',
    label: 'Contemporary',
    description: 'Current trends, bold accents, artistic elements',
    keywords: ['trendy', 'bold', 'artistic'],
  },
  {
    id: 'transitional',
    label: 'Transitional',
    description: 'Traditional warmth meets contemporary restraint',
    keywords: ['classic', 'updated', 'timeless'],
  },
  {
    id: 'scandinavian',
    label: 'Scandinavian',
    description: 'Nordic minimalism, bright and cosy, natural textures',
    keywords: ['nordic', 'hygge', 'light'],
  },
  {
    id: 'coastal',
    label: 'Coastal',
    description: 'Seaside calm, light and airy, ocean-inspired',
    keywords: ['beach', 'breezy', 'nautical'],
  },
  {
    id: 'mid_century_modern',
    label: 'Mid-Century Modern',
    description: 'Retro curves, warm wood, bold colour pops',
    keywords: ['retro', '1960s', 'atomic'],
  },
];

// AI-generated style preview images
const STYLE_IMAGES: Record<DesignStyle, string> = {
  modern: '/images/styles/modern.png',
  traditional: '/images/styles/traditional.png',
  farmhouse: '/images/styles/farmhouse.png',
  industrial: '/images/styles/industrial.png',
  minimalist: '/images/styles/minimalist.png',
  contemporary: '/images/styles/contemporary.png',
  transitional: '/images/styles/transitional.png',
  scandinavian: '/images/styles/scandinavian.png',
  coastal: '/images/styles/coastal.png',
  mid_century_modern: '/images/styles/mid_century_modern.png',
};

interface StyleSelectorProps {
  /** Array of selected styles (0 to maxSelections) */
  selectedStyles: DesignStyleSelection[];
  /** Called with updated array when selection changes */
  onChange: (styles: DesignStyleSelection[]) => void;
  /** Maximum styles the user can pick (default: 2) */
  maxSelections?: number;
  allowCustom?: boolean;
  customValue?: string;
  onCustomChange?: (value: string) => void;
  /** Called when user clicks "Don't have a style in mind?" */
  onSkipStyle?: () => void;
  className?: string;

  // Backward compat — if consuming code still passes single-value props
  /** @deprecated Use selectedStyles instead */
  value?: DesignStyleSelection | null;
}

export function StyleSelector({
  selectedStyles,
  onChange,
  maxSelections = 2,
  allowCustom = false,
  customValue = '',
  onCustomChange,
  onSkipStyle,
  className,
  value,
}: StyleSelectorProps) {
  // Backward compat: if old single-value prop is used, convert
  const effectiveStyles = selectedStyles ?? (value ? [value] : []);
  const [showCustomInput, setShowCustomInput] = useState(effectiveStyles.includes('other'));
  const [shakeId, setShakeId] = useState<string | null>(null);

  const handleSelect = useCallback((id: DesignStyleSelection) => {
    if (id === 'other') {
      if (effectiveStyles.includes('other')) {
        onChange(effectiveStyles.filter(s => s !== 'other'));
        setShowCustomInput(false);
      } else if (effectiveStyles.length < maxSelections) {
        setShowCustomInput(true);
        onChange([...effectiveStyles, 'other']);
      } else {
        setShakeId('other');
        setTimeout(() => setShakeId(null), 500);
      }
      return;
    }

    if (effectiveStyles.includes(id)) {
      onChange(effectiveStyles.filter(s => s !== id));
    } else if (effectiveStyles.length < maxSelections) {
      onChange([...effectiveStyles, id]);
    } else {
      setShakeId(id);
      setTimeout(() => setShakeId(null), 500);
    }
  }, [effectiveStyles, maxSelections, onChange]);

  const selectionCount = effectiveStyles.length;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Choose Up to Two Styles</h3>
          <p className="text-sm text-muted-foreground">
            Pick one for four concepts, or two for a side-by-side comparison
          </p>
        </div>

        {onSkipStyle && (
          <button
            type="button"
            onClick={onSkipStyle}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Don&apos;t have a style in mind?</span>
            <span className="sm:hidden">No style?</span>
          </button>
        )}
      </div>

      {/* Selection count dots */}
      {selectionCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: maxSelections }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i < selectionCount ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {selectionCount} of {maxSelections} selected
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {STYLE_OPTIONS.map((option) => {
          const isSelected = effectiveStyles.includes(option.id);
          const isShaking = shakeId === option.id;

          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              animate={isShaking ? { x: [0, -4, 4, -4, 4, 0] } : {}}
              transition={isShaking ? { duration: 0.4 } : {}}
              className={cn(
                'group relative rounded-xl overflow-hidden transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'hover:ring-2 hover:ring-primary/50',
                isSelected && 'ring-2 ring-primary'
              )}
            >
              <div className="aspect-[4/3] relative">
                <img
                  src={STYLE_IMAGES[option.id]}
                  alt={`${option.label} style kitchen`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                <span className="font-semibold text-white text-sm">
                  {option.label}
                </span>
                <span className="text-xs text-white/80 line-clamp-2 mt-0.5">
                  {option.description}
                </span>
              </div>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}

        {allowCustom && (
          <motion.button
            type="button"
            onClick={() => handleSelect('other')}
            animate={shakeId === 'other' ? { x: [0, -4, 4, -4, 4, 0] } : {}}
            transition={shakeId === 'other' ? { duration: 0.4 } : {}}
            className={cn(
              'group relative rounded-xl overflow-hidden transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              'hover:ring-2 hover:ring-primary/50',
              effectiveStyles.includes('other') && 'ring-2 ring-primary'
            )}
          >
            <div className="aspect-[4/3] relative bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
              <Palette className="w-12 h-12 text-primary/40" />
            </div>

            <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
              <span className="font-semibold text-white text-sm">Other</span>
              <span className="text-xs text-white/80 line-clamp-2 mt-0.5">
                Describe your preferred style
              </span>
            </div>

            <AnimatePresence>
              {effectiveStyles.includes('other') && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-primary-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>

      {showCustomInput && effectiveStyles.includes('other') && (
        <div className="mt-3">
          <Input
            value={customValue}
            onChange={(e) => onCustomChange?.(e.target.value)}
            placeholder="e.g., Mid-century modern, Japandi, Art Deco..."
            className="max-w-md"
            maxLength={100}
            autoFocus
            aria-label="Custom design style"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Describe the design aesthetic you envision
          </p>
        </div>
      )}
    </div>
  );
}
