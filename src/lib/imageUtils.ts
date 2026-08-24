/** Returns a Cloudflare-hosted static asset or R2 media URL unchanged. */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  _options: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url) return '';
  return url;
}
