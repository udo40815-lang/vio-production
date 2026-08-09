// ============================================================================
// Vio — Visibility Engine
// Computes and manages visibility scores and reputation.
// The scoring algorithm can evolve independently of the UI.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Compute and update the visibility score for the current user.
 * @returns {{ score: number, error }}
 */
export async function computeVisibility() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { score: 0, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .rpc('compute_visibility_score', { p_user_id: user.id });

  if (!error && data) {
    // Update profile with new score
    await supabase
      .from('profiles')
      .update({ visibility_score: data })
      .eq('user_id', user.id);
  }

  return { score: data || 0, error };
}

/**
 * Get a breakdown of the user's visibility score.
 * @returns {{ breakdown: object, suggestions: string[], error }}
 */
export async function getVisibilityBreakdown() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { breakdown: null, suggestions: [], error: new Error('Not authenticated') };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { breakdown: null, suggestions: [], error: new Error('Profile not found') };

  const { data: posts } = await supabase
    .from('posts')
    .select('likes_count, comments_count')
    .eq('author_id', user.id);

  const postsCount = posts?.length || 0;
  const totalEngagement = (posts || []).reduce((s, p) => s + (p.likes_count || 0) + (p.comments_count || 0), 0);
  const avgEngagement = postsCount > 0 ? Math.round(totalEngagement / postsCount) : 0;

  const profileComplete = [
    { check: !!profile.display_name, label: 'Display name set', score: 5 },
    { check: !!(profile.bio && profile.bio.length > 10), label: 'Bio (10+ characters)', score: 5 },
    { check: !!(profile.avatar_url), label: 'Profile picture', score: 5 },
    { check: !!(profile.cover_url), label: 'Cover photo', score: 5 },
    { check: !!(profile.website), label: 'Website linked', score: 5 },
  ];

  const suggestions = [];
  if (!profile.display_name) suggestions.push('Add your display name (+5 score)');
  if (!profile.bio || profile.bio.length <= 10) suggestions.push('Write a longer bio (+5 score)');
  if (!profile.avatar_url) suggestions.push('Upload a profile picture (+5 score)');
  if (!profile.cover_url) suggestions.push('Add a cover photo (+5 score)');
  if (!profile.website) suggestions.push('Link your website (+5 score)');
  if (postsCount < 3) suggestions.push(`Publish more posts (${postsCount}/3 for max consistency score)`);
  if (avgEngagement < 5) suggestions.push('Focus on content quality to increase engagement');

  return {
    breakdown: {
      score: profile.visibility_score || 0,
      reputation: profile.reputation || 0,
      postsCount,
      avgEngagement,
      profileComplete,
    },
    suggestions,
    error: null,
  };
}

/**
 * Update user's reputation score.
 * @param {number} delta — positive or negative integer
 * @returns {{ newReputation: number, error }}
 */
export async function updateReputation(delta = 1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { newReputation: 0, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .rpc('update_reputation', { p_user_id: user.id, p_delta: delta });

  return { newReputation: data || 0, error };
}

/**
 * Get current reputation for a user by user_id.
 * @param {string} userId
 * @returns {{ reputation: number }}
 */
export async function getReputation(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('reputation')
    .eq('user_id', userId)
    .single();

  return { reputation: data?.reputation || 0 };
}
