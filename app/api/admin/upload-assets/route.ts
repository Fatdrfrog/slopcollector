/**
 * One-time API route to upload assets to Supabase Storage
 * Call this endpoint once: POST /api/admin/upload-assets
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment variables
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getServiceClient } from '@/lib/supabase/serviceClient';

export async function POST() {
  try {
    const supabase = getServiceClient();
    const bucketName = 'assets';
    
    const files = [
      { path: 'public/hi.mp4', storagePath: 'hi.mp4', contentType: 'video/mp4' },
      { path: 'public/racoon.mp4', storagePath: 'racoon.mp4', contentType: 'video/mp4' },
      { path: 'public/logo.png', storagePath: 'logo.png', contentType: 'image/png' },
    ];

    const results = [];

    for (const file of files) {
      try {
        const filePath = join(process.cwd(), file.path);
        const fileBuffer = readFileSync(filePath);

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(file.storagePath, fileBuffer, {
            contentType: file.contentType,
            upsert: true,
          });

        if (error) {
          results.push({ file: file.storagePath, success: false, error: error.message });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(file.storagePath);

        results.push({ 
          file: file.storagePath, 
          success: true, 
          url: urlData.publicUrl 
        });
      } catch (err) {
        results.push({ 
          file: file.storagePath, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results 
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload assets',
        hint: 'Make sure SUPABASE_SERVICE_ROLE_KEY is set in your environment variables'
      },
      { status: 500 }
    );
  }
}

