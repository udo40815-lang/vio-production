// ============================================================================
// Vio — Comments Service
// CRUD operations on the public.comments table.
// Supports nested replies via the parent_id field.
//
// NOTE: author_handle and author_name are stored directly on each comment row
// at insert time — no join to profiles is needed for display.
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

  // Fetch the current user's profile for author metadata
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
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

  if (error) {
    console.error('[Vio] Failed to insert comment:', error);
    return { comment: null, error };
  }

  // Update post comment count — use a direct count-based update
  // This is more robust than an RPC that may not exist
  try {
    const { count: newCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (newCount !== null) {
      await supabase
        .from('posts')
        .update({ comments_count: newCount })
        .eq('id', postId);
    }
  } catch (countErr) {
    // Non-critical — the comment itself was saved successfully
    console.warn('[Vio] Could not update post comment count:', countErr);
  }

  return { comment: data, error: null };
}

/**
 * Get all comments for a post, ordered by creation time.
 * Includes nested replies.
 * IMPORTANT: author_handle and author_name are stored on each comment row,
 * so no database join is required.
 * @param {string} postId
 * @returns {{ comments: [], error }}
 */
export async function getPostComments(postId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Vio] Failed to fetch comments:', error);
    return { comments: [], error };
  }

  if (!data || !data.length) {
    return { comments: [], error: null };
  }

  // Organize into threads: top-level comments + nested replies
  const topLevel = data.filter(c => !c.parent_id);
  const replies = data.filter(c => c.parent_id);

  const threaded = topLevel.map(comment => ({
    ...comment,
    replies: replies.filter(r => r.parent_id === comment.id),
  }));

  return { comments: threaded, error: null };
}

/**
 * Delete a comment (only owner can delete via RLS).
 * Updates the post comment count after deletion.
 * @param {string} commentId
 * @param {string} postId — needed to update count
 * @returns {{ error }}
 */
export async function deleteComment(commentId, postId) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('[Vio] Failed to delete comment:', error);
    return { error };
  }

  // Update post comment count
  if (postId) {
    try {
      const { count: newCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (newCount !== null) {
        await supabase
          .from('posts')
          .update({ comments_count: newCount })
          .eq('id', postId);
      }
    } catch (countErr) {
      console.warn('[Vio] Could not update post comment count after delete:', countErr);
    }
  }

  return { error: null };
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
