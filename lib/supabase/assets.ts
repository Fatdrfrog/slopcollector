/**
 * Supabase Assets Management
 * Centralized asset URLs for videos, images, etc.
 */

export const ASSETS = {
  // Local development: serve from /public
  // Production: you can switch to Supabase Storage URLs
  RACCOON_VIDEO: '/racoon.mp4',
  HI_VIDEO: '/hi.mp4',
} as const;

/**
 * Get asset URL
 * For local dev: uses /public folder
 * For production: can use Supabase Storage or CDN
 */
export function getAssetUrl(asset: string): string {
  // For local development, just return the path
  return asset;
  
  // For Supabase Storage (uncomment when ready):
  // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // return `${supabaseUrl}/storage/v1/object/public/assets${asset}`;
}
