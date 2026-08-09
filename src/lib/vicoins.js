// ============================================================================
// Vio — Vicoins Service
// Wallet balance queries, earn/spend operations, transaction history.
// All monetary operations are handled server-side via the award_vicoins RPC.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Get current vicoin balance for the authenticated user.
 * @returns {{ balance: number, error }}
 */
export async function getBalance() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { balance: 0, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('profiles')
    .select('vicoin_balance')
    .eq('user_id', user.id)
    .single();

  return { balance: data?.vicoin_balance || 0, error };
}

/**
 * Award vicoins to the authenticated user (server-side function).
 * Prevents duplicate rewards and validates inputs.
 * @param {number} amount       — positive integer
 * @param {string} category     — 'profile_complete', 'first_post', 'engagement', etc.
 * @param {string} [description]
 * @param {string} [refPostId]
 * @returns {{ newBalance: number, error }}
 */
export async function earnVicoins(amount, category, description = '', refPostId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { newBalance: 0, error: new Error('Not authenticated') };

  if (!amount || amount <= 0) return { newBalance: 0, error: new Error('Amount must be positive') };

  const { data, error } = await supabase
    .rpc('award_vicoins', {
      p_user_id: user.id,
      p_amount: amount,
      p_category: category,
      p_description: description,
      p_ref_post_id: refPostId,
    });

  return { newBalance: data, error };
}

/**
 * Spend vicoins (e.g. for boosts).
 * @param {number} amount
 * @param {string} category
 * @param {string} [description]
 * @returns {{ newBalance: number, error }}
 */
export async function spendVicoins(amount, category, description = '') {
  // Spending is just earning with a negative amount
  return earnVicoins(-Math.abs(amount), category, description);
}

/**
 * Get transaction history for the authenticated user.
 * @param {{ limit?: number, offset?: number }} [options]
 * @returns {{ transactions: [], error, count }}
 */
export async function getTransactionHistory({ limit = 50, offset = 0 } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { transactions: [], error: new Error('Not authenticated'), count: 0 };

  const { data, error, count } = await supabase
    .from('vicoin_transactions')
    .select('*', { count: 'estimated' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { transactions: data || [], error, count };
}

/**
 * Check if a reward has already been given (prevent duplicates).
 * @param {string} userId
 * @param {string} category
 * @returns {boolean}
 */
export async function hasEarnedReward(category) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('vicoin_transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('category', category)
    .eq('kind', 'earn')
    .maybeSingle();

  return !!data;
}
