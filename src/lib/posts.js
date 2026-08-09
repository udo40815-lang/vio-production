// ============================================================================
// Vio — Posts Service
// CRUD operations on the public.posts table.
// All RLS policies are enforced at the database level.
// ============================================================================

import { supabase } from './supabase.js';
import { uploadPostMedia } from './storage.js';

/**
 * Create a new post.
 * @param {object} postData
 * @param {string} postData.content      — Text content
 * @param {File}   [postData.mediaFile]  — Optional media file to upload
 * @param {string} [postData.mediaKind]  — 'text' | 'image' | 'video'
 * @returns {{ post, error }}
 */
export async function createPost({ content, mediaFile, mediaKind = 'text' } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { post: null, error: new Error('Not authenticated') };

  // Fetch user profile for handle/name
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, reputation')
    .eq('user_id', user.id)
    .single();

  let mediaUrl = '';
  let finalKind = mediaKind;

  // Upload media file if provided
  if (mediaFile && (mediaKind === 'image' || mediaKind === 'video')) {
    const result = await uploadPostMedia(mediaFile);
    if (result.url) {
      mediaUrl = result.url;
      finalKind = mediaFile.type.startsWith('video/') ? 'video' : 'image';
    } else if (result.error) {
      return { post: null, error: result.error };
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      author_handle: profile?.username || 'user',
      author_name: profile?.display_name || profile?.username || 'Creator',
      content: content?.trim() || '',
      media_url: mediaUrl,
      media_kind: mediaUrl ? finalKind : (content?.trim() ? 'gradient' : 'text'),
      reputation: profile?.reputation || 0,
    })
    .select('*')
    .single();

  return { post: data, error };
}

/**
 * Fetch the home feed — all posts ordered by created_at DESC.
 * @param {object} options
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @returns {{ posts, error, count }}
 */
export async function getFeed({ limit = 50, offset = 0 } = {}) {
  const { data, error, count } = await supabase
    .from('posts')
    .select('*, profiles!posts_author_id_fkey(username, display_name, avatar_url)', { count: 'estimated' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Flatten: pull profile fields up so PostCard doesn't need to change shape
  const posts = (data || []).map(post => ({
    ...post,
    author_handle: post.profiles?.username || post.author_handle || 'unknown',
    author_name: post.profiles?.display_name || post.author_name || 'Unknown',
    author_avatar_url: post.profiles?.avatar_url || '',
  }));

  return { posts, error, count };
}

/**
 * Fetch posts by a specific user.
 * @param {string} user_id
 * @param {object} options
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @returns {{ posts, error, count }}
 */
export async function getUserPosts(user_id, { limit = 50, offset = 0 } = {}) {
  const { data, error, count } = await supabase
    .from('posts')
    .select('*, profiles!posts_author_id_fkey(username, display_name, avatar_url)', { count: 'estimated' })
    .eq('author_id', user_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const posts = (data || []).map(post => ({
    ...post,
    author_handle: post.profiles?.username || post.author_handle || 'unknown',
    author_name: post.profiles?.display_name || post.author_name || 'Unknown',
    author_avatar_url: post.profiles?.avatar_url || '',
  }));

  return { posts, error, count };
}

/**
 * Fetch posts by username (for profile page).
 * @param {string} username
 * @param {object} options
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @returns {{ posts, error, count }}
 */
export async function getPostsByUsername(username, { limit = 50, offset = 0 } = {}) {
  const { data, error, count } = await supabase
    .from('posts')
    .select('*, profiles!posts_author_id_fkey(username, display_name, avatar_url)', { count: 'estimated' })
    .eq('author_handle', username)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const posts = (data || []).map(post => ({
    ...post,
    author_handle: post.profiles?.username || post.author_handle || 'unknown',
    author_name: post.profiles?.display_name || post.author_name || 'Unknown',
    author_avatar_url: post.profiles?.avatar_url || '',
  }));

  return { posts, error, count };
}

/**
 * Fetch a single post by ID.
 * @param {string} id
 * @returns {{ post, error }}
 */
export async function getPost(id) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles!posts_author_id_fkey(username, display_name, avatar_url)')
    .eq('id', id)
    .single();

  if (data) {
    data.author_handle = data.profiles?.username || data.author_handle || 'unknown';
    data.author_name = data.profiles?.display_name || data.author_name || 'Unknown';
    data.author_avatar_url = data.profiles?.avatar_url || '';
  }

  return { post: data, error };
}

/**
 * Update a post (only the owner can update via RLS).
 * @param {string} id
 * @param {object} patch — e.g. { content, media_kind, media_url }
 * @returns {{ post, error }}
 */
export async function updatePost(id, patch) {
  const allowed = [
    'content', 'media_url', 'media_kind', 'tags',
    'visibility_score', 'boost_status',
    'likes_count', 'comments_count', 'shares_count',
    'vicoins_earned', 'reputation',
  ];
  const sanitized = {};
  for (const key of allowed) {
    if (key in patch) sanitized[key] = patch[key];
  }

  if (Object.keys(sanitized).length === 0) {
    return { post: null, error: new Error('No valid fields to update') };
  }

  const { data, error } = await supabase
    .from('posts')
    .update(sanitized)
    .eq('id', id)
    .select('*')
    .single();

  return { post: data, error };
}

/**
 * Delete a post (only the owner can delete via RLS).
 * @param {string} id
 * @returns {{ error }}
 */
export async function deletePost(id) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);

  return { error };
}

/**
 * Subscribe to real-time post changes.
 * @param {function} callback — receives (payload: { eventType, new, old })
 * @param {object} [filter] — optional filter { event: 'INSERT'|'UPDATE'|'DELETE' }
 * @returns {function} unsubscribe
 */
export function subscribeToPosts(callback, filter = {}) {
  const channel = supabase
    .channel('public:posts')
    .on(
      'postgres_changes',
      {
        event: filter.event || '*',
        schema: 'public',
        table: 'posts',
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Search posts by content text (partial match in content field).
 * @param {string} query
 * @param {{ limit?: number }} [options]
 * @returns {{ posts: [], error }}
 */
export async function searchPosts(query, { limit = 20 } = {}) {
  const q = query?.trim();
  if (!q) return { posts: [], error: null };

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles!posts_author_id_fkey(username, display_name, avatar_url)')
    .ilike('content', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  const posts = (data || []).map(post => ({
    ...post,
    author_handle: post.profiles?.username || post.author_handle || 'unknown',
    author_name: post.profiles?.display_name || post.author_name || 'Unknown',
    author_avatar_url: post.profiles?.avatar_url || '',
  }));

  return { posts, error };
}
