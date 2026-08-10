// ============================================================================
// Vio — Chat Screen (Phase 3 — realtime, scroll, delivery states)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Loader2, Send, Trash2, AlertCircle, Check, X } from 'lucide-react';
import { V, timeAgo } from '../utils/design-system.js';
import { getConversationMessages, sendMessage, markConversationAsRead, deleteMessage, subscribeToConversation } from '../lib/messages.js';
import Avatar from '../components/ui/Avatar.jsx';

function ChatScreen({ ui, conversation, onBack, onViewProfile }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [failedMsg, setFailedMsg] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [newMsgBelow, setNewMsgBelow] = useState(false);

  const bottomRef = useRef(null);
  const msgListRef = useRef(null);
  const inputRef = useRef(null);
  const seenIds = useRef(new Set());
  const PAGE_SIZE = 30;

  const otherUser = conversation?.other_user || {};
  const uid = ui.currentUserId;

  // ── Load messages ──
  const loadMessages = useCallback(async () => {
    if (!conversation?.id) return;
    setLoading(true);
    const { messages: msgs, error: e } = await getConversationMessages(conversation.id, { limit: PAGE_SIZE });
    setMessages(msgs || []);
    seenIds.current = new Set((msgs || []).map(m => m.id));
    setHasMore((msgs || []).length >= PAGE_SIZE);
    setError(e);
    setLoading(false);
  }, [conversation?.id]);

  // Load older messages (pagination)
  const loadOlder = useCallback(async () => {
    if (!conversation?.id || !hasMore || loadingOlder) return;
    setLoadingOlder(true);
    const offset = messages.length;
    const { messages: older, error: e } = await getConversationMessages(conversation.id, {
      limit: PAGE_SIZE,
      offset,
    });
    if (!e && older.length > 0) {
      const combined = [...older, ...messages];
      seenIds.current = new Set(combined.map(m => m.id));
      const container = msgListRef.current;
      const prevHeight = container?.scrollHeight || 0;
      setMessages(combined);
      setHasMore(older.length >= PAGE_SIZE);
      // Preserve scroll position
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevHeight;
        }
      });
    } else {
      setHasMore(false);
    }
    setLoadingOlder(false);
  }, [conversation?.id, hasMore, loadingOlder, messages]);

  useEffect(() => {
    loadMessages();
    if (conversation?.id) {
      markConversationAsRead(conversation.id).catch(() => {});
    }
  }, [conversation?.id]);

  // ── Realtime ──
  useEffect(() => {
    if (!conversation?.id || !uid) return;
    const unsub = subscribeToConversation(conversation.id, uid, (msg) => {
      setMessages(prev => {
        // Deduplicate
        if (seenIds.current.has(msg.id)) return prev;
        seenIds.current.add(msg.id);
        // Mark as read immediately if we're viewing
        markConversationAsRead(conversation.id).catch(() => {});
        // If scrolled up, show indicator instead of auto-scrolling
        if (scrolledUp) {
          setNewMsgBelow(true);
        }
        return [...prev, msg];
      });
    });
    return unsub;
  }, [conversation?.id, uid, scrolledUp]);

  // ── Scroll management ──
  useEffect(() => {
    if (!scrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]); // eslint-disable-line

  const handleScroll = useCallback(() => {
    const el = msgListRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setScrolledUp(!atBottom);
    if (atBottom) setNewMsgBelow(false);
    // Load older when scrolled near top
    if (el.scrollTop < 50 && hasMore && !loadingOlder) {
      loadOlder();
    }
  }, [hasMore, loadingOlder, loadOlder]);

  // ── Send message ──
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !conversation?.id) return;

    setSending(true);
    setInput('');

    // Optimistic insert
    const optimisticId = `opt-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      conversation_id: conversation.id,
      sender_id: uid,
      content: trimmed,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setScrolledUp(false);

    const { message: sent, error: sendErr } = await sendMessage(conversation.id, trimmed);

    if (sent) {
      // Replace optimistic with real message; prevent duplicate from realtime
      seenIds.current.add(sent.id);
      setMessages(prev => prev.map(m => m.id === optimisticId ? sent : m));
    } else {
      // Mark optimistic as failed
      setMessages(prev => prev.map(m =>
        m.id === optimisticId ? { ...m, _failed: true, _error: sendErr?.message } : m
      ));
    }
    setSending(false);
  };

  const handleRetry = async (msg) => {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    setInput(msg.content);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Delete message ──
  const handleDelete = async (messageId) => {
    setDeletingId(messageId);
    const { error: delErr } = await deleteMessage(messageId);
    if (!delErr) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted_at: new Date().toISOString() } : m));
    }
    setDeletingId(null);
  };

  // ── Timestamp formatting ──
  const formatMessageTime = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ── Render bubble ──
  const renderBubble = (msg, idx) => {
    const isMine = msg.sender_id === uid;
    const isDeleted = !!msg.deleted_at;
    const isFailed = msg._failed;
    const isPending = msg._pending;
    const isDeleting = deletingId === msg.id;

    // Show timestamp only if previous message is from different sender or older than 5 min
    const prev = idx > 0 ? messages[idx - 1] : null;
    const showTimestamp = !prev ||
      prev.sender_id !== msg.sender_id ||
      (new Date(msg.created_at) - new Date(prev.created_at)) > 5 * 60 * 1000;

    return (
      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1.5 px-4`}>
        <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? 'flex-row-reverse' : ''}`}>
          {!isMine && (
            <div className="shrink-0">
              <Avatar handle={otherUser?.username} name={otherUser?.display_name} src={otherUser?.avatar_url || null} size={26} />
            </div>
          )}

          <div className="group relative">
            <div
              className={`rounded-[18px] px-3.5 py-2.5 text-[14px] leading-relaxed break-words ${isFailed ? 'opacity-70' : ''} ${isPending ? 'opacity-80' : ''}`}
              style={{
                background: isMine ? V.royal : (ui.dark ? V.surfaceDark : '#F1F1F4'),
                color: isMine ? '#FFF' : ui.textPrimary,
                borderBottomRightRadius: isMine ? '4px' : '18px',
                borderBottomLeftRadius: isMine ? '18px' : '4px',
              }}
            >
              {isDeleted ? (
                <span className="italic opacity-50 text-[12px]">Message deleted</span>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>

            {showTimestamp && !isPending && (
              <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {isFailed ? (
                  <button onClick={() => handleRetry(msg)} className="flex items-center gap-1" style={{ color: V.red }} aria-label="Retry">
                    <AlertCircle size={10} />
                    <span className="text-[10px] font-medium">Failed</span>
                  </button>
                ) : (
                  <span className="text-[10px]" style={{ color: ui.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMessageTime(msg.created_at)}
                  </span>
                )}

                {isMine && !isDeleted && !isFailed && !isPending && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    aria-label="Delete"
                  >
                    {isDeleting ? (
                      <Loader2 size={10} className="animate-spin" style={{ color: ui.textMuted }} />
                    ) : (
                      <Trash2 size={10} style={{ color: ui.textMuted }} />
                    )}
                  </button>
                )}

                {isPending && (
                  <Loader2 size={10} className="animate-spin" style={{ color: 'rgba(255,255,255,0.6)' }} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col" style={{ height: 'calc(100vh - 0px)', maxWidth: '600px', margin: '0 auto' }}>
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-3 py-3 shrink-0"
        style={{
          background: ui.dark ? 'rgba(9,9,11,0.92)' : 'rgba(248,248,250,0.92)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${ui.border}`,
        }}
      >
        <button onClick={onBack} className="p-1.5 rounded-full" aria-label="Back">
          <ArrowLeft size={18} style={{ color: ui.textPrimary }} />
        </button>
        <button
          onClick={() => { if (onViewProfile && otherUser?.user_id) { onBack(); onViewProfile(otherUser.user_id); } }}
          className="flex items-center gap-3 flex-1 min-w-0"
          style={{ background: 'none', border: 'none', cursor: onViewProfile ? 'pointer' : 'default' }}
        >
          <Avatar handle={otherUser?.username} name={otherUser?.display_name} src={otherUser?.avatar_url || null} size={36} />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[14.5px] font-semibold truncate leading-snug" style={{ color: ui.textPrimary }}>
              {otherUser?.display_name || otherUser?.username || 'Unknown'}
            </div>
            <div className="text-[11px]" style={{ color: ui.textMuted }}>@{otherUser?.username || 'unknown'}</div>
          </div>
        </button>
      </div>

      {/* ── Messages list ── */}
      <div
        ref={msgListRef}
        className="flex-1 overflow-y-auto py-3"
        style={{ background: ui.bg }}
        onScroll={handleScroll}
      >
        {/* Loading older */}
        {hasMore && (
          <div className="flex justify-center py-2">
            {loadingOlder ? (
              <Loader2 size={14} className="animate-spin" style={{ color: ui.textMuted }} />
            ) : (
              <div className="text-[11px]" style={{ color: ui.textMuted }}>Scroll for older messages</div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 gap-2" style={{ color: ui.textMuted }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[13px]">Loading messages...</span>
          </div>
        )}

        {error && !loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-[14px] mb-3" style={{ color: ui.textSecondary }}>{error?.message || 'Could not load messages.'}</div>
            <button onClick={loadMessages} className="h-[30px] px-4 rounded-full text-[12px] font-semibold" style={{ background: V.royal, color: '#FFF' }}>Retry</button>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-[14px]" style={{ color: ui.textMuted }}>Start the conversation</div>
            <div className="text-[12px] mt-1" style={{ color: ui.textMuted }}>Send a message to begin chatting.</div>
          </div>
        )}

        {!loading && messages.map((msg, idx) => renderBubble(msg, idx))}

        <div ref={bottomRef} />
      </div>

      {/* New messages indicator */}
      {newMsgBelow && (
        <button
          onClick={() => { setScrolledUp(false); setNewMsgBelow(false); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
          className="absolute bottom-[80px] left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-[11px] font-semibold shadow-lg transition-all"
          style={{ background: V.royal, color: '#FFF' }}
        >
          New messages ↓
        </button>
      )}

      {/* ── Composer ── */}
      <div
        className="shrink-0 px-3 py-3"
        style={{
          background: ui.dark ? '#09090B' : '#F8F8FA',
          borderTop: `1px solid ${ui.border}`,
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-end gap-2">
          <div
            className="flex-1 rounded-2xl px-4 py-2.5"
            style={{ background: ui.dark ? V.surfaceDark : '#EBEBF0' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-transparent text-[14px] leading-relaxed resize-none outline-none"
              style={{ color: ui.textPrimary, maxHeight: '80px', fontFamily: 'inherit' }}
              disabled={sending}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: input.trim() && !sending ? V.royal : (ui.dark ? V.surfaceDark : '#D4D4DC'),
              opacity: !input.trim() || sending ? 0.5 : 1,
            }}
            aria-label="Send"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" style={{ color: '#FFF' }} />
            ) : (
              <Send size={16} style={{ color: input.trim() ? '#FFF' : (ui.dark ? '#71717A' : '#8E8E96') }} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ChatScreen;
