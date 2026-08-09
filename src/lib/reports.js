// ============================================================================
// Vio — Reports Service
// Allows users to report posts, comments, profiles, and messages.
// ============================================================================

import { supabase } from './supabase.js';

export const REPORT_REASONS = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'fake_account', label: 'Fake Account' },
  { id: 'impersonation', label: 'Impersonation' },
  { id: 'violence', label: 'Violence' },
  { id: 'adult_content', label: 'Adult Content' },
  { id: 'hate_speech', label: 'Hate Speech' },
  { id: 'copyright', label: 'Copyright' },
  { id: 'misinformation', label: 'Misinformation' },
  { id: 'other', label: 'Other' },
];

export const TARGET_TYPES = ['post', 'comment', 'profile', 'message'];

/**
 * Submit a report.
 * @param {string} targetType — 'post' | 'comment' | 'profile' | 'message'
 * @param {string} targetId
 * @param {string} reason
 * @param {string} [details]
 * @returns {{ report: object|null, error }}
 */
export async function submitReport(targetType, targetId, reason, details = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { report: null, error: new Error('Not authenticated') };

  if (!TARGET_TYPES.includes(targetType)) {
    return { report: null, error: new Error('Invalid target type') };
  }
  if (!REPORT_REASONS.find(r => r.id === reason)) {
    return { report: null, error: new Error('Invalid report reason') };
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details?.trim() || '',
    })
    .select('*')
    .single();

  return { report: data, error };
}

/**
 * Get reports submitted by the current user.
 * @returns {{ reports: [], error }}
 */
export async function getMyReports() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { reports: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('reporter_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return { reports: data || [], error };
}
