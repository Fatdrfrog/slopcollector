/**
 * Supabase Storage utilities
 * Helper functions for getting public URLs from storage buckets
 */

import { getSupabaseConfig } from './config';

/**
 * Get public URL for a file in Supabase Storage
 * @param bucket - Storage bucket name (e.g., 'assets')
 * @param path - File path within the bucket (e.g., 'hi.mp4')
 * @returns Public URL for the file
 */
export function getStorageUrl(bucket: string, path: string): string {
  const { url } = getSupabaseConfig();
  
  // Remove trailing slash from URL if present
  const baseUrl = url.replace(/\/$/, '');
  
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Get video URLs from assets bucket
 */
export const videoUrls = {
  hi: () => getStorageUrl('assets', 'hi.mp4'),
  racoon: () => getStorageUrl('assets', 'racoon.mp4'),
};

