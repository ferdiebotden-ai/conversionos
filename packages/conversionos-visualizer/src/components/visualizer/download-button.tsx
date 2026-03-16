'use client';

/**
 * Download Button
 * Downloads visualization with watermark and tracks download
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Check } from 'lucide-react';
import {
  downloadWithWatermark,
  generateFilename,
} from '@/lib/utils/watermark';
import { useBranding } from '@/components/branding-provider';

interface DownloadButtonProps {
  imageUrl: string;
  roomType: string;
  style: string;
  conceptIndex: number;
  visualizationId: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
  onBeforeDownload?: () => Promise<boolean> | boolean;
}

export function DownloadButton({
  imageUrl,
  roomType,
  style,
  conceptIndex,
  visualizationId,
  variant = 'outline',
  size = 'lg',
  showLabel = true,
  className,
  onBeforeDownload,
}: DownloadButtonProps) {
  const branding = useBranding();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    // Check if there's a pre-download callback (e.g., email capture)
    if (onBeforeDownload) {
      const proceed = await onBeforeDownload();
      if (!proceed) return;
    }

    setIsDownloading(true);

    try {
      const filename = generateFilename(roomType, style, conceptIndex);

      // Download with watermark
      await downloadWithWatermark(imageUrl, filename, {
        text: branding.name,
        subtext: 'AI Visualization - For Concept Purposes Only',
      });

      // Track the download
      await fetch(`/api/visualizations/${visualizationId}`, {
        method: 'POST',
      });

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isDownloading}
      className={className}
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {showLabel && <span className="ml-2">Downloading...</span>}
        </>
      ) : downloaded ? (
        <>
          <Check className="w-5 h-5 text-green-600" />
          {showLabel && <span className="ml-2">Downloaded!</span>}
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          {showLabel && <span className="ml-2">Download</span>}
        </>
      )}
    </Button>
  );
}
