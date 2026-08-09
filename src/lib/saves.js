// ============================================================================
// Vio — Saved Posts Service
// CRUD operations on public.saved_posts table.
// Saved posts are private — only the owner can see their saves (RLS enforced).
// UNIQUE(post_id, user_id) prevents duplicate saves.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Get all saved post IDs for the current user (efficient batch query).
 * Use this to determine which posts are saved when loading the feed.
 * @returns {{ savedIds: string[], error }}
 */
export async function getMySavedIds() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { savedIds: [], error: null };

  const { data, error } = await supabase
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', user.id);

  if (error) return { savedIds: [], error };

  return { savedIds: (data || []).map(r => r.post_id), error: null };
}

/**
 * Toggle save on a post.
 * Uses the database UNIQUE constraint to prevent duplicates.
 * @param {string} postId
 * @returns {{ saved: boolean, error }}
 */
export async function toggleSave(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: new Error('Not authenticated') };

  // Check if already saved
  const { data: existing } = await supabase
    .from('saved_posts')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Unsave — delete the record
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('id', existing.id);

    if (error) {
      console.error('[Vio] Failed to unsave post:', error);
      return { saved: true, error }; // still saved because delete failed
    }
    return { saved: false, error: null };
  }

  // Save — insert new record (UNIQUE constraint prevents duplicates)
  const { error } = await supabase
    .from('saved_posts')
    .insert({ post_id: postId, user_id: user.id });

  if (error) {
    // If it's a duplicate (race condition), treat as saved
    if (error.code === '23505') {
      return { saved: true, error: null };
    }
    console.error('[Vio] Failed to save post:', error);
    return { saved: false, error };
  }

  return { saved: true, error: null };
}

/**
 * Get all saved posts for current user (with full post data).
 * @param {{ limit?: number, offset?: number }} [options]
 * @returns {{ posts: [], error, count }}
 */
export async function getSavedPosts({ limit = 50, offset = 0 } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { posts: [], error: new Error('Not authenticated'), count: 0 };

  const { data, error, count } = await supabase
    .from('saved_posts')
    .select('post_id, created_at, posts(*)', { count: 'estimated' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Flatten: extract posts from the join
  const flattened = (data || []).map(row => ({
    ...row.posts,
    saved_at: row.created_at,
  })).filter(Boolean);

  return { posts: flattened, error, count };
}

/**
 * Check if current user has saved a specific post.
 * @param {string} postId
 * @returns {{ saved: boolean, error }}
 */
export async function isSaved(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: null };

  const { data, error } = await supabase
    .from('saved_posts')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  return { saved: !!data, error };
}
