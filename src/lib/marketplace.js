// ============================================================================
// Vio — Marketplace Service
// Creator services, business profiles, and service discovery.
// ============================================================================

import { supabase } from './supabase.js';

export const CATEGORIES = [
  { id: 'design', label: 'Design', icon: 'Palette' },
  { id: 'writing', label: 'Writing', icon: 'FileText' },
  { id: 'photography', label: 'Photography', icon: 'Camera' },
  { id: 'marketing', label: 'Marketing', icon: 'BarChart3' },
  { id: 'business', label: 'Business', icon: 'Coins' },
  { id: 'programming', label: 'Programming', icon: 'Database' },
  { id: 'education', label: 'Education', icon: 'BookOpen' },
  { id: 'music', label: 'Music', icon: 'Music' },
  { id: 'video', label: 'Video Editing', icon: 'Film' },
  { id: 'consulting', label: 'Consulting', icon: 'TrendingUp' },
  { id: 'other', label: 'Other', icon: 'Sparkles' },
];

/**
 * Create a creator service listing.
 */
export async function createService({ title, description, category, priceRange, portfolioUrl }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { service: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('creator_services')
    .insert({ user_id: user.id, title, description, category, price_range: priceRange, portfolio_url: portfolioUrl })
    .select('*').single();

  return { service: data, error };
}

/**
 * Browse marketplace services.
 */
export async function browseServices({ category, limit = 20, offset = 0 } = {}) {
  let query = supabase.from('creator_services').select('*, profiles(username, display_name, avatar_url, reputation)', { count: 'estimated' }).eq('status','active');
  if (category) query = query.eq('category', category);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  return { services: data || [], error, count };
}

/**
 * Get a user's services.
 */
export async function getUserServices(userId) {
  const { data, error } = await supabase.from('creator_services').select('*').eq('user_id', userId).eq('status', 'active');
  return { services: data || [], error };
}

/**
 * Create/update business profile.
 */
export async function upsertBusinessProfile(data) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, error: new Error('Not authenticated') };
  const { data: result, error } = await supabase.from('business_profiles').upsert({ user_id: user.id, ...data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('*').single();
  return { profile: result, error };
}

/**
 * Get a user's business profile.
 */
export async function getBusinessProfile(userId) {
  const { data, error } = await supabase.from('business_profiles').select('*').eq('user_id', userId).maybeSingle();
  return { profile: data, error };
}
