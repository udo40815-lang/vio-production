// ============================================================================
// Vio — Verification Service
// Handles creator verification requests.
// ============================================================================

import { supabase } from './supabase.js';

export const VERIFICATION_LEVELS = [
  { id: 'identity', label: 'Identity Verification', description: 'Verify your real identity with official documents.' },
  { id: 'creator', label: 'Creator Verification', description: 'Get verified as an authentic creator on Vio.' },
  { id: 'business', label: 'Business Verification', description: 'Verify your brand or organization.' },
];

/**
 * Submit a verification request.
 * @param {string} level — 'identity' | 'creator' | 'business'
 * @param {object} details — { fullName, website, description }
 * @returns {{ request: object|null, error }}
 */
export async function requestVerification(level, { fullName, website, description } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { request: null, error: new Error('Not authenticated') };

  if (!VERIFICATION_LEVELS.find(l => l.id === level)) {
    return { request: null, error: new Error('Invalid verification level') };
  }

  // Check for existing pending/approved request
  const { data: existing } = await supabase
    .from('verification_requests')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (existing) {
    if (existing.status === 'approved') {
      return { request: null, error: new Error('You are already verified') };
    }
    if (existing.status === 'pending') {
      return { request: null, error: new Error('You already have a pending verification request') };
    }
  }

  const { data, error } = await supabase
    .from('verification_requests')
    .insert({
      user_id: user.id,
      level,
      full_name: fullName?.trim() || null,
      website: website?.trim() || null,
      description: description?.trim() || null,
    })
    .select('*')
    .single();

  return { request: data, error };
}

/**
 * Get the current user's verification status.
 * @returns {{ status: string|null, level: string|null, error }}
 */
export async function getVerificationStatus() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: null, level: null, error: new Error('Not authenticated') };

  const { data } = await supabase
    .from('verification_requests')
    .select('status, level')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { status: data?.status || null, level: data?.level || null, error: null };
}

/**
 * Check if a user is verified (for badge display).
 * @param {string} userId
 * @returns {boolean}
 */
export async function isVerified(userId) {
  const { data } = await supabase
    .from('verification_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  return !!data;
}
