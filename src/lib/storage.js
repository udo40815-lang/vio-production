// ============================================================================
// Vio — Storage Service
// Secure file uploads to Supabase Storage buckets.
// - Profile pictures go to the 'avatars' bucket
// - Cover photos go to the 'covers' bucket
// - Files are stored under {user_id}/{filename} for RLS enforcement
// ============================================================================

import { supabase } from './supabase.js';

const BUCKETS = {
  avatars: 'avatars',
  covers: 'covers',
  'post-media': 'post-media',
};

const MAX_FILE_SIZE = {
  avatars: 5 * 1024 * 1024,  // 5 MB
  covers: 10 * 1024 * 1024,  // 10 MB
  'post-media': 50 * 1024 * 1024, // 50 MB
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
];

/**
 * Upload a profile picture.
 * @param {File} file
 * @returns {{ url: string|null, error: Error|null }}
 */
export async function uploadAvatar(file) {
  return uploadFileToBucket(file, BUCKETS.avatars);
}

/**
 * Upload a cover photo.
 * @param {File} file
 * @returns {{ url: string|null, error: Error|null }}
 */
export async function uploadCover(file) {
  return uploadFileToBucket(file, BUCKETS.covers);
}

/**
 * Core upload logic.
 * @param {File} file
 * @param {string} bucket
 * @returns {{ url: string|null, error: Error|null }}
 */
async function uploadFileToBucket(file, bucket, opts = {}) {
  // ---- Validate input ----
  if (!file) return { url: null, error: new Error('No file provided') };

  const mimeCheck = opts.allowedMimeTypes || ALLOWED_MIME_TYPES;
  if (!mimeCheck.includes(file.type)) {
    return { url: null, error: new Error(`Invalid file type: ${file.type}. Allowed: ${mimeCheck.join(', ')}`) };
  }

  const maxSize = opts.maxSize || MAX_FILE_SIZE[bucket] || 5 * 1024 * 1024;
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return { url: null, error: new Error(`File too large. Maximum size is ${maxMB} MB`) };
  }

  // ---- Get current user ----
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: new Error('Not authenticated') };

  // ---- Build a unique file path: {user_id}/{timestamp}-{sanitized-name} ----
  const ext = file.name.split('.').pop() || 'jpg';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${user.id}/${safeName}`;

  // ---- Upload ----
  const { data, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  // ---- Get public URL ----
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  const publicUrl = urlData?.publicUrl || null;

  // ---- Delete old file if one exists (cleanup) ----
  // We'll handle this by keeping the most recent file; old ones are orphaned
  // but can be cleaned up via a scheduled job if needed.

  return { url: publicUrl, error: null };
}

/**
 * Upload post media (images/videos).
 * @param {File} file
 * @returns {{ url: string|null, error: Error|null }}
 */
export async function uploadPostMedia(file) {
  return uploadFileToBucket(file, BUCKETS['post-media'], {
    allowedMimeTypes: ALLOWED_MEDIA_MIME_TYPES,
    maxSize: MAX_FILE_SIZE['post-media'],
  });
}

// Unified uploadFile for store.js compatibility ({ file, bucket })
export async function uploadFile({ file, bucket } = {}) {
  return uploadFileToBucket(file, bucket);
}
