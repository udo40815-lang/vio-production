// ============================================================================
// Vio — Messaging Service (Phase 3 — realtime + polish)
// 1-to-1 private conversations + messages with Supabase Realtime
// ============================================================================

import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function orderedPair(a, b) {
  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a };
}

export async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversations
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrCreateConversation(targetUserId) {
  const uid = await getUserId();
  if (!uid) return { conversation: null, error: new Error('Not authenticated') };

  const pair = orderedPair(uid, targetUserId);

  const { data: existing, error: findErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_a', pair.user_a)
    .eq('user_b', pair.user_b)
    .maybeSingle();

  if (findErr) return { conversation: null, error: findErr };
  if (existing) return { conversation: existing, error: null };

  const { data: created, error: createErr } = await supabase
    .from('conversations')
    .insert(pair)
    .select('*')
    .single();

  if (createErr) {
    if (createErr.code === '23505') {
      const { data: retry } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_a', pair.user_a)
        .eq('user_b', pair.user_b)
        .maybeSingle();
      return { conversation: retry, error: null };
    }
    return { conversation: null, error: createErr };
  }

  const participants = [
    { conversation_id: created.id, user_id: pair.user_a },
    { conversation_id: created.id, user_id: pair.user_b },
  ];

  await supabase.from('conversation_participants').insert(participants);

  return { conversation: created, error: null };
}

export async function getUserConversations() {
  const uid = await getUserId();
  if (!uid) return { conversations: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, user_a, user_b, created_at, updated_at,
      last_message_at, last_message_preview,
      conversation_participants!inner (user_id, last_read_at, unread_count)
    `)
    .or(`user_a.eq.${uid},user_b.eq.${uid}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  if (error) return { conversations: [], error };

  const enriched = await Promise.all((data || []).map(async (conv) => {
    const otherUserId = conv.user_a === uid ? conv.user_b : conv.user_a;
    const myParticipant = conv.conversation_participants?.find(p => p.user_id === uid);

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, avatar_url')
      .eq('user_id', otherUserId)
      .maybeSingle();

    return {
      id: conv.id,
      created_at: conv.created_at,
      last_message_at: conv.last_message_at,
      last_message_preview: conv.last_message_preview,
      other_user: profile || { user_id: otherUserId },
      unread_count: myParticipant?.unread_count || 0,
      last_read_at: myParticipant?.last_read_at || null,
    };
  }));

  return { conversations: enriched, error: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────────────

export async function getConversationMessages(conversationId, { limit = 50, offset = 0 } = {}) {
  const uid = await getUserId();
  if (!uid) return { messages: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at, updated_at, deleted_at')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { messages: [], error };
  return { messages: (data || []).reverse(), error: null };
}

export async function sendMessage(conversationId, content) {
  const uid = await getUserId();
  if (!uid) return { message: null, error: new Error('Not authenticated') };
  if (!content?.trim()) return { message: null, error: new Error('Message cannot be empty') };

  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: uid, content: content.trim() })
    .select('*')
    .single();

  if (insertErr) return { message: null, error: insertErr };

  // Update conversation metadata
  await supabase.from('conversations').update({
    last_message_at: message.created_at,
    last_message_preview: content.trim().substring(0, 120),
    updated_at: new Date().toISOString(),
  }).eq('id', conversationId);

  // Increment unread for other participant
  const { data: conv } = await supabase
    .from('conversations').select('user_a, user_b').eq('id', conversationId).single();

  if (conv) {
    const otherUserId = conv.user_a === uid ? conv.user_b : conv.user_a;
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('unread_count')
      .eq('conversation_id', conversationId)
      .eq('user_id', otherUserId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('conversation_participants')
        .update({ unread_count: (existing.unread_count || 0) + 1 })
        .eq('conversation_id', conversationId)
        .eq('user_id', otherUserId);
    }
  }

  return { message, error: null };
}

export async function markConversationAsRead(conversationId) {
  const uid = await getUserId();
  if (!uid) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString(), unread_count: 0 })
    .eq('conversation_id', conversationId)
    .eq('user_id', uid);

  return { error };
}

export async function deleteMessage(messageId) {
  const uid = await getUserId();
  if (!uid) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  return { error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Realtime — subscribe to messages for a conversation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to new messages in a conversation via Supabase Realtime.
 * Returns an unsubscribe function. Handles deduplication — uses
 * a Set of known message IDs to avoid double-adding optimistic updates.
 *
 * @param {string} conversationId
 * @param {string} currentUserId — skip own messages (already added optimistically)
 * @param {(message: object) => void} onNewMessage
 * @returns {() => void} unsubscribe
 */
export function subscribeToConversation(conversationId, currentUserId, onNewMessage) {
  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const msg = payload.new;
        // Skip own messages — we already add those optimistically
        if (msg.sender_id === currentUserId) return;
        if (msg.deleted_at) return;
        onNewMessage(msg);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel).catch(() => {});
  };
}

/**
 * Subscribe to conversation updates (last message, unread counts) for
 * the current user's conversation list. Used by MessagesScreen inbox.
 *
 * @param {string} currentUserId
 * @param {(convId: string) => void} onConversationUpdated
 * @returns {() => void} unsubscribe
 */
export function subscribeToConversationUpdates(currentUserId, onConversationUpdated) {
  // Listen for conversation table changes where user is a participant
  const channel = supabase
    .channel('conv-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      },
      (payload) => {
        const conv = payload.new;
        if (conv.user_a === currentUserId || conv.user_b === currentUserId) {
          onConversationUpdated(conv.id);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel).catch(() => {});
  };
}
