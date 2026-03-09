'use client';

/**
 * Photo Upload
 * Drag & drop zone with preview and tips
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Image as ImageIcon,
  X,
  Camera,
  Sun,
  Maximize,
  Trash2,
  Focus,
} from 'lucide-react';
import { compressImage, fileToBase64 } from '@/lib/utils/image';

interface PhotoUploadProps {
  value: string | null;
  onChange: (value: string | null, file: File | null) => void;
  className?: string;
}

export function PhotoUpload({ value, onChange, className }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);

      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error('Please upload an image file');
        }

        // Validate file size (max 20MB before compression)
        if (file.size > 20 * 1024 * 1024) {
          throw new Error('Image too large. Maximum size is 20MB.');
        }

        // Compress and convert
        const compressed = await compressImage(file);
        const base64 = await fileToBase64(compressed);

        // Resolution check
        const img = new window.Image();
        img.src = base64;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
        });
        if (img.naturalWidth < 320 || img.naturalHeight < 240) {
          throw new Error('Image is too small for AI visualization. Please use a larger photo (minimum 320x240 pixels).');
        }

        onChange(base64, compressed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process image');
        onChange(null, null);
      } finally {
        setIsProcessing(false);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleRemove = useCallback(() => {
    onChange(null, null);
    setError(null);
  }, [onChange]);

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-semibold">Upload your photo</h3>
        <p className="text-sm text-muted-foreground">
          Add a photo of the room you want to reimagine
        </p>
      </div>

      {value ? (
        // Preview state
        <div className="relative rounded-xl overflow-hidden border-2 border-border">
          <img
            src={value}
            alt="Uploaded room"
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <span className="text-white text-sm font-medium">
              Photo uploaded
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRemove}
              className="bg-white/90 hover:bg-white"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : isMobile ? (
        // Mobile upload — single button, OS handles camera vs gallery
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="sr-only"
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-14 text-base gap-3"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
            {isProcessing ? 'Processing...' : 'Upload a Photo'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Snap a photo of your room or choose one from your gallery
          </p>
        </div>
      ) : (
        // Desktop upload — hidden input + clickable drop zone
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="sr-only"
            disabled={isProcessing}
            aria-label="Upload room photo"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'group rounded-xl border-2 cursor-pointer transition-all duration-200',
              'flex flex-col items-center justify-center py-14 px-6',
              isDragging
                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                : 'border-border bg-gradient-to-b from-muted/40 to-muted/20 hover:border-primary/60 hover:shadow-md hover:shadow-primary/5 active:border-primary active:bg-primary/5',
              isProcessing && 'opacity-50 pointer-events-none'
            )}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-200 bg-primary/10 group-hover:bg-primary/15 group-active:bg-primary/20">
              {isProcessing ? (
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-8 h-8 transition-colors text-primary/70 group-hover:text-primary group-active:text-primary" />
              )}
            </div>

            <p className="text-center">
              <span className="text-base font-semibold">
                {isProcessing ? 'Processing your photo...' : 'Your AI renovation starts here'}
              </span>
              <br />
              <span className="text-sm text-muted-foreground mt-1">
                Drop your image or click to browse
              </span>
            </p>

            <div className="flex items-center gap-4 mt-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                JPG, PNG
              </span>
              <span className="flex items-center gap-1">
                <Camera className="w-3 h-3" />
                Max 20MB
              </span>
            </div>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Tips grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Sun, label: 'Good Lighting', desc: 'Natural light works best' },
          { icon: Maximize, label: 'Wide Shot', desc: 'Shoot from a corner' },
          { icon: Trash2, label: 'Clear Clutter', desc: 'Cleaner visualizations' },
          { icon: Focus, label: 'Key Features', desc: 'Include what to transform' },
        ].map((tip) => (
          <div key={tip.label} className="flex flex-col items-center text-center gap-2 p-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <tip.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{tip.label}</p>
              <p className="text-xs text-muted-foreground">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
