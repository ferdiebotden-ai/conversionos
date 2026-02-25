'use client';

/**
 * Project Summary Sidebar
 * Editable project details panel that updates as the conversation progresses
 * Sticky on desktop, collapsible card on mobile
 * NOTE: Price estimates are calculated internally for admin quotes but NOT shown to customers
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Check, Pencil, X, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { useBranding } from '@/components/branding-provider';

export interface ProjectSummaryData {
  projectType?: string;
  areaSqft?: number;
  finishLevel?: 'economy' | 'standard' | 'premium';
  timeline?: string;
  goals?: string;
  photosCount?: number;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface FieldChangeInfo {
  field: keyof ProjectSummaryData;
  value: string | number | undefined;
  displayValue: string;
  fieldLabel: string;
}

interface ProjectSummarySidebarProps {
  data: ProjectSummaryData;
  isLoading?: boolean;
  className?: string;
  onDataChange?: (data: Partial<ProjectSummaryData>, changeInfo?: FieldChangeInfo) => void;
  onSubmitRequest?: () => void;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen Renovation',
  bathroom: 'Bathroom Renovation',
  basement: 'Basement Finishing',
  flooring: 'Flooring Installation',
  painting: 'Painting',
  exterior: 'Exterior Work',
  other: 'General Renovation',
};

const PROJECT_TYPE_OPTIONS = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'basement', label: 'Basement' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'painting', label: 'Painting' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'other', label: 'Other' },
];

const FINISH_LEVEL_OPTIONS = [
  { value: 'economy', label: 'Economy' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
];

const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'ASAP' },
  { value: '1-3mo', label: '1-3 months' },
  { value: '3-6mo', label: '3-6 months' },
  { value: '6-12mo', label: '6-12 months' },
  { value: 'planning', label: 'Just planning' },
];

interface EditableFieldProps {
  label: string;
  value: string | number | undefined;
  displayValue?: string | undefined;
  isLoading?: boolean | undefined;
  onSave: (value: string) => void;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  suffix?: string;
}

function EditableField({
  label,
  value,
  displayValue,
  isLoading,
  onSave,
  type = 'text',
  options,
  placeholder,
  suffix,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));

  const handleSave = useCallback(() => {
    onSave(editValue);
    setIsEditing(false);
  }, [editValue, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(String(value ?? ''));
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const hasValue = value !== undefined && value !== '' && value !== null;

  if (isEditing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <div className="flex items-center gap-1">
          {type === 'select' && options ? (
            <Select
              value={editValue}
              onValueChange={(v) => {
                setEditValue(v);
                onSave(v);
                setIsEditing(false);
              }}
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <Input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 w-20 text-xs"
                placeholder={placeholder}
                autoFocus
              />
              {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
            </>
          )}
          {type !== 'select' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleSave}
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCancel}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm text-muted-foreground">{label}</span>
      {isLoading ? (
        <Skeleton className="h-5 w-20" />
      ) : hasValue ? (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 hover:bg-muted/50 rounded px-1.5 py-0.5 -mr-1.5 transition-colors"
        >
          <Check className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-medium">
            {displayValue ?? value}
            {suffix && ` ${suffix}`}
          </span>
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
        >
          Add
        </button>
      )}
    </div>
  );
}

export function EstimateSidebar({
  data,
  isLoading,
  className,
  onDataChange,
  onSubmitRequest,
}: ProjectSummarySidebarProps) {
  const branding = useBranding();
  const [isExpanded, setIsExpanded] = useState(true);

  // Field label mapping for friendly chat acknowledgements
  const fieldLabels: Record<string, string> = {
    projectType: 'project type',
    areaSqft: 'room size',
    finishLevel: 'finish level',
    timeline: 'timeline',
    goals: 'project goals',
  };

  // Get display value for a field
  const getDisplayValue = (field: keyof ProjectSummaryData, value: string): string => {
    if (field === 'projectType') {
      return PROJECT_TYPE_LABELS[value] || value;
    }
    if (field === 'finishLevel') {
      return FINISH_LEVEL_OPTIONS.find(o => o.value === value)?.label || value;
    }
    if (field === 'timeline') {
      return TIMELINE_OPTIONS.find(o => o.value === value)?.label || value;
    }
    if (field === 'areaSqft') {
      return `${value} sqft`;
    }
    return value;
  };

  const handleFieldChange = useCallback(
    (field: keyof ProjectSummaryData) => (value: string) => {
      if (onDataChange) {
        // Convert to number for numeric fields
        const processedValue = field === 'areaSqft' ? parseInt(value, 10) || undefined : value;
        const displayValue = getDisplayValue(field, value);
        const changeInfo: FieldChangeInfo = {
          field,
          value: processedValue,
          displayValue,
          fieldLabel: fieldLabels[field] || field,
        };
        onDataChange({ [field]: processedValue }, changeInfo);
      }
    },
    [onDataChange]
  );

  // Check if we have minimum data to submit
  const hasMinimumData =
    data.projectType && (data.areaSqft || data.goals || data.photosCount);

  return (
    <Card className={cn('bg-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Your Project</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          'space-y-4 transition-all duration-200',
          !isExpanded && 'lg:block hidden'
        )}
      >
        {/* Project details */}
        <div className="space-y-2.5">
          <EditableField
            label="Project Type"
            value={data.projectType}
            displayValue={
              data.projectType ? PROJECT_TYPE_LABELS[data.projectType] || data.projectType : undefined
            }
            isLoading={isLoading}
            onSave={handleFieldChange('projectType')}
            type="select"
            options={PROJECT_TYPE_OPTIONS}
          />

          <EditableField
            label="Room Size"
            value={data.areaSqft}
            displayValue={data.areaSqft ? `~${data.areaSqft}` : undefined}
            isLoading={isLoading}
            onSave={handleFieldChange('areaSqft')}
            type="number"
            placeholder="e.g. 200"
            suffix="sqft"
          />

          <EditableField
            label="Timeline"
            value={data.timeline}
            displayValue={
              data.timeline
                ? TIMELINE_OPTIONS.find((o) => o.value === data.timeline)?.label || data.timeline
                : undefined
            }
            isLoading={isLoading}
            onSave={handleFieldChange('timeline')}
            type="select"
            options={TIMELINE_OPTIONS}
          />

          <EditableField
            label="Finish Level"
            value={data.finishLevel}
            displayValue={
              data.finishLevel
                ? FINISH_LEVEL_OPTIONS.find((o) => o.value === data.finishLevel)?.label
                : undefined
            }
            isLoading={isLoading}
            onSave={handleFieldChange('finishLevel')}
            type="select"
            options={FINISH_LEVEL_OPTIONS}
          />
        </div>

        {/* Goals/Notes - truncated display */}
        {data.goals && (
          <>
            <hr className="border-border" />
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Goals</span>
              <p className="text-sm line-clamp-2">{data.goals}</p>
            </div>
          </>
        )}

        {/* Photos indicator */}
        {(data.photosCount ?? 0) > 0 && (
          <>
            <hr className="border-border" />
            <div className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span>
                {data.photosCount} photo{data.photosCount !== 1 ? 's' : ''} uploaded
              </span>
              <Badge variant="secondary" className="ml-auto">
                <Check className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            </div>
          </>
        )}

        {/* Submit Request CTA */}
        {hasMinimumData && onSubmitRequest && (
          <>
            <hr className="border-border" />
            <Button
              onClick={onSubmitRequest}
              className="w-full"
              size="lg"
            >
              Submit Request
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Get a detailed quote from {branding.name}
            </p>
          </>
        )}

        {/* Empty state guidance */}
        {!hasMinimumData && !isLoading && (
          <>
            <hr className="border-border" />
            <p className="text-sm text-muted-foreground text-center py-2">
              Tell us about your project to get started
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Re-export with legacy name for backwards compatibility
export { EstimateSidebar as ProjectSummarySidebar };

// Legacy interface for backwards compatibility
export interface EstimateData extends ProjectSummaryData {
  // These fields are kept for internal calculations but not displayed
  estimateLow?: number;
  estimateHigh?: number;
  breakdown?: {
    materials: number;
    labor: number;
    hst: number;
  };
}
