'use client';

/**
 * Before/After Comparison Component for Admin
 * Reuses the visualizer's BeforeAfterSlider with admin-specific styling
 */

import { BeforeAfterSlider } from '@/components/visualizer/before-after-slider';
import { cn } from '@/lib/utils';

interface BeforeAfterComparisonProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function BeforeAfterComparison({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
}: BeforeAfterComparisonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <BeforeAfterSlider
        beforeImage={beforeImage}
        afterImage={afterImage}
        beforeLabel={beforeLabel}
        afterLabel={afterLabel}
        className="rounded-lg shadow-md"
      />
      <p className="text-xs text-muted-foreground text-center">
        Drag the slider to compare before and after
      </p>
    </div>
  );
}
