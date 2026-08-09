// ============================================================================
// Vio — Likes Service
// CRUD operations on the public.likes table.
// All RLS policies are enforced at the database level.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Toggle like on a post. If already liked, unlike it.
 * @param {string} postId
 * @returns {{ liked: boolean, count: number, error }}
 */
export async function toggleLike(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, count: 0, error: new Error('Not authenticated') };

  // Check if already liked
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existing.id);

    if (error) return { liked: false, count: 0, error };

    // Decrement post likes_count
    await supabase.rpc('decrement_likes', { post_id: postId });

    const count = await getLikeCount(postId);
    return { liked: false, count, error: null };
  }

  // Like
  const { error } = await supabase
    .from('likes')
    .insert({ post_id: postId, user_id: user.id });

  if (error) return { liked: false, count: 0, error };

  // Increment post likes_count
  await supabase.rpc('increment_likes', { post_id: postId });

  const count = await getLikeCount(postId);
  return { liked: true, count, error: null };
}

/**
 * Get like count for a post.
 * @param {string} postId
 * @returns {number}
 */
async function getLikeCount(postId) {
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);
  return count || 0;
}

/**
 * Check if current user has liked a post.
 * @param {string} postId
 * @returns {{ liked: boolean, error }}
 */
export async function isLiked(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: null };

  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  return { liked: !!data, error };
}

/**
 * Get all likes for a post (user IDs only).
 * @param {string} postId
 * @returns {{ likes: [], error }}
 */
export async function getPostLikes(postId) {
  const { data, error } = await supabase
    .from('likes')
    .select('user_id, created_at')
    .eq('post_id', postId);

  return { likes: data || [], error };
}
