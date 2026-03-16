'use client';

/**
 * Room Type Selector
 * Card-based selection for room type
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  UtensilsCrossed,
  Bath,
  Sofa,
  Home,
  Bed,
  TreeDeciduous,
  Lamp,
  PenLine,
  type LucideIcon,
} from 'lucide-react';

export type RoomType = 'kitchen' | 'bathroom' | 'living_room' | 'basement' | 'bedroom' | 'exterior' | 'dining_room';
export type RoomTypeSelection = RoomType | 'other';

interface RoomOption {
  id: RoomType;
  label: string;
  icon: LucideIcon;
  description: string;
}

const ROOM_OPTIONS: RoomOption[] = [
  {
    id: 'kitchen',
    label: 'Kitchen',
    icon: UtensilsCrossed,
    description: 'Cabinets, counters, and appliances',
  },
  {
    id: 'bathroom',
    label: 'Bathroom',
    icon: Bath,
    description: 'Vanity, shower, and fixtures',
  },
  {
    id: 'living_room',
    label: 'Living Room',
    icon: Sofa,
    description: 'Main living and family spaces',
  },
  {
    id: 'basement',
    label: 'Basement',
    icon: Home,
    description: 'Finished or unfinished lower level',
  },
  {
    id: 'bedroom',
    label: 'Bedroom',
    icon: Bed,
    description: 'Master or guest bedrooms',
  },
  {
    id: 'exterior',
    label: 'Exterior',
    icon: TreeDeciduous,
    description: 'Siding, decks, and outdoor spaces',
  },
  {
    id: 'dining_room',
    label: 'Dining Room',
    icon: Lamp,
    description: 'Formal or casual dining spaces',
  },
];

interface RoomTypeSelectorProps {
  value: RoomTypeSelection | null;
  onChange: (value: RoomTypeSelection) => void;
  allowCustom?: boolean;
  customValue?: string;
  onCustomChange?: (value: string) => void;
  className?: string;
}

export function RoomTypeSelector({
  value,
  onChange,
  allowCustom = false,
  customValue = '',
  onCustomChange,
  className,
}: RoomTypeSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(value === 'other');

  const handleSelect = (id: RoomTypeSelection) => {
    if (id === 'other') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
    }
    onChange(id);
  };

  const allOptions = allowCustom
    ? [...ROOM_OPTIONS, { id: 'other' as const, label: 'Other', icon: PenLine, description: 'Describe your space' }]
    : ROOM_OPTIONS;

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-semibold">What room is this?</h3>
        <p className="text-sm text-muted-foreground">
          Select the type of room in your photo
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {allOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id as RoomTypeSelection)}
              className={cn(
                'flex flex-col items-center p-4 rounded-lg border-2 transition-all',
                'min-h-[120px] hover:border-primary/50 hover:bg-muted/50',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center mb-2',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-sm">{option.label}</span>
              <span className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom room type input */}
      {showCustomInput && value === 'other' && (
        <div className="mt-3">
          <Input
            value={customValue}
            onChange={(e) => onCustomChange?.(e.target.value)}
            placeholder="e.g., Sunroom, Home office, Laundry room..."
            className="max-w-md"
            maxLength={100}
            autoFocus
            aria-label="Custom room type"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Describe your space so we can tailor the design
          </p>
        </div>
      )}
    </div>
  );
}
