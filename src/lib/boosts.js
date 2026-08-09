// ============================================================================
// Vio — Boost Service
// Allows users to spend vicoins to boost post visibility.
// ============================================================================

import { supabase } from './supabase.js';

// Boost pricing tiers (vicoins per duration)
export const BOOST_TIERS = {
  spark: { amount: 10, hours: 24, label: 'Spark — 24h', multiplier: 1.0 },
  flame: { amount: 50, hours: 72, label: 'Flame — 3 days', multiplier: 1.5 },
  blaze: { amount: 200, hours: 168, label: 'Blaze — 7 days', multiplier: 2.0 },
};

/**
 * Boost a post by spending vicoins.
 * @param {string} postId
 * @param {'spark'|'flame'|'blaze'} tier
 * @returns {{ boost: object|null, error }}
 */
export async function boostPost(postId, tier = 'spark') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { boost: null, error: new Error('Not authenticated') };

  const tierConfig = BOOST_TIERS[tier];
  if (!tierConfig) return { boost: null, error: new Error('Invalid boost tier') };

  // Check balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('vicoin_balance')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.vicoin_balance < tierConfig.amount) {
    return { boost: null, error: new Error(`Insufficient vicoins. Need ${tierConfig.amount}, have ${profile?.vicoin_balance || 0}`) };
  }

  // Deduct vicoins
  const { error: spendError } = await supabase
    .rpc('award_vicoins', {
      p_user_id: user.id,
      p_amount: -tierConfig.amount,
      p_category: 'boost',
      p_description: `Boosted post for ${tierConfig.hours}h`,
      p_ref_post_id: postId,
    });

  if (spendError) return { boost: null, error: spendError };

  // Create boost record
  const expiresAt = new Date(Date.now() + tierConfig.hours * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from('vicoin_boosts')
    .insert({
      post_id: postId,
      user_id: user.id,
      amount_spent: tierConfig.amount,
      status: 'active',
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  // Update post boost_status
  if (!error) {
    await supabase
      .from('posts')
      .update({ boost_status: 'active' })
      .eq('id', postId);
  }

  return { boost: data, error };
}

/**
 * Get active boosts for a post.
 * @param {string} postId
 * @returns {{ boosts: [], error }}
 */
export async function getPostBoosts(postId) {
  const { data, error } = await supabase
    .from('vicoin_boosts')
    .select('*')
    .eq('post_id', postId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return { boosts: data || [], error };
}

/**
 * Get the user's active boosts.
 * @returns {{ boosts: [], error }}
 */
export async function getMyBoosts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { boosts: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('vicoin_boosts')
    .select('*, posts(content, media_kind)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return { boosts: data || [], error };
}
