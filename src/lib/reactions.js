// ============================================================================
// Vio — Reactions Service
// Reactions: like, love
// One reaction per user per post. Choosing another replaces. Same → remove.
// UNIQUE(post_id, user_id) prevents duplicates at DB level.
// ============================================================================

import { supabase } from './supabase.js';

export const REACTIONS = ['like', 'love'];

// Reaction icon keys map to lucide icon names for the component layer.
// The DB stores 'like', 'love'.
export const REACTION_ICONS = {
  like: 'ThumbsUp',
  love: 'Heart',
};

export const REACTION_CONFIG = {
  like: { icon: 'ThumbsUp', label: 'Like', color: '#3B82F6' },
  love: { icon: 'Heart',    label: 'Love', color: '#EF4444' },
};

/**
 * Toggle or set a reaction on a post.
 * If same reaction exists → remove it.
 * If different reaction exists → replace it.
 * If no reaction → create it.
 * @returns {{ reaction: string|null, error }}
 */
export async function toggleReaction(postId, reaction) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { reaction: null, error: new Error('Not authenticated') };

  const { data: existing } = await supabase
    .from('reactions')
    .select('id, reaction')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    if (existing.reaction === reaction) {
      // Same reaction — remove
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id);
      if (error) return { reaction: null, error };
      return { reaction: null, error: null };
    }
    // Different reaction — replace
    const { error } = await supabase
      .from('reactions')
      .update({ reaction, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { reaction: null, error };
    return { reaction, error: null };
  }

  // New reaction
  const { error } = await supabase
    .from('reactions')
    .insert({ post_id: postId, user_id: user.id, reaction });
  if (error) return { reaction: null, error };
  return { reaction, error: null };
}

/**
 * Simple like toggle (single-tap). Uses 'like' as default reaction.
 */
export async function toggleLike(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: new Error('Not authenticated') };

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);
    if (error) return { liked: false, error };
    return { liked: false, error: null };
  }

  const { error } = await supabase
    .from('reactions')
    .insert({ post_id: postId, user_id: user.id, reaction: 'like' });
  if (error) return { liked: false, error };
  return { liked: true, error: null };
}

/** Get current user's reactions for multiple posts (batched). Returns { postId: reactionType }. */
export async function getMyReactions(postIds) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !postIds.length) return { reactions: {}, error: null };

  const { data, error } = await supabase
    .from('reactions')
    .select('post_id, reaction')
    .eq('user_id', user.id)
    .in('post_id', postIds);

  if (error) return { reactions: {}, error };

  const map = {};
  for (const r of (data || [])) map[r.post_id] = r.reaction;
  return { reactions: map, error: null };
}

/** Get total like/reaction counts for multiple posts (batched). */
export async function getReactionCounts(postIds) {
  if (!postIds.length) return { counts: {}, error: null };

  const { data, error } = await supabase
    .from('reactions')
    .select('post_id, reaction')
    .in('post_id', postIds);

  if (error) return { counts: {}, error };

  // Aggregate
  const grouped = {};
  for (const r of (data || [])) {
    if (!grouped[r.post_id]) grouped[r.post_id] = { total: 0, types: {} };
    grouped[r.post_id].total++;
    grouped[r.post_id].types[r.reaction] = (grouped[r.post_id].types[r.reaction] || 0) + 1;
  }

  const result = {};
  for (const [postId, agg] of Object.entries(grouped)) {
    const sorted = Object.entries(agg.types).sort((a, b) => b[1] - a[1]);
    result[postId] = {
      total: agg.total,
      top3: sorted.slice(0, 3).map(([type]) => type),
      countsByType: Object.fromEntries(sorted),
    };
  }

  return { counts: result, error: null };
}

/** Get exact count for a single post. */
export async function getLikeCount(postId) {
  const { count } = await supabase
    .from('reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);
  return count || 0;
}

/** Get all reactors for a post (for who-reacted screen). */
export async function getPostLikers(postId) {
  const { data, error } = await supabase
    .from('reactions')
    .select('user_id, reaction, profiles!reactions_user_id_fkey(username, display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return { likers: [], error };

  const likers = (data || []).map(r => ({
    user_id: r.user_id,
    reaction: r.reaction,
    username: r.profiles?.username || 'unknown',
    display_name: r.profiles?.display_name || 'Unknown',
    avatar_url: r.profiles?.avatar_url || '',
  }));

  return { likers, error: null };
}

/** Subscribe to realtime reaction changes. */
export function subscribeToLikes(callback) {
  const channel = supabase
    .channel('public:reactions')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'reactions',
    }, (payload) => callback(payload))
    .subscribe();

  return () => supabase.removeChannel(channel);
}
