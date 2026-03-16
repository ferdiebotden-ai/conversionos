'use client';

/**
 * Photo Gallery
 * Displays uploaded photos and AI-generated visualizations
 * [DEV-052]
 */

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhotoLightbox } from './photo-lightbox';
import { ImageIcon, Star } from 'lucide-react';

interface PhotoGalleryProps {
  uploadedPhotos: string[] | null;
  generatedConcepts: string[] | null;
  featuredConceptUrl?: string | null | undefined;
}

interface GalleryImage {
  url: string;
  type: 'uploaded' | 'generated';
}

export function PhotoGallery({
  uploadedPhotos,
  generatedConcepts,
  featuredConceptUrl,
}: PhotoGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  // Combine all images with their types
  const images: GalleryImage[] = [
    ...(uploadedPhotos || []).map((url) => ({ url, type: 'uploaded' as const })),
    ...(generatedConcepts || []).map((url) => ({
      url,
      type: 'generated' as const,
    })),
  ];

  if (images.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photos & Visualizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-3 opacity-20" />
            <p>No photos uploaded</p>
            <p className="text-sm">Photos will appear here when available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photos & Visualizations</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Featured concept — customer's starred pick */}
          {featuredConceptUrl && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium">Customer&apos;s Favourite</span>
              </div>
              <button
                onClick={() =>
                  setSelectedImage({ url: featuredConceptUrl, type: 'generated' })
                }
                className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
              >
                <Image
                  src={featuredConceptUrl}
                  alt="Customer's favourite concept"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <Badge
                  variant="secondary"
                  className="absolute top-2 left-2 text-xs bg-yellow-100 text-yellow-800"
                >
                  <Star className="h-3 w-3 mr-1 fill-yellow-600" />
                  Starred
                </Badge>
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((image, index) => (
              <button
                key={`${image.type}-${index}`}
                onClick={() => setSelectedImage(image)}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
              >
                <Image
                  src={image.url}
                  alt={
                    image.type === 'uploaded'
                      ? `Uploaded photo ${index + 1}`
                      : `AI visualization ${index + 1}`
                  }
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                <Badge
                  variant="secondary"
                  className={`absolute top-2 left-2 text-xs ${
                    image.type === 'generated'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {image.type === 'generated' ? 'AI' : 'Uploaded'}
                </Badge>
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
            {uploadedPhotos && uploadedPhotos.length > 0 && (
              <span>{uploadedPhotos.length} uploaded</span>
            )}
            {generatedConcepts && generatedConcepts.length > 0 && (
              <span>{generatedConcepts.length} AI generated</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {selectedImage && (
        <PhotoLightbox
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          allImages={images}
          onNavigate={setSelectedImage}
        />
      )}
    </>
  );
}
