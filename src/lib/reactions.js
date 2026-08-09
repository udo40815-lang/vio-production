// ============================================================================
// Vio — Reactions Service
// Reactions: like, love
// Uses atomic toggle_reaction RPC for reliable single-round-trip mutations.
// UNIQUE(post_id, user_id) prevents duplicates at DB level.
// ============================================================================

import { supabase } from './supabase.js';

export const REACTIONS = ['like', 'love'];

export const REACTION_ICONS = {
  like: 'ThumbsUp',
  love: 'Heart',
};

export const REACTION_CONFIG = {
  like: { icon: 'ThumbsUp', label: 'Like', color: V.royal },
  love: { icon: 'Heart',    label: 'Love', color: '#EF4444' },
};

/**
 * Atomic toggle: sets or removes a reaction on a post.
 * Uses the toggle_reaction SECURITY DEFINER RPC for a single atomic operation.
 *
 * @param {string} postId
 * @param {string} reaction — 'like' or 'love'
 * @returns {{ reaction: string|null, error }}
 */
export async function toggleReaction(postId, reaction) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { reaction: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase.rpc('toggle_reaction', {
    p_post_id: postId,
    p_user_id: user.id,
    p_reaction: reaction,
  });

  if (error) {
    console.error('[Vio] toggle_reaction RPC failed:', error);
    return { reaction: null, error };
  }

  // data is the resulting reaction ('like', 'love', or null)
  return { reaction: data || null, error: null };
}

/**
 * Simple like toggle (single-tap on the like button).
 * Toggles 'like' using the atomic RPC.
 */
export async function toggleLike(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: new Error('Not authenticated') };

  const { data, error } = await supabase.rpc('toggle_reaction', {
    p_post_id: postId,
    p_user_id: user.id,
    p_reaction: 'like',
  });

  if (error) return { liked: false, error };
  return { liked: data === 'like', error: null };
}

/** Get current user's reactions for multiple posts (batched). */
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

/** Get reaction counts for multiple posts (batched). */
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
