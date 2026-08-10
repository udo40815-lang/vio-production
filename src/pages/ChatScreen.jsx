// ============================================================================
// Vio — ChatScreen (DM experience)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, Send, Trash2, AlertCircle } from 'lucide-react';
import { V } from '../utils/design-system.js';
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
  const [sendError, setSendError] = useState(null);
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

  const loadOlder = useCallback(async () => {
    if (!conversation?.id || !hasMore || loadingOlder) return;
    setLoadingOlder(true);
    const { messages: older, error: e } = await getConversationMessages(conversation.id, { limit: PAGE_SIZE, offset: messages.length });
    if (!e && older.length > 0) {
      const combined = [...older, ...messages];
      seenIds.current = new Set(combined.map(m => m.id));
      const container = msgListRef.current;
      const prevHeight = container?.scrollHeight || 0;
      setMessages(combined);
      setHasMore(older.length >= PAGE_SIZE);
      requestAnimationFrame(() => { if (container) container.scrollTop = container.scrollHeight - prevHeight; });
    } else { setHasMore(false); }
    setLoadingOlder(false);
  }, [conversation?.id, hasMore, loadingOlder, messages]);

  useEffect(() => {
    loadMessages();
    if (conversation?.id) markConversationAsRead(conversation.id).catch(() => {});
  }, [conversation?.id]);

  // ── Realtime ──
  useEffect(() => {
    if (!conversation?.id || !uid) return;
    const unsub = subscribeToConversation(conversation.id, uid, (msg) => {
      setMessages(prev => {
        if (seenIds.current.has(msg.id)) return prev;
        seenIds.current.add(msg.id);
        markConversationAsRead(conversation.id).catch(() => {});
        if (scrolledUp) setNewMsgBelow(true);
        return [...prev, msg];
      });
    });
    return unsub;
  }, [conversation?.id, uid, scrolledUp]);

  // ── Scroll ──
  useEffect(() => {
    if (!scrolledUp) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const el = msgListRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setScrolledUp(!atBottom);
    if (atBottom) setNewMsgBelow(false);
    if (el.scrollTop < 50 && hasMore && !loadingOlder) loadOlder();
  }, [hasMore, loadingOlder, loadOlder]);

  // ── Send text (only on button press — Enter creates new line) ──
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !conversation?.id) return;

    setSending(true);
    setSendError(null);

    // Optimistic
    const optId = `opt-${Date.now()}`;
    const optimistic = { id: optId, conversation_id: conversation.id, sender_id: uid, content: trimmed, created_at: new Date().toISOString(), _pending: true };
    setMessages(prev => [...prev, optimistic]);
    setScrolledUp(false);
    setInput('');

    const { message: sent, error: sendErr } = await sendMessage(conversation.id, trimmed);

    if (sent) {
      seenIds.current.add(sent.id);
      setMessages(prev => prev.map(m => m.id === optId ? sent : m));
    } else {
      // Remove optimistic, restore text
      setMessages(prev => prev.filter(m => m.id !== optId));
      setInput(trimmed);
      setSendError(sendErr?.message || 'Message could not be sent. Try again.');
      inputRef.current?.focus();
    }
    setSending(false);
  };

  const handleRetry = (msg) => {
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    setInput(msg.content || '');
    inputRef.current?.focus();
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    setDeletingId(id);
    const { error: e } = await deleteMessage(id);
    if (!e) setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m));
    setDeletingId(null);
  };

  // ── Timestamps ──
  const formatTime = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ── Render bubble ──
  const renderBubble = (msg, idx) => {
    const isMine = msg.sender_id === uid;
    const isDeleted = !!msg.deleted_at;
    const isFailed = msg._failed;
    const isPending = msg._pending;
    const isDeleting = deletingId === msg.id;
    const prev = idx > 0 ? messages[idx - 1] : null;
    const showTs = !prev || prev.sender_id !== msg.sender_id || (new Date(msg.created_at) - new Date(prev.created_at)) > 5 * 60 * 1000;
    const sameAsPrev = prev && prev.sender_id === msg.sender_id;
    const showAvatar = !isMine && (!prev || prev.sender_id !== msg.sender_id);

    return (
      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1.5 px-3`}>
        <div className={`flex items-end gap-2 max-w-[82%] ${isMine ? 'flex-row-reverse' : ''}`}>
          {showAvatar && <div className="shrink-0 mb-0.5"><Avatar handle={otherUser?.username} name={otherUser?.display_name} src={otherUser?.avatar_url || null} size={26} /></div>}
          {!isMine && !showAvatar && <div className="shrink-0" style={{ width: 26 }} />}
          <div className="group relative">
            <div
              className={`px-3.5 py-2.5 text-[14px] leading-relaxed break-words ${isFailed ? 'opacity-60' : ''} ${isPending ? 'opacity-75' : ''}`}
              style={{
                background: isMine ? V.royal : (ui.dark ? V.surfaceDark : '#F1F1F4'),
                color: isMine ? '#FFF' : ui.textPrimary,
                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                borderTopRightRadius: isMine && sameAsPrev ? '4px' : '18px',
                borderTopLeftRadius: !isMine && sameAsPrev ? '4px' : '18px',
              }}>
              {isDeleted ? <span className="italic opacity-50 text-[12px]">Message deleted</span> : <span>{msg.content}</span>}
            </div>
            {showTs && !isPending && (
              <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {isFailed ? (
                  <button onClick={() => handleRetry(msg)} className="flex items-center gap-1" style={{ color: V.red }}><AlertCircle size={10} /><span className="text-[10px] font-medium">Failed</span></button>
                ) : (
                  <span className="text-[10px]" style={{ color: ui.textMuted, fontVariantNumeric: 'tabular-nums' }}>{formatTime(msg.created_at)}</span>
                )}
                {isMine && !isDeleted && !isFailed && !isPending && (
                  <button onClick={() => handleDelete(msg.id)} disabled={isDeleting} className="opacity-0 group-hover:opacity-100 p-0.5">
                    {isDeleting ? <Loader2 size={10} className="animate-spin" style={{ color: ui.textMuted }} /> : <Trash2 size={10} style={{ color: ui.textMuted }} />}
                  </button>
                )}
              </div>
            )}
            {isPending && (
              <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <Loader2 size={10} className="animate-spin" style={{ color: isMine ? 'rgba(255,255,255,0.5)' : ui.textMuted }} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col" style={{ height: '100dvh', maxWidth: '600px', margin: '0 auto' }}>
      {/* ── Header (sticky) ── */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2.5"
        style={{ background: ui.dark ? '#09090B' : '#F8F8FA', borderBottom: `1px solid ${ui.border}` }}>
        <button onClick={onBack} className="p-1.5 rounded-full" aria-label="Back">
          <ArrowLeft size={20} style={{ color: ui.textPrimary }} />
        </button>
        <button
          onClick={() => { if (onViewProfile && otherUser?.user_id) { onBack(); setTimeout(() => onViewProfile(otherUser.user_id), 100); } }}
          className="flex items-center gap-3 flex-1 min-w-0"
          style={{ background: 'none', border: 'none', cursor: onViewProfile ? 'pointer' : 'default' }}>
          <Avatar handle={otherUser?.username} name={otherUser?.display_name} src={otherUser?.avatar_url || null} size={34} />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[14.5px] font-semibold truncate" style={{ color: ui.textPrimary }}>
              {otherUser?.display_name || otherUser?.username || 'Unknown'}
            </div>
            <div className="text-[11px]" style={{ color: ui.textMuted }}>@{otherUser?.username || 'unknown'}</div>
          </div>
        </button>
      </div>

      {/* ── Messages (scrollable, flex-1) ── */}
      <div ref={msgListRef} className="flex-1 overflow-y-auto py-2" style={{ background: ui.bg }} onScroll={handleScroll}>
        {hasMore && (<div className="flex justify-center py-2">{loadingOlder ? <Loader2 size={14} className="animate-spin" style={{ color: ui.textMuted }} /> : <div className="text-[11px]" style={{ color: ui.textMuted }}>Scroll for older</div>}</div>)}
        {loading && (<div className="flex items-center justify-center py-12 gap-2" style={{ color: ui.textMuted }}><Loader2 size={16} className="animate-spin" /><span className="text-[13px]">Loading...</span></div>)}
        {error && !loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-[14px] mb-3" style={{ color: ui.textSecondary }}>Could not load messages.</div>
            <button onClick={loadMessages} className="h-[30px] px-4 rounded-full text-[12px] font-semibold" style={{ background: V.royal, color: '#FFF' }}>Retry</button>
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-[14px]" style={{ color: ui.textMuted }}>No messages yet</div>
            <div className="text-[12px] mt-1" style={{ color: ui.textMuted }}>Start the conversation.</div>
          </div>
        )}
        {!loading && messages.map((msg, idx) => renderBubble(msg, idx))}
        <div ref={bottomRef} />
      </div>

      {/* New messages indicator */}
      {newMsgBelow && (
        <button onClick={() => { setScrolledUp(false); setNewMsgBelow(false); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
          className="absolute bottom-[90px] left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-[11px] font-semibold shadow-lg"
          style={{ background: V.royal, color: '#FFF' }}>New messages ↓</button>
      )}

      {/* ── Send error ── */}
      {sendError && (
        <div className="shrink-0 px-3 py-1.5 text-center text-[12px]" style={{ background: `${V.red}12`, color: V.red }}>
          {sendError}
          <button onClick={() => setSendError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* ── Composer (sticky bottom) ── */}
      <div className="shrink-0 px-3 py-3" style={{
        background: ui.dark ? '#09090B' : '#F8F8FA',
        borderTop: `1px solid ${ui.border}`,
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}>
        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-2xl px-4 py-2.5" style={{ background: ui.dark ? V.surfaceDark : '#EBEBF0' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a message..."
              rows={1}
              disabled={sending}
              className="w-full bg-transparent text-[14px] leading-relaxed resize-none outline-none"
              style={{ color: ui.textPrimary, maxHeight: '80px', fontFamily: 'inherit' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: input.trim() && !sending ? V.royal : (ui.dark ? V.surfaceDark : '#D4D4DC'),
              opacity: input.trim() && !sending ? 1 : 0.5,
            }}
            aria-label="Send">
            {sending ? <Loader2 size={16} className="animate-spin" style={{ color: '#FFF' }} />
              : <Send size={16} style={{ color: input.trim() ? '#FFF' : (ui.dark ? '#71717A' : '#8E8E96') }} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ChatScreen;
