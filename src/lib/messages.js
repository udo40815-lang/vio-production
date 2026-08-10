// ============================================================================
// Vio — Messaging Service (Production)
// Persistent, real-time DM: text + voice, delivery tracking, read receipts
// ============================================================================

import { supabase } from './supabase.js';

// ── Helpers ──────────────────────────────────────────────────────────────

function orderedPair(a, b) {
  return a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a };
}

export async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/** Ensure both users have participant records (backfill + atomic) */
async function ensureParticipants(convId, uidA, uidB) {
  const { data: existing } = await supabase
    .from('conversation_participants')
    .select('user_id').eq('conversation_id', convId);
  const existIds = new Set((existing || []).map(p => p.user_id));
  const missing = [];
  if (!existIds.has(uidA)) missing.push({ conversation_id: convId, user_id: uidA, last_seen_at: new Date().toISOString() });
  if (!existIds.has(uidB)) missing.push({ conversation_id: convId, user_id: uidB, last_seen_at: new Date().toISOString() });
  if (missing.length) {
    const { error } = await supabase.from('conversation_participants').insert(missing);
    if (error) console.warn('[Vio] ensureParticipants insert warning:', error.message);
  }
}

// ── Conversations ────────────────────────────────────────────────────────

export async function getOrCreateConversation(targetUserId) {
  const uid = await getUserId();
  if (!uid) return { conversation: null, error: new Error('Not authenticated') };
  if (uid === targetUserId) return { conversation: null, error: new Error('Cannot message yourself') };

  const pair = orderedPair(uid, targetUserId);

  // Check existing
  const { data: existing } = await supabase
    .from('conversations')
    .select('*').eq('user_a', pair.user_a).eq('user_b', pair.user_b)
    .maybeSingle();

  if (existing) {
    await ensureParticipants(existing.id, pair.user_a, pair.user_b);
    return { conversation: existing, error: null };
  }

  // Create
  const { data: created, error: createErr } = await supabase
    .from('conversations')
    .insert(pair).select('*').single();

  if (createErr) {
    if (createErr.code === '23505') {
      const { data: retry } = await supabase
        .from('conversations').select('*')
        .eq('user_a', pair.user_a).eq('user_b', pair.user_b).maybeSingle();
      if (retry) await ensureParticipants(retry.id, pair.user_a, pair.user_b);
      return { conversation: retry, error: null };
    }
    return { conversation: null, error: createErr };
  }

  await ensureParticipants(created.id, pair.user_a, pair.user_b);
  return { conversation: created, error: null };
}

