/**
 * Optimizes Supabase Storage image URLs using the built-in image transformation API.
 * Converts to WebP and resizes to fit the specified dimensions.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url) return '';
  
  const { width = 640, height, quality = 75 } = options;

  // Only transform Supabase storage URLs
  if (!url.includes('supabase.co/storage/v1/object/public/')) {
    return url;
  }

  // Convert /object/public/ to /render/image/public/ for transformation API
  const transformUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const params = new URLSearchParams();
  if (width) params.set('width', String(width));
  if (height) params.set('height', String(height));
  params.set('quality', String(quality));
  params.set('format', 'origin');

  return `${transformUrl}?${params.toString()}`;
}
