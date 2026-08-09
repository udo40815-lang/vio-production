// ============================================================================
// Vio — Notifications Service
// CRUD operations on the public.notifications table.
// Notifications are private — only the recipient can see theirs (RLS enforced).
// ============================================================================

import { supabase } from './supabase.js';

/**
 * Create a notification.
 * @param {object} params
 * @param {string} params.user_id      — recipient
 * @param {string} params.actor_id     — who did the action
 * @param {string} params.actor_handle
 * @param {string} [params.actor_name]
 * @param {'like'|'comment'|'reply'|'follow'} params.kind
 * @param {string} [params.post_id]
 * @param {string} [params.comment_id]
 * @returns {{ error }}
 */
export async function createNotification({ user_id, actor_id, actor_handle, actor_name, kind, post_id, comment_id, reaction } = {}) {
  // Deduplicate: avoid multiple notifications from same actor on same post
  if (kind === 'like' && post_id && actor_id) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user_id)
      .eq('actor_id', actor_id)
      .eq('post_id', post_id)
      .eq('kind', 'like')
      .limit(1);
    if (existing && existing.length > 0) {
      // Update the existing notification's reaction instead
      await supabase
        .from('notifications')
        .update({ reaction: reaction || null, read: false })
        .eq('id', existing[0].id);
      return { error: null };
    }
  }

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id,
      actor_id,
      actor_handle,
      actor_name: actor_name || actor_handle,
      kind,
      post_id: post_id || null,
      comment_id: comment_id || null,
      reaction: reaction || null,
    });

  return { error };
}

/**
 * Get notifications for the current user.
 * @param {{ limit?: number, offset?: number }} [options]
 * @returns {{ notifications: [], error, count }}
 */
export async function getNotifications({ limit = 50, offset = 0 } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [], error: new Error('Not authenticated'), count: 0 };

  const { data, error, count } = await supabase
    .from('notifications')
    .select('*, profiles!notifications_actor_id_fkey(username, display_name, avatar_url)', { count: 'estimated' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Flatten profile data for live sync of actor identity
  const notifications = (data || []).map(n => ({
    ...n,
    actor_handle: n.profiles?.username || n.actor_handle || 'unknown',
    actor_name: n.profiles?.display_name || n.actor_name || 'Unknown',
    actor_avatar_url: n.profiles?.avatar_url || '',
  }));

  return { notifications, error, count };
}

/**
 * Mark a notification as read.
 * @param {string} id
 * @returns {{ error }}
 */
export async function markAsRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);

  return { error };
}

/**
 * Mark all notifications as read for current user.
 * @returns {{ error }}
 */
export async function markAllAsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  return { error };
}

/**
 * Delete all notifications for current user.
 * @returns {{ error }}
 */
export async function clearNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id);

  return { error };
}

/**
 * Get unread notification count.
 * @returns {number}
 */
export async function getUnreadCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  return count || 0;
}

/**
 * Subscribe to real-time notification changes.
 * @param {function} callback — receives (payload)
 * @returns {function} unsubscribe
 */
export function subscribeToNotifications(callback) {
  const channel = supabase
    .channel('public:notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
    }, (payload) => callback(payload))
    .subscribe();

  return () => supabase.removeChannel(channel);
}
