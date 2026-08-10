// ============================================================================
// Vio — Messaging Service
// 1-to-1 private conversations + messages
// ============================================================================

import { supabase } from './supabase.js';

function orderedPair(a, b) {
  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a };
}

export async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ─────────────────────────────────────────────────────────────────────
// Conversations
// ─────────────────────────────────────────────────────────────────────

export async function getOrCreateConversation(targetUserId) {
  const uid = await getUserId();
  if (!uid) return { conversation: null, error: new Error('Not authenticated') };
  const pair = orderedPair(uid, targetUserId);

  // Check existing
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_a', pair.user_a).eq('user_b', pair.user_b)
    .maybeSingle();

  if (existing) {
    // Ensure participants exist (backfill if missing from earlier bug)
    await ensureParticipants(existing.id, pair.user_a, pair.user_b);
    return { conversation: existing, error: null };
  }

  // Create new
  const { data: created, error: createErr } = await supabase
    .from('conversations')
    .insert(pair).select('*').single();

  if (createErr) {
    if (createErr.code === '23505') {
      const { data: retry } = await supabase
        .from('conversations')
        .select('*').eq('user_a', pair.user_a).eq('user_b', pair.user_b)
        .maybeSingle();
      if (retry) await ensureParticipants(retry.id, pair.user_a, pair.user_b);
      return { conversation: retry, error: null };
    }
    return { conversation: null, error: createErr };
  }

  // Create participants
  await ensureParticipants(created.id, pair.user_a, pair.user_b);
  return { conversation: created, error: null };
}

/** Ensure both users have participant records for a conversation */
async function ensureParticipants(convId, userIdA, userIdB) {
  // Check what's missing
  const { data: existing } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', convId);

  const existingIds = new Set((existing || []).map(p => p.user_id));
  const missing = [];
  if (!existingIds.has(userIdA)) missing.push({ conversation_id: convId, user_id: userIdA });
  if (!existingIds.has(userIdB)) missing.push({ conversation_id: convId, user_id: userIdB });

  if (missing.length > 0) {
    await supabase.from('conversation_participants').insert(missing);
  }
}

export async function getUserConversations() {
  const uid = await getUserId();
  if (!uid) return { conversations: [], error: new Error('Not authenticated') };

  // Use conversations RLS (auth.uid() = user_a OR user_b) — no inner join needed
  const { data, error } = await supabase
    .from('conversations')
    .select('id,user_a,user_b,created_at,updated_at,last_message_at,last_message_preview')
    .or(`user_a.eq.${uid},user_b.eq.${uid}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  if (error) return { conversations: [], error };

  // Fetch participant data separately (won't filter out convs without participants)
  const enriched = await Promise.all((data || []).map(async (conv) => {
    const otherUserId = conv.user_a === uid ? conv.user_b : conv.user_a;

    // Get my participant record
    const { data: myP } = await supabase
      .from('conversation_participants')
      .select('last_read_at,unread_count')
      .eq('conversation_id', conv.id).eq('user_id', uid)
      .maybeSingle();

    // Get other user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id,display_name,username,avatar_url')
      .eq('user_id', otherUserId).maybeSingle();

    return {
      id: conv.id,
      created_at: conv.created_at,
      last_message_at: conv.last_message_at,
      last_message_preview: conv.last_message_preview,
      other_user: profile || { user_id: otherUserId },
      unread_count: myP?.unread_count || 0,
      last_read_at: myP?.last_read_at || null,
    };
  }));

  return { conversations: enriched, error: null };
}

// ─────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────

export async function getConversationMessages(conversationId, { limit = 50, offset = 0 } = {}) {
  const uid = await getUserId();
  if (!uid) return { messages: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('messages')
    .select('id,conversation_id,sender_id,content,message_type,voice_url,voice_duration,created_at,updated_at,deleted_at')
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

  // Insert message
  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: uid, content: content.trim(), message_type: 'text' })
    .select('*')
    .single();

  if (insertErr) return { message: null, error: insertErr };

  // Update conversation metadata
  const preview = content.trim().substring(0, 120);
  await supabase.from('conversations').update({
    last_message_at: message.created_at,
    last_message_preview: preview,
    updated_at: new Date().toISOString(),
  }).eq('id', conversationId);

  // Increment unread for other participant
  const { data: conv } = await supabase
    .from('conversations').select('user_a,user_b').eq('id', conversationId).single();

  if (conv) {
    const otherId = conv.user_a === uid ? conv.user_b : conv.user_a;
    // Ensure participant record exists
    await ensureParticipants(conversationId, conv.user_a, conv.user_b);
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('unread_count')
      .eq('conversation_id', conversationId).eq('user_id', otherId).maybeSingle();
    if (existing) {
      await supabase.from('conversation_participants')
        .update({ unread_count: (existing.unread_count || 0) + 1 })
        .eq('conversation_id', conversationId).eq('user_id', otherId);
    }
  }

  return { message, error: null };
}

export async function sendVoiceMessage(conversationId, voiceUrl, duration) {
  const uid = await getUserId();
  if (!uid) return { message: null, error: new Error('Not authenticated') };

  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: uid, message_type: 'voice', voice_url: voiceUrl, voice_duration: duration })
    .select('*').single();

  if (insertErr) return { message: null, error: insertErr };

  const preview = '🎤 Voice message';
  await supabase.from('conversations').update({
    last_message_at: message.created_at, last_message_preview: preview, updated_at: new Date().toISOString(),
  }).eq('id', conversationId);

  const { data: conv } = await supabase
    .from('conversations').select('user_a,user_b').eq('id', conversationId).single();

  if (conv) {
    const otherId = conv.user_a === uid ? conv.user_b : conv.user_a;
    await ensureParticipants(conversationId, conv.user_a, conv.user_b);
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('unread_count').eq('conversation_id', conversationId).eq('user_id', otherId).maybeSingle();
    if (existing) {
      await supabase.from('conversation_participants')
        .update({ unread_count: (existing.unread_count || 0) + 1 })
        .eq('conversation_id', conversationId).eq('user_id', otherId);
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
    .eq('conversation_id', conversationId).eq('user_id', uid);

  return { error };
}

export async function deleteMessage(messageId) {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  return { error };
}

export async function uploadVoiceBlob(blob, conversationId, userId, messageId) {
  const path = `${conversationId}/${userId}/${messageId}.webm`;
  const { error } = await supabase.storage
    .from('voice-messages')
    .upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false });

  if (error) {
    console.error('[Vio] Voice upload error:', error);
    return { url: null, error };
  }
  const { data: urlData } = supabase.storage.from('voice-messages').getPublicUrl(path);
  return { url: urlData?.publicUrl || null, error: null };
}

// ─────────────────────────────────────────────────────────────────────
// Realtime
// ─────────────────────────────────────────────────────────────────────

export function subscribeToConversation(conversationId, currentUserId, onNewMessage) {
  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      const msg = payload.new;
      if (msg.sender_id === currentUserId) return;
      if (msg.deleted_at) return;
      onNewMessage(msg);
    }).subscribe();

  return () => { supabase.removeChannel(channel).catch(() => {}); };
}

export function subscribeToConversationUpdates(currentUserId, onConversationUpdated) {
  const channel = supabase
    .channel('conv-updates')
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'conversations',
    }, (payload) => {
      const conv = payload.new;
      if (conv.user_a === currentUserId || conv.user_b === currentUserId) {
        onConversationUpdated(conv.id);
      }
    }).subscribe();

  return () => { supabase.removeChannel(channel).catch(() => {}); };
}