export async function getUserConversations() {
  const uid = await getUserId();
  if (!uid) return { conversations: [], error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('conversations')
    .select('id,user_a,user_b,created_at,updated_at,last_message_at,last_message_preview')
    .or(`user_a.eq.${uid},user_b.eq.${uid}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  if (error) return { conversations: [], error };

  const enriched = await Promise.all((data || []).map(async (conv) => {
    const otherUserId = conv.user_a === uid ? conv.user_b : conv.user_a;
    const [{ data: myP }, { data: profile }] = await Promise.all([
      supabase.from('conversation_participants').select('last_read_at,unread_count,last_seen_at').eq('conversation_id', conv.id).eq('user_id', uid).maybeSingle(),
      supabase.from('profiles').select('user_id,display_name,username,avatar_url').eq('user_id', otherUserId).maybeSingle(),
    ]);
    return {
      id: conv.id, created_at: conv.created_at,
      last_message_at: conv.last_message_at, last_message_preview: conv.last_message_preview,
      other_user: profile || { user_id: otherUserId },
      unread_count: myP?.unread_count || 0,
      last_read_at: myP?.last_read_at || null,
      other_last_seen: myP?.last_seen_at || null,
    };
  }));
  return { conversations: enriched, error: null };
}

// ── Messages ─────────────────────────────────────────────────────────────

export async function getConversationMessages(conversationId, { limit = 40, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('messages')
    .select('id,conversation_id,sender_id,content,message_type,voice_url,voice_duration,created_at,updated_at,deleted_at,delivered_at,read_at')
    .eq('conversation_id', conversationId).is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { messages: [], error };
  return { messages: (data || []).reverse(), error: null };
}

export async function sendMessage(conversationId, content) {
  const uid = await getUserId();
  if (!uid) return { message: null, error: new Error('Not authenticated') };
  if (!content?.trim()) return { message: null, error: new Error('Empty message') };

  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: uid, content: content.trim(), message_type: 'text' })
    .select('*').single();

  if (insertErr) return { message: null, error: insertErr };

  // Update conversation metadata
  const preview = content.trim().substring(0, 120);
  await supabase.from('conversations').update({
    last_message_at: message.created_at, last_message_preview: preview, updated_at: new Date().toISOString(),
  }).eq('id', conversationId);

  // Increment unread + backfill participants
  const { data: conv } = await supabase.from('conversations').select('user_a,user_b').eq('id', conversationId).single();
  if (conv) {
    const otherId = conv.user_a === uid ? conv.user_b : conv.user_a;
    await ensureParticipants(conversationId, conv.user_a, conv.user_b);
    const { data: part } = await supabase.from('conversation_participants')
      .select('unread_count').eq('conversation_id', conversationId).eq('user_id', otherId).maybeSingle();
    if (part) {
      await supabase.from('conversation_participants')
        .update({ unread_count: (part.unread_count || 0) + 1 })
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

  await supabase.from('conversations').update({
    last_message_at: message.created_at, last_message_preview: '🎤 Voice message', updated_at: new Date().toISOString(),
  }).eq('id', conversationId);

  const { data: conv } = await supabase.from('conversations').select('user_a,user_b').eq('id', conversationId).single();
  if (conv) {
    const otherId = conv.user_a === uid ? conv.user_b : conv.user_a;
    await ensureParticipants(conversationId, conv.user_a, conv.user_b);
    const { data: part } = await supabase.from('conversation_participants')
      .select('unread_count').eq('conversation_id', conversationId).eq('user_id', otherId).maybeSingle();
    if (part) {
      await supabase.from('conversation_participants')
        .update({ unread_count: (part.unread_count || 0) + 1 })
        .eq('conversation_id', conversationId).eq('user_id', otherId);
    }
  }
  return { message, error: null };
}

// ── Read / Delivery ──────────────────────────────────────────────────────

export async function markConversationAsRead(conversationId) {
  const uid = await getUserId();
  if (!uid) return { error: new Error('Not authenticated') };

  // Reset participant unread
  await supabase.from('conversation_participants')
    .update({ last_read_at: new Date().toISOString(), unread_count: 0 })
    .eq('conversation_id', conversationId).eq('user_id', uid);

  // Mark all other user's messages as read
  const now = new Date().toISOString();
  await supabase.from('messages')
    .update({ read_at: now })
    .eq('conversation_id', conversationId)
    .neq('sender_id', uid)
    .is('read_at', null)
    .is('deleted_at', null);

  return { error: null };
}

export async function markMessagesDelivered(conversationId) {
  const uid = await getUserId();
  if (!uid) return;

  const now = new Date().toISOString();
  await supabase.from('messages')
    .update({ delivered_at: now })
    .eq('conversation_id', conversationId)
    .neq('sender_id', uid)
    .is('delivered_at', null)
    .is('deleted_at', null);
}

export async function updatePresence() {
  const uid = await getUserId();
  if (!uid) return;

  const now = new Date().toISOString();
  // Update last_seen for all conversations I'm in
  const { data: parts } = await supabase.from('conversation_participants')
    .select('conversation_id').eq('user_id', uid);

  if (parts?.length) {
    await supabase.from('conversation_participants')
      .update({ last_seen_at: now })
      .eq('user_id', uid);
  }
}

export async function deleteMessage(messageId) {
  const { error } = await supabase.from('messages')
    .update({ deleted_at: new Date().toISOString() }).eq('id', messageId);
  return { error };
}

// ── Voice Upload ─────────────────────────────────────────────────────────

export async function uploadVoiceBlob(blob, conversationId, userId, messageId) {
  const path = `${conversationId}/${userId}/${messageId}.webm`;
  const { error } = await supabase.storage
    .from('voice-messages')
    .upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false });

  if (error) return { url: null, error };
  const { data } = supabase.storage.from('voice-messages').getPublicUrl(path);
  return { url: data?.publicUrl || null, error: null };
}

// ── Realtime Subscriptions ───────────────────────────────────────────────

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

export function subscribeToMessageUpdates(conversationId, currentUserId, onUpdate) {
  const channel = supabase
    .channel(`conv-upd:${conversationId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      const msg = payload.new;
      if (msg.sender_id === currentUserId) return;
      onUpdate(msg);
    }).subscribe();

  return () => { supabase.removeChannel(channel).catch(() => {}); };
}

export function subscribeToConversationList(onUpdate) {
  const channel = supabase
    .channel('conv-list')
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'conversations',
    }, () => { onUpdate(); })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'conversations',
    }, () => { onUpdate(); })
    .subscribe();

  return () => { supabase.removeChannel(channel).catch(() => {}); };
}

// ── Typing / Presence via Realtime Broadcast ─────────────────────────────

const TYPING_THROTTLE = 3000; // 3 seconds between typing events

export function broadcastTyping(conversationId, isTyping) {
  const channel = supabase.channel(`typing:${conversationId}`);
  channel.send({ type: 'broadcast', event: 'typing', payload: { isTyping } });
  return () => { supabase.removeChannel(channel).catch(() => {}); };
}

export function subscribeToTyping(conversationId, onTyping) {
  const channel = supabase.channel(`typing:${conversationId}`);
  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      onTyping(payload.payload?.isTyping || false);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel).catch(() => {}); };
}
