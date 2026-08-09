// ============================================================================
// Vio — Follows Service
// CRUD operations on the public.follows table.
// Cannot follow yourself (enforced by DB CHECK).
// All counts are derived from the database — never from local state.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Toggle follow on a user.
 * After insert/delete, re-counts and updates both profiles' counters atomically.
 * @param {string} followingUserId — user ID to follow/unfollow
 * @returns {{ following: boolean, error }}
 */
export async function toggleFollow(followingUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { following: false, error: new Error('Not authenticated') };

  if (user.id === followingUserId) {
    return { following: false, error: new Error('Cannot follow yourself') };
  }

  // Check if already following
  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', followingUserId)
    .maybeSingle();

  if (existing) {
    // Unfollow
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('id', existing.id);

    if (error) return { following: false, error };

    // Re-count and update profile counters
    await updateProfileCounters(user.id, followingUserId);

    return { following: false, error: null };
  }

  // Follow
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: followingUserId });

  if (error) return { following: false, error };

  // Re-count and update profile counters
  await updateProfileCounters(user.id, followingUserId);

  return { following: true, error: null };
}

/**
 * After a follow/unfollow, re-count both users and update their profile counters.
 * This ensures profiles.followers_count and profiles.following_count are always accurate.
 */
async function updateProfileCounters(followerId, followingId) {
  // Count followers for the person being followed
  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', followingId);

  // Count following for the person who did the follow
  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', followerId);

  // Update both profiles in parallel
  await Promise.all([
    supabase.from('profiles').update({ followers_count: followerCount || 0 }).eq('user_id', followingId),
    supabase.from('profiles').update({ following_count: followingCount || 0 }).eq('user_id', followerId),
  ]);
}

/**
 * Check if current user follows another user.
 * @param {string} followingUserId
 * @returns {{ following: boolean, error }}
 */
export async function isFollowing(followingUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { following: false, error: null };

  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', followingUserId)
    .maybeSingle();

  return { following: !!data, error };
}

/**
 * Get follower count for a user (from follows table, not profile cache).
 * @param {string} userId
 * @returns {number}
 */
export async function getFollowerCount(userId) {
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);
  return count || 0;
}

/**
 * Get following count for a user (from follows table, not profile cache).
 * @param {string} userId
 * @returns {number}
 */
export async function getFollowingCount(userId) {
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);
  return count || 0;
}

/**
 * Get list of users who follow this user.
 * @param {string} userId
 * @param {{ limit?: number }} [options]
 * @returns {{ followers: [], error }}
 */
export async function getFollowers(userId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower_id,
      profiles:profiles!follows_follower_id_fkey(
        username, display_name, avatar_url, reputation, followers_count
      )
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return { followers: [], error };

  return {
    followers: data
      .map(row => ({
        user_id: row.follower_id,
        username: row.profiles?.username,
        display_name: row.profiles?.display_name,
        avatar_url: row.profiles?.avatar_url,
        reputation: row.profiles?.reputation,
        followers_count: row.profiles?.followers_count,
      }))
      .filter(f => f.username),
    error: null,
  };
}

/**
 * Get list of users this user follows.
 * @param {string} userId
 * @param {{ limit?: number }} [options]
 * @returns {{ following: [], error }}
 */
export async function getFollowing(userId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following_id,
      profiles:profiles!follows_following_id_fkey(
        username, display_name, avatar_url, reputation, followers_count
      )
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return { following: [], error };

  return {
    following: data
      .map(row => ({
        user_id: row.following_id,
        username: row.profiles?.username,
        display_name: row.profiles?.display_name,
        avatar_url: row.profiles?.avatar_url,
        reputation: row.profiles?.reputation,
        followers_count: row.profiles?.followers_count,
      }))
      .filter(f => f.username),
    error: null,
  };
}
