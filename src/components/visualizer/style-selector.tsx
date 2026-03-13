'use client';

/**
 * Style Selector
 * Visual cards for selecting design style
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Check, Palette } from 'lucide-react';

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
  value: DesignStyleSelection | null;
  onChange: (value: DesignStyleSelection) => void;
  allowCustom?: boolean;
  customValue?: string;
  onCustomChange?: (value: string) => void;
  className?: string;
}

export function StyleSelector({
  value,
  onChange,
  allowCustom = false,
  customValue = '',
  onCustomChange,
  className,
}: StyleSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(value === 'other');

  const handleSelect = (id: DesignStyleSelection) => {
    if (id === 'other') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
    }
    onChange(id);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-semibold">Choose your style</h3>
        <p className="text-sm text-muted-foreground">
          Select the design aesthetic you want to visualize
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {STYLE_OPTIONS.map((option) => {
          const isSelected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={cn(
                'group relative rounded-xl overflow-hidden transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'hover:ring-2 hover:ring-primary/50',
                isSelected && 'ring-2 ring-primary'
              )}
            >
              {/* Style preview image */}
              <div className="aspect-[4/3] relative">
                <img
                  src={STYLE_IMAGES[option.id]}
                  alt={`${option.label} style kitchen`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Content overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                <span className="font-semibold text-white text-sm">
                  {option.label}
                </span>
                <span className="text-xs text-white/80 line-clamp-2 mt-0.5">
                  {option.description}
                </span>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}

        {/* "Other" option */}
        {allowCustom && (
          <button
            type="button"
            onClick={() => handleSelect('other')}
            className={cn(
              'group relative rounded-xl overflow-hidden transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              'hover:ring-2 hover:ring-primary/50',
              value === 'other' && 'ring-2 ring-primary'
            )}
          >
            {/* Gradient placeholder */}
            <div className="aspect-[4/3] relative bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
              <Palette className="w-12 h-12 text-primary/40" />
            </div>

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
              <span className="font-semibold text-white text-sm">
                Other
              </span>
              <span className="text-xs text-white/80 line-clamp-2 mt-0.5">
                Describe your preferred style
              </span>
            </div>

            {/* Selection indicator */}
            {value === 'other' && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </button>
        )}
      </div>

      {/* Custom style input */}
      {showCustomInput && value === 'other' && (
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
