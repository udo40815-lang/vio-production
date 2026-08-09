// ============================================================================
// Vio — Profile Service
// CRUD operations on the public.profiles table.
// All RLS policies are enforced at the database level.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Fetch the profile for the currently authenticated user.
 * @returns {{ profile, error }}
 */
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return { profile: data, error };
}

/**
 * Fetch any user's profile by username.
 * @param {string} username
 * @returns {{ profile, error }}
 */
export async function getProfileByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  return { profile: data, error };
}

/**
 * Fetch any user's profile by user ID.
 * @param {string} userId
 * @returns {{ profile, error }}
 */
export async function getProfileById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { profile: data, error };
}

/**
 * Update the authenticated user's profile fields.
 * Only the provided fields are updated (partial update).
 * @param {object} patch — e.g. { display_name, bio, website, location, avatar_url, cover_url }
 * @returns {{ profile, error }}
 */
export async function updateProfile(patch) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, error: new Error('Not authenticated') };

  // Only allow updating safe fields
  const allowed = [
    'display_name', 'username', 'bio', 'website', 'location',
    'avatar_url', 'cover_url', 'followers_count', 'following_count',
    'posts_count', 'visibility_score', 'reputation', 'vicoin_balance',
    'occupation', 'company', 'school', 'education',
    'skills', 'interests',
    'twitter', 'instagram', 'linkedin', 'github', 'tiktok', 'youtube',
  ];
  const sanitized = {};
  for (const key of allowed) {
    if (key in patch) sanitized[key] = patch[key];
  }

  if (Object.keys(sanitized).length === 0) {
    return { profile: null, error: new Error('No valid fields to update') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(sanitized)
    .eq('user_id', user.id)
    .select('*')
    .single();

  return { profile: data, error };
}

/**
 * Search profiles by display_name or username (partial match).
 * @param {string} query
 * @param {{ limit?: number }} [options]
 * @returns {{ profiles: [], error }}
 */
export async function searchProfiles(query, { limit = 20 } = {}) {
  const q = query?.trim();
  if (!q) return { profiles: [], error: null };

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, avatar_url, reputation, followers_count')
    .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
    .order('followers_count', { ascending: false })
    .limit(limit);

  return { profiles: data || [], error };
}
