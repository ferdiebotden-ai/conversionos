'use client';

/**
 * Step 2: Room Details
 * Captures approximate size, current condition, and what the homeowner wants to change.
 */

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoomSize = 'small' | 'medium' | 'large' | 'custom';
export type RoomCondition = 'good' | 'dated' | 'needs_work';

export interface RoomDetailsData {
  size: RoomSize;
  customSqft: number | null;
  condition: RoomCondition;
  changelist: string[];
}

interface StepRoomDetailsProps {
  value: RoomDetailsData;
  onChange: (value: RoomDetailsData) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE_OPTIONS: { id: RoomSize; label: string; sqft: string; description: string }[] = [
  { id: 'small', label: 'Small', sqft: '~50 sqft', description: 'Powder room, small bath' },
  { id: 'medium', label: 'Medium', sqft: '~150 sqft', description: 'Standard kitchen or bedroom' },
  { id: 'large', label: 'Large', sqft: '~300 sqft', description: 'Open concept, large basement' },
  { id: 'custom', label: 'Custom', sqft: 'Enter sqft', description: 'I know my room size' },
];

const CONDITION_OPTIONS: { id: RoomCondition; label: string; description: string }[] = [
  { id: 'good', label: 'Good Condition', description: 'Functional, just want an update' },
  { id: 'dated', label: 'Dated', description: 'Works but looks 10+ years old' },
  { id: 'needs_work', label: 'Needs Work', description: 'Damaged, worn, or non-functional' },
];

const CHANGE_OPTIONS: { id: string; label: string }[] = [
  { id: 'cabinets', label: 'Cabinets / Storage' },
  { id: 'countertops', label: 'Countertops' },
  { id: 'flooring', label: 'Flooring' },
  { id: 'fixtures', label: 'Fixtures (sinks, faucets, tub)' },
  { id: 'layout', label: 'Layout Changes' },
  { id: 'full_renovation', label: 'Full Renovation' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepRoomDetails({ value, onChange, className }: StepRoomDetailsProps) {
  const [localSqft, setLocalSqft] = useState(
    value.customSqft ? String(value.customSqft) : '',
  );

  const handleSizeSelect = (size: RoomSize) => {
    onChange({ ...value, size, customSqft: size === 'custom' ? value.customSqft : null });
  };

  const handleCustomSqft = (raw: string) => {
    setLocalSqft(raw);
    const parsed = parseInt(raw, 10);
    onChange({
      ...value,
      size: 'custom',
      customSqft: isNaN(parsed) ? null : Math.max(1, Math.min(5000, parsed)),
    });
  };

  const handleConditionSelect = (condition: RoomCondition) => {
    onChange({ ...value, condition });
  };

  const handleChangeToggle = (changeId: string) => {
    const current = value.changelist;
    const next = current.includes(changeId)
      ? current.filter((c) => c !== changeId)
      : [...current, changeId];
    onChange({ ...value, changelist: next });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Size */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Approximate Room Size</h3>
        <div className="grid grid-cols-2 gap-2">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSizeSelect(opt.id)}
              className={cn(
                'flex flex-col items-start px-3 py-2.5 rounded-lg border-2 transition-all text-left',
                'hover:border-primary/50',
                value.size === opt.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border',
              )}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.sqft}</span>
            </button>
          ))}
        </div>

        {value.size === 'custom' && (
          <div className="mt-2">
            <Label htmlFor="custom-sqft" className="text-xs">
              Square feet
            </Label>
            <Input
              id="custom-sqft"
              type="number"
              inputMode="numeric"
              value={localSqft}
              onChange={(e) => handleCustomSqft(e.target.value)}
              placeholder="e.g., 200"
              min={1}
              max={5000}
              className="mt-1 max-w-[140px]"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Condition */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Current Condition</h3>
        <div className="grid grid-cols-3 gap-2">
          {CONDITION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleConditionSelect(opt.id)}
              className={cn(
                'flex flex-col items-start px-3 py-2.5 rounded-lg border-2 transition-all text-left',
                'hover:border-primary/50',
                value.condition === opt.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border',
              )}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* What to change */}
      <div>
        <h3 className="text-sm font-semibold mb-2">What Do You Want to Change?</h3>
        <p className="text-xs text-muted-foreground mb-2">Select all that apply</p>
        <div className="grid grid-cols-2 gap-2">
          {CHANGE_OPTIONS.map((opt) => {
            const isChecked = value.changelist.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer',
                  'hover:bg-muted/50',
                  isChecked ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => handleChangeToggle(opt.id)}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
