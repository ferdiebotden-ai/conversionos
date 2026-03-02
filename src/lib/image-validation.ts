/**
 * Image upload validation for AI endpoints.
 * Validates MIME type and decoded size before passing to AI models.
 */

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_DECODED_SIZE = 10 * 1024 * 1024; // 10MB

type ValidationResult = {
  valid: true;
} | {
  valid: false;
  error: string;
};

/**
 * Validate a base64 data URL image.
 * Checks MIME type against allowlist and decoded size against 10MB limit.
 */
export function validateImageUpload(dataUrl: string): ValidationResult {
  // Extract MIME type from data URL
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  if (!match) {
    return { valid: false, error: 'Invalid image format — expected a base64 data URL' };
  }

  const mimeType = match[1]!;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `Unsupported image type: ${mimeType}. Allowed: JPEG, PNG, WebP`,
    };
  }

  // Extract base64 payload and check decoded size
  const base64Data = dataUrl.slice(match[0].length);
  const decodedSize = Math.floor((base64Data.length * 3) / 4);
  if (decodedSize > MAX_DECODED_SIZE) {
    const sizeMB = (decodedSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image too large (${sizeMB}MB). Maximum allowed: 10MB`,
    };
  }

  return { valid: true };
}
