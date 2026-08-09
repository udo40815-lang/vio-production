// ============================================================================
// Vio — Blocks & Mutes Service
// Account blocking and muting functionality.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Toggle block on a user.
 * @param {string} blockedUserId
 * @param {'block'|'mute'} kind
 * @returns {{ blocked: boolean, error }}
 */
export async function toggleBlock(blockedUserId, kind = 'block') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { blocked: false, error: new Error('Not authenticated') };

  if (user.id === blockedUserId) {
    return { blocked: false, error: new Error('Cannot block yourself') };
  }

  // Check if already blocked/muted
  const { data: existing } = await supabase
    .from('account_blocks')
    .select('id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedUserId)
    .eq('kind', kind)
    .maybeSingle();

  if (existing) {
    // Unblock/Unmute
    const { error } = await supabase
      .from('account_blocks')
      .delete()
      .eq('id', existing.id);

    return { blocked: false, error };
  }

  // Block/Mute
  const { error } = await supabase
    .from('account_blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedUserId, kind });

  return { blocked: !error, error };
}

/**
 * Check if a user is blocked by the current user.
 * @param {string} userId
 * @returns {{ blocked: boolean, muted: boolean, error }}
 */
export async function checkBlockStatus(userId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { blocked: false, muted: false, error: null };

  const { data } = await supabase
    .from('account_blocks')
    .select('kind')
    .eq('blocker_id', user.id)
    .eq('blocked_id', userId);

  const blocked = data?.some(r => r.kind === 'block') || false;
  const muted = data?.some(r => r.kind === 'mute') || false;

  return { blocked, muted, error: null };
}

/**
 * Get the list of blocked/muted users for the current user.
 * @returns {{ blocked: [], muted: [], error }}
 */
export async function getBlockList() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { blocked: [], muted: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('account_blocks')
    .select('*')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });

  const blocked = (data || []).filter(r => r.kind === 'block');
  const muted = (data || []).filter(r => r.kind === 'mute');

  return { blocked, muted, error };
}
