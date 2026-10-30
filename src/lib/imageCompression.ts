/**
 * Image compression utility to drastically minimize token usage in Vision LLMs,
 * prevent TPM rate limit overflow (413 Payload Too Large), and keep Firestore
 * document size well below the 1MB limit.
 */

export interface CompressedImageResult {
  data: string; // base64 data URL
  name: string;
  size: number; // compressed bytes
  originalSize: number;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Resizes and compresses an image File using HTML Canvas
 *
 * @param file - The user uploaded image file
 * @param maxDimension - Max width or height in pixels (default 800px)
 * @param quality - JPEG compression quality 0.1 to 1.0 (default 0.75)
 */
export async function compressImage(
  file: File,
  maxDimension = 800,
  quality = 0.75
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image'));
    }

    // SVG images do not need canvas downsampling
    if (file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          data: reader.result as string,
          name: file.name,
          size: file.size,
          originalSize: file.size,
          mimeType: file.type,
          width: 800,
          height: 800,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to uncompressed if canvas context fails
          return resolve({
            data: event.target?.result as string,
            name: file.name,
            size: file.size,
            originalSize: file.size,
            mimeType: file.type,
            width,
            height,
          });
        }

        // Draw image smoothly with high quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to lightweight JPEG
        const outputMime = 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(outputMime, quality);

        // Calculate approximate byte size of base64 string
        const base64Length = compressedBase64.length - (compressedBase64.indexOf(',') + 1);
        const compressedBytes = Math.round((base64Length * 3) / 4);

        resolve({
          data: compressedBase64,
          name: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
          size: compressedBytes,
          originalSize: file.size,
          mimeType: outputMime,
          width,
          height,
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human readable format (e.g., 42 KB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

