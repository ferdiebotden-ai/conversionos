/**
 * Supabase client wrapper for the demo project database.
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env.
 */

import { createClient } from '@supabase/supabase-js';

let supabase = null;

/**
 * Get or create the Supabase client singleton.
 * Supports both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL env var names.
 */
export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  supabase = createClient(url, key);
  return supabase;
}

/**
 * Upload a file to Supabase Storage.
 * @param {string} bucket - storage bucket name
 * @param {string} path - file path within bucket
 * @param {Buffer} content - file content
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} public URL
 */
export async function uploadToStorage(bucket, path, content, contentType) {
  const sb = getSupabase();
  const { error } = await sb.storage
    .from(bucket)
    .upload(path, content, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
