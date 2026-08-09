// ============================================================================
// Vio — Comments Service
// CRUD operations on the public.comments table.
// Supports nested replies via the parent_id field.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Add a comment to a post.
 * @param {string} postId
 * @param {string} content
 * @param {string} [parentId] — set for replies
 * @returns {{ comment, error }}
 */
export async function addComment(postId, content, parentId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { comment: null, error: new Error('Not authenticated') };

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      author_handle: profile?.username || 'user',
      author_name: profile?.display_name || profile?.username || 'Creator',
      content: content.trim(),
      parent_id: parentId || null,
    })
    .select('*')
    .single();

  // Increment post comment count
  if (!error) {
    await supabase.rpc('increment_comments', { post_id: postId });
  }

  return { comment: data, error };
}

/**
 * Get all comments for a post, ordered by creation time.
 * Includes nested replies.
 * @param {string} postId
 * @returns {{ comments: [], error }}
 */
export async function getPostComments(postId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles!comments_user_id_fkey(username, display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  // Flatten profile data into each comment for live sync
  const enriched = (data || []).map(c => ({
    ...c,
    author_handle: c.profiles?.username || c.author_handle || 'unknown',
    author_name: c.profiles?.display_name || c.author_name || 'Unknown',
    author_avatar_url: c.profiles?.avatar_url || '',
  }));

  // Organize into threads: top-level comments + nested replies
  if (!enriched.length) return { comments: [], error };

  const topLevel = enriched.filter(c => !c.parent_id);
  const replies = enriched.filter(c => c.parent_id);

  const threaded = topLevel.map(comment => ({
    ...comment,
    replies: replies.filter(r => r.parent_id === comment.id),
  }));

  return { comments: threaded, error };
}

/**
 * Delete a comment (only owner can delete via RLS).
 * @param {string} commentId
 * @param {string} postId — needed to decrement count
 * @returns {{ error }}
 */
export async function deleteComment(commentId, postId) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (!error && postId) {
    await supabase.rpc('decrement_comments', { post_id: postId });
  }

  return { error };
}

/**
 * Get comment count for a post.
 * @param {string} postId
 * @returns {number}
 */
export async function getCommentCount(postId) {
  const { count } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);
  return count || 0;
}
