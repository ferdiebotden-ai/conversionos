'use client';

/**
 * Concept Thumbnails
 * Grid of generated concept images with selection
 */

import { cn } from '@/lib/utils';
import { Check, Star } from 'lucide-react';
import type { GeneratedConcept } from '@/lib/schemas/visualization';

interface ConceptThumbnailsProps {
  concepts: GeneratedConcept[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  favouritedIndices?: Set<number> | undefined;
  onToggleFavourite?: ((index: number) => void) | undefined;
  className?: string;
}

export function ConceptThumbnails({
  concepts,
  selectedIndex,
  onSelect,
  favouritedIndices,
  onToggleFavourite,
  className,
}: ConceptThumbnailsProps) {
  return (
    <div className={cn('grid grid-cols-4 gap-2 sm:gap-3', className)}>
      {concepts.map((concept, index) => (
        <button
          key={concept.id}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            'relative aspect-video rounded-lg overflow-hidden',
            'border-2 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            selectedIndex === index
              ? 'border-primary ring-2 ring-primary ring-offset-2'
              : 'border-border hover:border-primary/50'
          )}
          data-testid="concept-thumbnail"
        >
          <img
            src={concept.imageUrl}
            alt={`Concept ${index + 1}`}
            className="w-full h-full object-cover"
          />

          {/* Selection indicator */}
          {selectedIndex === index && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          )}

          {/* Concept number */}
          <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center font-medium">
            {index + 1}
          </div>

          {/* Favourite star toggle */}
          {onToggleFavourite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavourite(index);
              }}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
              aria-label={favouritedIndices?.has(index) ? `Unfavourite concept ${index + 1}` : `Favourite concept ${index + 1}`}
            >
              <Star
                className={cn(
                  'w-3.5 h-3.5 transition-colors',
                  favouritedIndices?.has(index)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-white/80'
                )}
              />
            </button>
          )}
        </button>
      ))}
    </div>
  );
}
