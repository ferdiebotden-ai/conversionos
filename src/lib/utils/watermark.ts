/**
 * Watermark Utility
 * Adds company branding and AI disclaimer to generated images
 */

export interface WatermarkOptions {
  text?: string;
  subtext?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  opacity?: number;
  padding?: number;
  fontSize?: number;
  fontFamily?: string;
}

const DEFAULT_OPTIONS: Required<WatermarkOptions> = {
  text: 'ConversionOS Demo',
  subtext: 'AI Visualization - For Concept Purposes Only',
  position: 'bottom-right',
  opacity: 0.85,
  padding: 20,
  fontSize: 16,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

/**
 * Load an image from a URL and return it as an HTMLImageElement
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Add watermark to an image and return as a downloadable blob
 */
export async function addWatermark(
  imageUrl: string,
  options: WatermarkOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Load the image
  const img = await loadImage(imageUrl);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // Draw the original image
  ctx.drawImage(img, 0, 0);

  // Calculate text dimensions
  ctx.font = `bold ${opts.fontSize}px ${opts.fontFamily}`;
  const mainTextMetrics = ctx.measureText(opts.text);

  ctx.font = `${opts.fontSize * 0.75}px ${opts.fontFamily}`;
  const subTextMetrics = ctx.measureText(opts.subtext);

  const boxWidth = Math.max(mainTextMetrics.width, subTextMetrics.width) + opts.padding * 2;
  const boxHeight = opts.fontSize * 2.5 + opts.padding * 1.5;

  // Calculate position
  let x: number;
  let y: number;

  switch (opts.position) {
    case 'top-left':
      x = opts.padding;
      y = opts.padding;
      break;
    case 'top-right':
      x = canvas.width - boxWidth - opts.padding;
      y = opts.padding;
      break;
    case 'bottom-left':
      x = opts.padding;
      y = canvas.height - boxHeight - opts.padding;
      break;
    case 'bottom-right':
    default:
      x = canvas.width - boxWidth - opts.padding;
      y = canvas.height - boxHeight - opts.padding;
      break;
  }

  // Draw watermark background
  ctx.fillStyle = `rgba(0, 0, 0, ${opts.opacity * 0.7})`;
  ctx.beginPath();
  ctx.roundRect(x, y, boxWidth, boxHeight, 8);
  ctx.fill();

  // Draw main text
  ctx.fillStyle = `rgba(255, 255, 255, ${opts.opacity})`;
  ctx.font = `bold ${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillText(opts.text, x + opts.padding, y + opts.padding);

  // Draw subtext
  ctx.fillStyle = `rgba(255, 255, 255, ${opts.opacity * 0.8})`;
  ctx.font = `${opts.fontSize * 0.75}px ${opts.fontFamily}`;
  ctx.fillText(
    opts.subtext,
    x + opts.padding,
    y + opts.padding + opts.fontSize * 1.3
  );

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',
      0.92 // High quality JPEG
    );
  });
}

/**
 * Download an image with watermark
 */
export async function downloadWithWatermark(
  imageUrl: string,
  filename: string = 'visualization.jpg',
  options: WatermarkOptions = {}
): Promise<void> {
  const blob = await addWatermark(imageUrl, options);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename for the visualization
 */
export function generateFilename(
  roomType: string,
  style: string,
  conceptIndex: number
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const room = roomType.replace(/_/g, '-');
  return `conversionosdemo-${room}-${style}-concept${conceptIndex + 1}-${timestamp}.jpg`;
}
