// ============================================================================
// Vio — Messages Inbox Screen (Phase 3 — realtime updates)
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessagesSquare, Loader2, AlertCircle } from 'lucide-react';
import { V, timeAgo } from '../utils/design-system.js';
import { getUserConversations, subscribeToConversationUpdates } from '../lib/messages.js';
import Avatar from '../components/ui/Avatar.jsx';

function MessagesScreen({ ui, onOpenConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshRef = useRef(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const { conversations: convs, error: err } = await getUserConversations();
    setConversations(convs || []);
    setError(err);
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Realtime updates for conversation list
  useEffect(() => {
    const uid = ui.currentUserId;
    if (!uid) return;

    const unsub = subscribeToConversationUpdates(uid, () => {
      // Re-fetch conversations when any conv changes
      refreshRef.current = true;
      getUserConversations().then(({ conversations: convs }) => {
        if (refreshRef.current) {
          setConversations(convs || []);
        }
      });
    });

    return () => {
      refreshRef.current = false;
      unsub();
    };
  }, [ui.currentUserId]);

  // ── Loading ──
  if (loading) {
    return (
      <section className="px-4 pt-6 pb-20">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] mb-6" style={{ color: ui.textPrimary }}>Messages</h1>
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: ui.textMuted }}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading conversations...</span>
        </div>
      </section>
    );
  }

  // ── Error ──
  if (error && conversations.length === 0) {
    return (
      <section className="px-4 pt-6 pb-20">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] mb-6" style={{ color: ui.textPrimary }}>Messages</h1>
        <div className="rounded-3xl p-10 text-center" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${V.red}15` }}>
            <AlertCircle size={20} style={{ color: V.red }} />
          </div>
          <div className="mt-4 text-[16px] font-semibold" style={{ color: ui.textPrimary }}>Could not load messages</div>
          <div className="mt-1.5 text-[13px] leading-relaxed" style={{ color: ui.textSecondary }}>{error?.message || 'Something went wrong.'}</div>
          <button onClick={loadConversations} className="mt-4 h-[34px] px-5 rounded-full text-[13px] font-semibold" style={{ background: V.royal, color: '#FFF' }}>Try again</button>
        </div>
      </section>
    );
  }

  // ── Empty ──
  if (conversations.length === 0) {
    return (
      <section className="px-4 pt-6 pb-20">
        <h1 className="text-[24px] font-bold tracking-[-0.03em] mb-6" style={{ color: ui.textPrimary }}>Messages</h1>
        <div className="rounded-3xl p-10 text-center" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${V.royal}15` }}>
            <MessagesSquare size={20} style={{ color: ui.textMuted }} />
          </div>
          <div className="mt-4 text-[16px] font-semibold" style={{ color: ui.textPrimary }}>No messages yet</div>
          <div className="mt-1.5 text-[13px] leading-relaxed max-w-xs mx-auto" style={{ color: ui.textSecondary }}>
            Start a conversation with someone on Vio by visiting their profile.
          </div>
        </div>
      </section>
    );
  }

  // ── Conversation List ──
  return (
    <section className="px-4 pt-6 pb-20">
      <h1 className="text-[24px] font-bold tracking-[-0.03em] mb-5" style={{ color: ui.textPrimary }}>Messages</h1>
      <div className="space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onOpenConversation?.(conv)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-150 hover:brightness-105 active:scale-[0.99]"
            style={{ background: 'transparent' }}
          >
            <Avatar handle={conv.other_user?.username || '?'} name={conv.other_user?.display_name} src={conv.other_user?.avatar_url || null} size={48} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[14.5px] font-semibold truncate leading-snug" style={{ color: ui.textPrimary }}>
                  {conv.other_user?.display_name || conv.other_user?.username || 'Unknown'}
                </span>
                <span className="text-[11px] shrink-0 ml-2" style={{ color: ui.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] truncate" style={{
                  color: conv.unread_count > 0 ? ui.textPrimary : ui.textSecondary,
                  fontWeight: conv.unread_count > 0 ? 500 : 400,
                }}>
                  {conv.last_message_preview || <span className="italic" style={{ color: ui.textMuted }}>No messages yet</span>}
                </span>
                {conv.unread_count > 0 && (
                  <span className="shrink-0 ml-2 min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: V.royal, color: '#FFF' }}>
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </span>
                )}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: ui.textMuted }}>@{conv.other_user?.username || 'unknown'}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default MessagesScreen;
