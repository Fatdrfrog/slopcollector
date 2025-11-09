/**
 * Supabase Assets Management
 * Centralized asset URLs for videos, images, etc.
 */

export const ASSETS = {
  RACCOON_VIDEO: '/racoon.mp4',
  HI_VIDEO: '/hi.mp4',
} as const;

/**
 * Get asset URL
 * DRY: Single function for all asset URLs
 */
export function getAssetUrl(asset: string): string {
  return asset;
}
