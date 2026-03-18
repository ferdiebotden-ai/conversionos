'use client';

/**
 * Concept Thumbnails
 * Grid of generated concept images with single-selection model.
 * Clicking a thumbnail selects AND stars that concept (one active at a time).
 * Refined concepts show updated images + version badges.
 */

import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { GeneratedConcept } from '@/lib/schemas/visualization';

interface ConceptThumbnailsProps {
  concepts: GeneratedConcept[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  favouritedIndices?: Set<number> | undefined;
  onToggleFavourite?: ((index: number) => void) | undefined;
  refinedImageUrls?: Map<number, string> | undefined;
  refinedVersions?: Map<number, number> | undefined;
  variant?: 'grid' | 'sidebar';
  className?: string;
}

export function ConceptThumbnails({
  concepts,
  selectedIndex,
  onSelect,
  favouritedIndices,
  onToggleFavourite,
  refinedImageUrls,
  refinedVersions,
  variant = 'grid',
  className,
}: ConceptThumbnailsProps) {
  const handleClick = (index: number) => {
    onSelect(index);
    // Single-selection: clicking also stars
    onToggleFavourite?.(index);
  };

  return (
    <div className={cn(
      'grid gap-2',
      variant === 'sidebar' ? 'grid-cols-1' : 'grid-cols-4 sm:gap-3',
      className,
    )}>
      {concepts.map((concept, index) => {
        const isActive = favouritedIndices?.has(index) ?? false;
        const isSelected = selectedIndex === index;
        const imageUrl = refinedImageUrls?.get(index) || concept.imageUrl;
        const version = refinedVersions?.get(index) ?? 0;

        return (
          <div
            key={concept.id}
            className={cn(
              'relative aspect-video rounded-lg overflow-hidden cursor-pointer',
              'border-2 transition-all duration-200',
              isActive
                ? 'border-primary ring-2 ring-primary ring-offset-2'
                : isSelected
                  ? 'border-primary/50'
                  : 'border-border hover:border-primary/50',
              !isActive && 'opacity-75 hover:opacity-100',
            )}
            data-testid="concept-thumbnail"
          >
            {/* Click = select + star */}
            <button
              type="button"
              onClick={() => handleClick(index)}
              className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset z-0"
              aria-label={`Select concept ${index + 1}`}
            >
              <img
                src={imageUrl}
                alt={`Concept ${index + 1}${version > 0 ? ` (V${version + 1})` : ''}`}
                className="w-full h-full object-cover"
              />
            </button>

            {/* Style badge + concept number */}
            {concept.styleLabel ? (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium pointer-events-none z-10">
                {concept.styleLabel} #{index + 1}
              </div>
            ) : (
              <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center font-medium pointer-events-none z-10">
                {index + 1}
              </div>
            )}

            {/* Active star badge (top-right) — filled when active */}
            {isActive && (
              <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center pointer-events-none z-10">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              </div>
            )}

            {/* Version badge (bottom-left) — only on refined concepts */}
            {version > 0 && (
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold pointer-events-none z-10">
                V{version + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
