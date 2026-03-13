'use client';

/**
 * Photo Lightbox
 * Full-screen image viewer with download and navigation
 * [DEV-052]
 */

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryImage {
  url: string;
  type: 'uploaded' | 'generated';
}

interface PhotoLightboxProps {
  image: GalleryImage;
  onClose: () => void;
  allImages: GalleryImage[];
  onNavigate: (image: GalleryImage) => void;
}

export function PhotoLightbox({
  image,
  onClose,
  allImages,
  onNavigate,
}: PhotoLightboxProps) {
  const currentIndex = allImages.findIndex((img) => img.url === image.url);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allImages.length - 1;

  const handlePrev = useCallback(() => {
    const prevImage = allImages[currentIndex - 1];
    if (hasPrev && prevImage) {
      onNavigate(prevImage);
    }
  }, [hasPrev, allImages, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    const nextImage = allImages[currentIndex + 1];
    if (hasNext && nextImage) {
      onNavigate(nextImage);
    }
  }, [hasNext, allImages, currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    // Prevent scrolling when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, handlePrev, handleNext]);

  async function handleDownload() {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.type}-image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={`${
              image.type === 'generated'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {image.type === 'generated' ? 'AI Visualization' : 'Uploaded Photo'}
          </Badge>
          <span className="text-white/70 text-sm">
            {currentIndex + 1} of {allImages.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image */}
      <div
        className="relative w-full h-full max-w-[90vw] max-h-[80vh] mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={image.url}
          alt={
            image.type === 'uploaded' ? 'Uploaded photo' : 'AI visualization'
          }
          fill
          className="object-contain"
          sizes="90vw"
          priority
        />
      </div>

      {/* Navigation arrows */}
      {hasPrev && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}
      {hasNext && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        Use arrow keys to navigate, ESC to close
      </div>
    </div>
  );
}
