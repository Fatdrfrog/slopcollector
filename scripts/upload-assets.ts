/**
 * Upload assets to Supabase Storage
 * 
 * REQUIRES: Set SUPABASE_SERVICE_ROLE_KEY in your .env.local file
 * 
 * Run with: npx tsx scripts/upload-assets.ts
 * 
 * Or use the API route: POST /api/admin/upload-assets
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getServiceClient } from '../lib/supabase/serviceClient';

async function uploadAssets() {
  try {
    const supabase = getServiceClient();

    const bucketName = 'assets';
    const files = [
      { path: 'public/hi.mp4', storagePath: 'hi.mp4', contentType: 'video/mp4' },
      { path: 'public/racoon.mp4', storagePath: 'racoon.mp4', contentType: 'video/mp4' },
    ];

    console.log('🚀 Starting asset upload to Supabase Storage...\n');

    for (const file of files) {
      try {
        const filePath = join(process.cwd(), file.path);
        const fileBuffer = readFileSync(filePath);

        console.log(`📤 Uploading ${file.storagePath}...`);

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(file.storagePath, fileBuffer, {
            contentType: file.contentType,
            upsert: true, // Overwrite if exists
          });

        if (error) {
          console.error(`❌ Error uploading ${file.storagePath}:`, error.message);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(file.storagePath);

        console.log(`✅ Uploaded: ${file.storagePath}`);
        console.log(`   URL: ${urlData.publicUrl}\n`);
      } catch (err) {
        console.error(`❌ Failed to upload ${file.storagePath}:`, err);
      }
    }

    console.log('✨ Upload complete!');
  } catch (err) {
    throw err;
  }
}

uploadAssets().catch((err) => {
  console.error('❌ Upload failed:', err);
  console.error('\n💡 Make sure you have set SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
  console.error('   You can find it in: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
});

