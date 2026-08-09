// ============================================================================
// Vio — Saved Posts Service
// CRUD operations on the public.saved_posts table.
// Saved posts are private — only the owner can see their saves (RLS enforced).
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Toggle save on a post.
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
    // Unsave
    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('id', existing.id);
    return { saved: false, error };
  }

  // Save
  const { error } = await supabase
    .from('saved_posts')
    .insert({ post_id: postId, user_id: user.id });

  return { saved: !error, error };
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
 * Check if current user has saved a post.
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
