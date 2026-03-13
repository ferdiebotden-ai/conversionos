'use client';

/**
 * Photo Summary Bar
 * Compact sticky header showing the uploaded photo thumbnail,
 * detected room type, and a "Change photo" action during the form state
 */

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

interface PhotoSummaryBarProps {
  photoSrc: string;
  detectedRoomType?: string | undefined;
  analysisText?: string | undefined;
  isAnalyzing?: boolean | undefined;
  onChangePhoto: () => void;
  className?: string;
}

export function PhotoSummaryBar({
  photoSrc,
  detectedRoomType,
  analysisText,
  isAnalyzing,
  onChangePhoto,
  className,
}: PhotoSummaryBarProps) {
  // Format room type for display (e.g. "living_room" -> "Living Room")
  const roomTypeLabel = detectedRoomType
    ? detectedRoomType
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : undefined;

  return (
    <div
      className={cn(
        'sticky top-0 z-10',
        'flex items-center gap-3 px-4 py-2',
        'bg-background/80 backdrop-blur-sm border-b border-border',
        className
      )}
    >
      {/* Photo thumbnail */}
      <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-lg border border-border">
        <Image
          src={photoSrc}
          alt="Uploaded room photo"
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      {/* Room type badge + analysis summary */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {isAnalyzing ? (
          <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Emma is studying your space...
          </span>
        ) : (
          <>
            {roomTypeLabel && (
              <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full truncate w-fit">
                {roomTypeLabel}
              </span>
            )}
            {analysisText && (
              <span className="text-xs text-muted-foreground truncate">
                {analysisText}
              </span>
            )}
          </>
        )}
      </div>

      {/* Change photo action */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onChangePhoto}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Camera className="h-4 w-4 mr-1.5" />
        Change photo
      </Button>
    </div>
  );
}
