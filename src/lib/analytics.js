// ============================================================================
// Vio — Analytics Service
// Creator analytics dashboard — profile views, engagement, post performance.
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Record an analytics event (profile view, post view, etc.).
 */
export async function recordEvent(metric, { refPostId, actorId } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('profile_analytics')
    .insert({ user_id: user.id, metric, ref_post_id: refPostId || null, actor_id: actorId || null });

  return { error };
}

/**
 * Get analytics summary for the current user.
 */
export async function getAnalyticsSummary() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { summary: null, error: new Error('Not authenticated') };

  const userId = user.id;

  // Count events by type
  const { data: profileViews } = await supabase.from('profile_analytics').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('metric', 'profile_view');
  const { data: postViews } = await supabase.from('profile_analytics').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('metric', 'post_view');
  const { data: likes } = await supabase.from('profile_analytics').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('metric', 'like');
  const { data: comments } = await supabase.from('profile_analytics').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('metric', 'comment');
  const { data: follows } = await supabase.from('profile_analytics').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('metric', 'follow');
  const { data: saves } = await supabase.from('profile_analytics').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('metric', 'save');

  return {
    summary: {
      profileViews: profileViews?.length || 0,
      postViews: postViews?.length || 0,
      likesReceived: likes?.length || 0,
      commentsReceived: comments?.length || 0,
      followsGained: follows?.length || 0,
      savesReceived: saves?.length || 0,
    },
    error: null,
  };
}

/**
 * Get top performing posts for a user.
 */
export async function getTopPosts(limit = 5) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { posts: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', user.id)
    .order('likes_count', { ascending: false })
    .limit(limit);

  return { posts: data || [], error };
}

/**
 * Get daily analytics for the past 7 days.
 */
export async function getDailyAnalytics(days = 7) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { daily: [], error: new Error('Not authenticated') };

  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await supabase
    .from('profile_analytics')
    .select('metric, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  // Group by day
  const grouped = {};
  (data || []).forEach(e => {
    const day = e.created_at.slice(0, 10);
    if (!grouped[day]) grouped[day] = { day, views: 0, likes: 0, comments: 0, follows: 0 };
    if (e.metric === 'profile_view' || e.metric === 'post_view') grouped[day].views++;
    if (e.metric === 'like') grouped[day].likes++;
    if (e.metric === 'comment') grouped[day].comments++;
    if (e.metric === 'follow') grouped[day].follows++;
  });

  return { daily: Object.values(grouped), error };
}
