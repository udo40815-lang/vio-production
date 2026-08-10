// ============================================================================
// Vio — Chat Screen
// Full conversation view with message bubbles, composer, and read tracking.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, Send, MoreHorizontal, Trash2, Clock } from 'lucide-react';
import { V, timeAgo } from '../utils/design-system.js';
import { getConversationMessages, sendMessage, markConversationAsRead, deleteMessage } from '../lib/messages.js';
import Avatar from '../components/ui/Avatar.jsx';

function ChatScreen({ ui, conversation, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const otherUser = conversation?.other_user || {};
  const uid = ui.currentUserId;

  // ── Load messages ──
  const loadMessages = useCallback(async () => {
    if (!conversation?.id) return;
    setLoading(true);
    const { messages: msgs, error: e } = await getConversationMessages(conversation.id);
    setMessages(msgs || []);
    setError(e);
    setLoading(false);
  }, [conversation?.id]);

  useEffect(() => {
    loadMessages();
    // Mark as read when opening
    if (conversation?.id) {
      markConversationAsRead(conversation.id).catch(() => {});
    }
  }, [conversation?.id]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !conversation?.id) return;
    setSending(true);
    const { message: sent, error: sendErr } = await sendMessage(conversation.id, trimmed);
    if (sent) {
      setMessages(prev => [...prev, sent]);
      setInput('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else if (sendErr) {
      setError(sendErr);
    }
    setSending(false);
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

  // ── Group by date ──
  const formatMessageTime = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ── Render helper: message bubble ──
  const renderBubble = (msg) => {
    const isMine = msg.sender_id === uid;
    const isDeleted = !!msg.deleted_at;
    const isDeleting = deletingId === msg.id;

    return (
      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2 px-4`}>
        <div className="flex items-end gap-2 max-w-[80%]">
          {!isMine && (
            <div className="shrink-0">
              <Avatar
                handle={otherUser?.username}
                name={otherUser?.display_name}
                src={otherUser?.avatar_url || null}
                size={28}
              />
            </div>
          )}

          <div className="group relative">
            <div
              className="rounded-[18px] px-3.5 py-2.5 text-[14px] leading-relaxed break-words"
              style={{
                background: isMine
                  ? V.royal
                  : (ui.dark ? V.surfaceDark : '#F1F1F4'),
                color: isMine ? '#FFF' : ui.textPrimary,
                opacity: isDeleting ? 0.5 : 1,
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

            <div
              className="flex items-center justify-end gap-1.5 mt-0.5 px-1"
              style={{ flexDirection: isMine ? 'row-reverse' : 'row' }}
            >
              <span className="text-[10px]" style={{ color: ui.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {formatMessageTime(msg.created_at)}
              </span>

              {/* Delete button — only sender, not deleted, on hover */}
              {isMine && !isDeleted && (
                <button
                  onClick={() => handleDelete(msg.id)}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:brightness-90"
                  style={{ background: 'transparent' }}
                  aria-label="Delete message"
                >
                  {isDeleting ? (
                    <Loader2 size={10} className="animate-spin" style={{ color: ui.textMuted }} />
                  ) : (
                    <Trash2 size={10} style={{ color: ui.textMuted }} />
                  )}
                </button>
              )}
            </div>
          </div>

          {isMine && (
            <div className="shrink-0">
              <Avatar
                handle={ui.handle || ''}
                name={ui.displayName}
                src={ui.avatarUrl || null}
                size={28}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col" style={{ height: 'calc(100vh - 90px)' }}>
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-3 py-3 shrink-0"
        style={{
          background: ui.dark ? 'rgba(9,9,11,0.92)' : 'rgba(248,248,250,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${ui.border}`,
        }}
      >
        <button
          onClick={onBack}
          className="p-1.5 rounded-full transition-colors hover:brightness-90"
          style={{ background: 'transparent' }}
          aria-label="Back to messages"
        >
          <ArrowLeft size={18} style={{ color: ui.textPrimary }} />
        </button>

        <Avatar
          handle={otherUser?.username}
          name={otherUser?.display_name}
          src={otherUser?.avatar_url || null}
          size={36}
        />

        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-semibold truncate leading-snug" style={{ color: ui.textPrimary }}>
            {otherUser?.display_name || otherUser?.username || 'Unknown'}
          </div>
          <div className="text-[11px]" style={{ color: ui.textMuted }}>
            @{otherUser?.username || 'unknown'}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-3" style={{ background: ui.bg }}>
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2" style={{ color: ui.textMuted }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[13px]">Loading messages...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-[14px] mb-3" style={{ color: ui.textSecondary }}>
              {error?.message || 'Could not load messages.'}
            </div>
            <button
              onClick={loadMessages}
              className="h-[30px] px-4 rounded-full text-[12px] font-semibold transition-all hover:scale-105"
              style={{ background: V.royal, color: '#FFF' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-[14px]" style={{ color: ui.textMuted }}>
              No messages yet. Say hello!
            </div>
          </div>
        )}

        {/* Messages */}
        {!loading && messages.length > 0 && (
          <>{messages.map(renderBubble)}</>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
      <div
        className="shrink-0 px-3 py-3"
        style={{
          background: ui.dark ? 'rgba(9,9,11,0.92)' : 'rgba(248,248,250,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: `1px solid ${ui.border}`,
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-end gap-2">
          <div
            className="flex-1 rounded-2xl px-4 py-2.5"
            style={{
              background: ui.dark ? V.surfaceDark : '#EBEBF0',
              border: 'none',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-transparent text-[14px] leading-relaxed resize-none outline-none"
              style={{
                color: ui.textPrimary,
                maxHeight: '80px',
                fontFamily: 'inherit',
              }}
              disabled={sending}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: input.trim() && !sending ? V.royal : (ui.dark ? V.surfaceDark : '#D4D4DC'),
              opacity: input.trim() && !sending ? 1 : 0.5,
              transform: input.trim() && !sending ? 'scale(1)' : 'scale(0.95)',
            }}
            aria-label="Send message"
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
