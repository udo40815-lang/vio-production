// ============================================================================
// Vio — Messaging Service (Phase 1)
// 1-to-1 private conversations + messages
//
// Database architecture:
//   - conversations: unique 1-to-1 pairs (enforced by CHECK user_a < user_b)
//   - conversation_participants: per-user read/unread state
//   - messages: individual messages within a conversation
//
// Duplicate prevention:
//   The CHECK constraint (user_a < user_b) + UNIQUE(user_a, user_b) ensures
//   that A↔B always resolves to the same row regardless of who initiates.
// ============================================================================

import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a pair of user IDs so user_a < user_b.
 * This is the application-side counterpart of the database CHECK constraint.
 */
function orderedPair(a, b) {
  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a };
}

/**
 * Get the current authenticated user's ID.
 */
async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or create a 1-to-1 conversation between the current user and targetUser.
 *
 * If a conversation already exists, returns it.
 * If not, creates one with both participant records.
 *
 * @param {string} targetUserId — the other user's UUID (profiles.user_id)
 * @returns {{ conversation: object|null, error: Error|null }}
 */
export async function getOrCreateConversation(targetUserId) {
  const uid = await getUserId();
  if (!uid) return { conversation: null, error: new Error('Not authenticated') };

  const pair = orderedPair(uid, targetUserId);

  // 1. Check if conversation already exists
  const { data: existing, error: findErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_a', pair.user_a)
    .eq('user_b', pair.user_b)
    .maybeSingle();

  if (findErr) return { conversation: null, error: findErr };
  if (existing) return { conversation: existing, error: null };

  // 2. Create new conversation
  const { data: created, error: createErr } = await supabase
    .from('conversations')
    .insert(pair)
    .select('*')
    .single();

  if (createErr) {
    // Race condition — another request may have created it between our
    // check and insert. Re-fetch.
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

  // 3. Create participant records for both users
  const participants = [
    { conversation_id: created.id, user_id: pair.user_a },
    { conversation_id: created.id, user_id: pair.user_b },
  ];

  const { error: partErr } = await supabase
    .from('conversation_participants')
    .insert(participants);

  if (partErr) {
    console.error('[Vio] Failed to create participants:', partErr);
    // Conversation exists but participants failed — still return the conversation
  }

  return { conversation: created, error: null };
}

/**
 * Get all conversations for the current user, including last message info
 * and the other participant's profile data.
 *
 * @returns {{ conversations: array, error: Error|null }}
 */
export async function getUserConversations() {
  const uid = await getUserId();
  if (!uid) return { conversations: [], error: new Error('Not authenticated') };

  // Select conversations where the user is either user_a or user_b,
  // joined with participant records for unread counts, and the other
  // user's profile for display.
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      user_a,
      user_b,
      created_at,
      updated_at,
      last_message_at,
      last_message_preview,
      conversation_participants!inner (
        user_id,
        last_read_at,
        unread_count
      )
    `)
    .or(`user_a.eq.${uid},user_b.eq.${uid}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  if (error) return { conversations: [], error };

  // Enrich each conversation with the other participant's profile and
  // the current user's own participant record.
  const enriched = await Promise.all((data || []).map(async (conv) => {
    const otherUserId = conv.user_a === uid ? conv.user_b : conv.user_a;
    const myParticipant = conv.conversation_participants?.find(p => p.user_id === uid);

    // Fetch the other user's profile
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

/**
 * Get messages for a conversation, ordered by newest first.
 *
 * @param {string} conversationId
 * @param {{ limit?: number, offset?: number, before?: string }} [options]
 * @returns {{ messages: array, error: Error|null }}
 */
export async function getConversationMessages(conversationId, { limit = 50, offset = 0 } = {}) {
  const uid = await getUserId();
  if (!uid) return { messages: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      created_at,
      updated_at,
      deleted_at
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { messages: [], error };

  // Return in chronological order (oldest first) for UI
  return { messages: (data || []).reverse(), error: null };
}

/**
 * Send a message in a conversation.
 * Also updates the conversation's last_message_at and last_message_preview,
 * and increments the other participant's unread count.
 *
 * @param {string} conversationId
 * @param {string} content
 * @returns {{ message: object|null, error: Error|null }}
 */
export async function sendMessage(conversationId, content) {
  const uid = await getUserId();
  if (!uid) return { message: null, error: new Error('Not authenticated') };
  if (!content?.trim()) return { message: null, error: new Error('Message cannot be empty') };

  // 1. Insert the message
  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: uid,
      content: content.trim(),
    })
    .select('*')
    .single();

  if (insertErr) return { message: null, error: insertErr };

  // 2. Update conversation metadata (last message)
  const { error: convErr } = await supabase
    .from('conversations')
    .update({
      last_message_at: message.created_at,
      last_message_preview: content.trim().substring(0, 120),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (convErr) {
    console.error('[Vio] Failed to update conversation metadata:', convErr);
  }

  // 3. Increment unread count for the OTHER participant
  const { data: conv } = await supabase
    .from('conversations')
    .select('user_a, user_b')
    .eq('id', conversationId)
    .single();

  if (conv) {
    const otherUserId = conv.user_a === uid ? conv.user_b : conv.user_a;

    // Update the other participant's unread count
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

/**
 * Mark all messages in a conversation as read for the current user.
 * Resets unread_count to 0 and updates last_read_at.
 *
 * @param {string} conversationId
 * @returns {{ error: Error|null }}
 */
export async function markConversationAsRead(conversationId) {
  const uid = await getUserId();
  if (!uid) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('conversation_participants')
    .update({
      last_read_at: new Date().toISOString(),
      unread_count: 0,
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', uid);

  return { error };
}

/**
 * Soft-delete a message (sets deleted_at).
 * Only the sender can delete their own messages (enforced by RLS).
 *
 * @param {string} messageId
 * @returns {{ error: Error|null }}
 */
export async function deleteMessage(messageId) {
  const uid = await getUserId();
  if (!uid) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  return { error };
}
