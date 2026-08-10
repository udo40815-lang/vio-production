// ============================================================================
// Vio — ChatScreen (Production DM Experience)
// Text + Voice, Read Receipts, Typing Indicators, Presence, Realtime
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, Send, Trash2, AlertCircle, Mic, Play, Pause, Square, Check, CheckCheck } from 'lucide-react';
import { V } from '../utils/design-system.js';
import {
  getConversationMessages, sendMessage, sendVoiceMessage, markConversationAsRead,
  deleteMessage, subscribeToConversation, subscribeToMessageUpdates, uploadVoiceBlob,
  markMessagesDelivered, updatePresence, subscribeToTyping,
} from '../lib/messages.js';
import Avatar from '../components/ui/Avatar.jsx';
import { supabase } from '../lib/supabase.js';

// ── VoiceNotePlayer (inline, compact, Vio-styled) ──
function VoiceNotePlayer({ url, duration, isMine, ui, messageId }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (playing && window.__vioActiveAudio && window.__vioActiveAudio !== messageId) {
      window.__vioActiveAudioEl?.pause();
    }
    if (playing) { window.__vioActiveAudio = messageId; window.__vioActiveAudioEl = audioRef.current; }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (window.__vioActiveAudio === messageId) { window.__vioActiveAudio = null; window.__vioActiveAudioEl = null; }
    };
  }, [playing, messageId]);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { a.play().catch(() => setError(true)); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  const onEnded = () => { setPlaying(false); setProgress(0); };
  const onError = () => { setError(true); setPlaying(false); };

  useEffect(() => {
    if (playing && duration > 0) {
      timerRef.current = setInterval(() => {
        const a = audioRef.current;
        if (!a || a.paused) return;
        if (isFinite(a.duration) && a.duration > 0) setProgress(a.currentTime / a.duration);
        else setProgress(p => Math.min(p + 0.1 / duration, 1));
      }, 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, duration]);

  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const accent = isMine ? '#FFF' : V.royal;
  const bg = isMine ? 'rgba(255,255,255,0.2)' : (ui.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)');

  if (error) return <span className="text-[11px] italic" style={{ color: isMine ? 'rgba(255,255,255,0.6)' : V.red }}>Playback failed</span>;

  return (
    <div className="voice-note inline-flex items-center gap-2 min-w-[130px]">
      <audio ref={audioRef} src={url} preload="none" onEnded={onEnded} onError={onError} style={{ display: 'none' }} />
      <button onClick={toggle} className="shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center" style={{ background: bg }}>
        {playing ? <Pause size={12} style={{ color: accent }} /> : <Play size={13} style={{ color: accent, marginLeft: 1 }} className="fill-current" />}
      </button>
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: bg }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(progress * 100, 100)}%`, background: accent, opacity: 0.65 }} />
      </div>
      <span className="text-[10px] shrink-0" style={{ color: isMine ? 'rgba(255,255,255,0.6)' : ui.textMuted, fontVariantNumeric: 'tabular-nums' }}>{fmt(duration || 0)}</span>
    </div>
  );
}

// ── ChatScreen ────────────────────────────────────────────────────────────

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

  // Voice
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micDenied, setMicDenied] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadMsgId, setUploadMsgId] = useState(null);

  // Presence / Typing
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);

  const bottomRef = useRef(null);
  const msgListRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const seenIds = useRef(new Set());
  const PAGE = 40;
  const MAX_REC = 120;

  const otherUser = conversation?.other_user || {};
  const uid = ui.currentUserId;

  // ── Load ──
  const loadMessages = useCallback(async () => {
    if (!conversation?.id) return;
    setLoading(true);
    const { messages: msgs, error: e } = await getConversationMessages(conversation.id, { limit: PAGE });
    setMessages(msgs || []);
    seenIds.current = new Set((msgs || []).map(m => m.id));
    setHasMore((msgs || []).length >= PAGE);
    setError(e);
    setLoading(false);
  }, [conversation?.id]);

  const loadOlder = useCallback(async () => {
    if (!conversation?.id || !hasMore || loadingOlder) return;
    setLoadingOlder(true);
    const { messages: older, error: e } = await getConversationMessages(conversation.id, { limit: PAGE, offset: messages.length });
    if (!e && older.length > 0) {
      const combined = [...older, ...messages];
      seenIds.current = new Set(combined.map(m => m.id));
      const c = msgListRef.current; const prev = c?.scrollHeight || 0;
      setMessages(combined); setHasMore(older.length >= PAGE);
      requestAnimationFrame(() => { if (c) c.scrollTop = c.scrollHeight - prev; });
    } else setHasMore(false);
    setLoadingOlder(false);
  }, [conversation?.id, hasMore, loadingOlder, messages]);

  useEffect(() => {
    loadMessages();
    if (conversation?.id) {
      markConversationAsRead(conversation.id).catch(() => {});
      markMessagesDelivered(conversation.id).catch(() => {});
      updatePresence().catch(() => {});
    }
  }, [conversation?.id]);

  // Presence heartbeat
  useEffect(() => {
    const h = setInterval(() => updatePresence().catch(() => {}), 30000);
    return () => clearInterval(h);
  }, []);

  // ── Realtime ──
  useEffect(() => {
    if (!conversation?.id || !uid) return;
    const unsubNew = subscribeToConversation(conversation.id, uid, (msg) => {
      setMessages(prev => {
        if (seenIds.current.has(msg.id)) return prev;
        seenIds.current.add(msg.id);
        markConversationAsRead(conversation.id).catch(() => {});
        markMessagesDelivered(conversation.id).catch(() => {});
        if (scrolledUp) setNewMsgBelow(true);
        return [...prev, msg];
      });
    });
    const unsubUpd = subscribeToMessageUpdates(conversation.id, uid, (msg) => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, delivered_at: msg.delivered_at, read_at: msg.read_at } : m));
    });
    const unsubType = subscribeToTyping(conversation.id, (typing) => setOtherTyping(typing));
    return () => { unsubNew(); unsubUpd(); unsubType(); };
  }, [conversation?.id, uid, scrolledUp]);

  // ── Other user's presence ──
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(`presence:${conversation?.id}`);
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      setOtherOnline(Object.keys(state).some(k => k !== uid));
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ user_id: uid, online_at: new Date().toISOString() });
    });
    return () => { supabase.removeChannel(ch).catch(() => {}); setOtherOnline(false); };
  }, [conversation?.id, uid]);
  // Need supabase ref

  // ── Scroll ──
  useEffect(() => { if (!scrolledUp) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  const handleScroll = useCallback(() => {
    const el = msgListRef.current; if (!el) return;
    const atBot = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setScrolledUp(!atBot); if (atBot) setNewMsgBelow(false);
    if (el.scrollTop < 50 && hasMore && !loadingOlder) loadOlder();
  }, [hasMore, loadingOlder, loadOlder]);

  // ── Send ──
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !conversation?.id) return;
    setSending(true); setSendError(null);
    const optId = `opt-${Date.now()}`;
    setMessages(prev => [...prev, { id: optId, conversation_id: conversation.id, sender_id: uid, content: trimmed, created_at: new Date().toISOString(), _pending: true }]);
    setScrolledUp(false); setInput('');
    const { message: sent, error: e } = await sendMessage(conversation.id, trimmed);
    if (sent) { seenIds.current.add(sent.id); setMessages(prev => prev.map(m => m.id === optId ? sent : m)); }
    else { setMessages(prev => prev.filter(m => m.id !== optId)); setInput(trimmed); setSendError(e?.message || 'Failed to send. Try again.'); inputRef.current?.focus(); }
    setSending(false);
  };

  // ── Typing broadcast ──  (using supabase direct)
  const onInputChange = (val) => {
    setInput(val);
    // Simple typing broadcast
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    // broadcast via supabase (inline)
    const ch = supabase.channel(`typing:${conversation?.id}`);
    ch.send({ type: 'broadcast', event: 'typing', payload: { isTyping: true } });
    supabase.removeChannel(ch).catch(() => {});
    typingTimerRef.current = setTimeout(() => {
      const ch2 = supabase.channel(`typing:${conversation?.id}`);
      ch2.send({ type: 'broadcast', event: 'typing', payload: { isTyping: false } });
      supabase.removeChannel(ch2).catch(() => {});
    }, 3000);
  };

  // ── Voice ──
  const startRecording = async () => {
    setMicDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec; chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime.split(';')[0] });
        if (blob.size < 100) return;
        await handleVoiceSend(blob, recordingTime);
      };
      rec.start(200);
      setRecording(true); setRecordingTime(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingTime(t => { if (t + 1 >= MAX_REC) { stopRecording(); return MAX_REC; } return t + 1; });
      }, 1000);
    } catch (e) {
      if (e.name === 'NotAllowedError') setMicDenied(true);
      else console.error('[Vio] mic:', e);
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop()); }
    chunksRef.current = []; setRecording(false); setRecordingTime(0);
  };

  const handleVoiceSend = async (blob, duration) => {
    if (!conversation?.id) return;
    setUploadingVoice(true);
    const optId = `vopt-${Date.now()}`;
    setMessages(prev => [...prev, { id: optId, conversation_id: conversation.id, sender_id: uid, message_type: 'voice', voice_duration: duration, created_at: new Date().toISOString(), _pending: true }]);
    setScrolledUp(false); setUploadMsgId(optId);
    const { url, error: upErr } = await uploadVoiceBlob(blob, conversation.id, uid, `voice-${Date.now()}`);
    if (upErr || !url) { setMessages(prev => prev.map(m => m.id === optId ? { ...m, _failed: true } : m)); setUploadingVoice(false); setUploadMsgId(null); return; }
    const { message: sent, error: sendErr } = await sendVoiceMessage(conversation.id, url, duration);
    if (sent) { seenIds.current.add(sent.id); setMessages(prev => prev.map(m => m.id === optId ? { ...sent, voice_url: url } : m)); }
    else { setMessages(prev => prev.map(m => m.id === optId ? { ...m, _failed: true, voice_url: url } : m)); }
    setUploadingVoice(false); setUploadMsgId(null);
  };

  // Cleanup
  useEffect(() => () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    window.__vioActiveAudioEl?.pause();
  }, []);

  // ── Render helpers ──
  const formatTime = (iso) => {
    const d = new Date(iso); if (isNaN(d)) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const fmtDur = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const getStatus = (msg) => {
    if (msg._pending || msg._uploading) return 'sending';
    if (msg.read_at) return 'read';
    if (msg.delivered_at) return 'delivered';
    return 'sent';
  };

  const StatusIcon = ({ msg }) => {
    const s = getStatus(msg);
    const col = s === 'read' ? V.royal : 'rgba(255,255,255,0.5)';
    if (s === 'sending') return <Loader2 size={10} className="animate-spin" style={{ color: 'rgba(255,255,255,0.5)' }} />;
    if (s === 'sent') return <Check size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />;
    return <CheckCheck size={12} style={{ color: col }} />;
  };

  const renderBubble = (msg, idx) => {
    const isMine = msg.sender_id === uid;
    const isDeleted = !!msg.deleted_at;
    const isFailed = msg._failed;
    const isPending = msg._pending;
    const isVoice = msg.message_type === 'voice';
    const isDeleting = deletingId === msg.id;
    const isUploading = uploadMsgId === msg.id;
    const prev = idx > 0 ? messages[idx - 1] : null;
    const showTs = !prev || prev.sender_id !== msg.sender_id || (new Date(msg.created_at) - new Date(prev.created_at)) > 5 * 60 * 1000;
    const sameAsPrev = prev && prev.sender_id === msg.sender_id;
    const showAvatar = !isMine && (!prev || prev.sender_id !== msg.sender_id);

    return (
      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 px-3`}>
        <div className={`flex items-end gap-2 max-w-[82%] ${isMine ? 'flex-row-reverse' : ''}`}>
          {showAvatar && <div className="shrink-0 mb-0.5"><Avatar handle={otherUser?.username} name={otherUser?.display_name} src={otherUser?.avatar_url || null} size={26} /></div>}
          {!isMine && !showAvatar && <div className="shrink-0" style={{ width: 26 }} />}
          <div className="group relative">
            <div className={`px-3.5 py-2.5 text-[14px] leading-relaxed break-words overflow-hidden ${isFailed ? 'opacity-60' : ''} ${(isPending || isUploading) ? 'opacity-75' : ''}`}
              style={{ background: isMine ? V.royal : (ui.dark ? V.surfaceDark : '#F1F1F4'), color: isMine ? '#FFF' : ui.textPrimary, borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', borderTopRightRadius: isMine && sameAsPrev ? '4px' : '18px', borderTopLeftRadius: !isMine && sameAsPrev ? '4px' : '18px' }}>
              {isDeleted ? <span className="italic opacity-50 text-[12px]">Message deleted</span>
                : isVoice ? <VoiceNotePlayer url={msg.voice_url || ''} duration={msg.voice_duration || 0} isMine={isMine} ui={ui} messageId={msg.id} />
                  : <span className="whitespace-pre-wrap">{msg.content}</span>}
            </div>
            {showTs && !isPending && !isUploading && (
              <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {isFailed ? (
                  <span className="text-[10px] font-medium" style={{ color: V.red }}>Failed</span>
                ) : (
                  <>
                    <span className="text-[10px]" style={{ color: isMine ? 'rgba(255,255,255,0.5)' : ui.textMuted, fontVariantNumeric: 'tabular-nums' }}>{formatTime(msg.created_at)}</span>
                    {isMine && <StatusIcon msg={msg} />}
                  </>
                )}
                {isMine && !isDeleted && !isFailed && !isPending && (
                  <button onClick={() => handleDelete(msg.id)} disabled={isDeleting} className="opacity-0 group-hover:opacity-100 p-0.5 ml-1">
                    {isDeleting ? <Loader2 size={10} className="animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} /> : <Trash2 size={10} style={{ color: 'rgba(255,255,255,0.5)' }} />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col" style={{ height: '100dvh', maxWidth: '600px', margin: '0 auto', background: ui.bg }}>
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2.5" style={{ background: ui.dark ? '#09090B' : '#F8F8FA', borderBottom: `1px solid ${ui.border}` }}>
        <button onClick={onBack} className="p-1.5 rounded-full"><ArrowLeft size={20} style={{ color: ui.textPrimary }} /></button>
        <button onClick={() => { if (onViewProfile && otherUser?.user_id) { onBack(); setTimeout(() => onViewProfile(otherUser.user_id), 100); } }} className="flex items-center gap-3 flex-1 min-w-0" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <Avatar handle={otherUser?.username} name={otherUser?.display_name} src={otherUser?.avatar_url || null} size={34} />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[14.5px] font-semibold truncate" style={{ color: ui.textPrimary }}>{otherUser?.display_name || otherUser?.username || 'Unknown'}</div>
            <div className="text-[11px]" style={{ color: ui.textMuted }}>
              {otherTyping ? 'typing...' : otherOnline ? 'Online' : `@${otherUser?.username || 'unknown'}`}
            </div>
          </div>
        </button>
      </div>

      {/* ── Messages (flex-1, scrollable) ── */}
      <div ref={msgListRef} className="flex-1 overflow-y-auto py-2" onScroll={handleScroll}>
        {hasMore && (<div className="flex justify-center py-2">{loadingOlder ? <Loader2 size={14} className="animate-spin" style={{ color: ui.textMuted }} /> : <div className="text-[11px]" style={{ color: ui.textMuted }}>Scroll for older</div>}</div>)}
        {loading && (<div className="flex justify-center py-12"><Loader2 size={16} className="animate-spin" style={{ color: ui.textMuted }} /></div>)}
        {error && !loading && messages.length === 0 && (<div className="flex flex-col items-center py-12 px-4"><div className="text-[14px] mb-3" style={{ color: ui.textSecondary }}>Could not load messages.</div><button onClick={loadMessages} className="h-[30px] px-4 rounded-full text-[12px] font-semibold" style={{ background: V.royal, color: '#FFF' }}>Retry</button></div>)}
        {!loading && !error && messages.length === 0 && (<div className="flex flex-col items-center py-16 px-4"><div className="text-[14px]" style={{ color: ui.textMuted }}>No messages yet</div><div className="text-[12px] mt-1" style={{ color: ui.textMuted }}>Start the conversation.</div></div>)}
        {!loading && messages.map((msg, idx) => renderBubble(msg, idx))}
        <div ref={bottomRef} />
      </div>

      {newMsgBelow && (<button onClick={() => { setScrolledUp(false); setNewMsgBelow(false); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }} className="absolute bottom-[90px] left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-[11px] font-semibold shadow-lg" style={{ background: V.royal, color: '#FFF' }}>New messages ↓</button>)}

      {/* Send error */}
      {sendError && (<div className="shrink-0 px-3 py-1.5 text-center text-[12px]" style={{ background: `${V.red}12`, color: V.red }}>{sendError}<button onClick={() => setSendError(null)} className="ml-2 underline">Dismiss</button></div>)}
      {/* Mic denied */}
      {micDenied && (<div className="shrink-0 px-3 py-1.5 text-center text-[12px]" style={{ background: `${V.red}12`, color: V.red }}>Microphone access needed.<button onClick={() => setMicDenied(false)} className="ml-2 underline">Dismiss</button></div>)}

      {/* ── Recording UI ── */}
      {recording ? (
        <div className="shrink-0 px-3 py-3" style={{ background: ui.dark ? '#09090B' : '#F8F8FA', borderTop: `1px solid ${ui.border}`, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="shrink-0 w-[40px] h-[40px] rounded-full flex items-center justify-center" style={{ background: ui.dark ? V.surfaceDark : '#E4E4EA' }}><X size={18} style={{ color: V.red }} /></button>
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
              <span className="w-[8px] h-[8px] rounded-full animate-pulse" style={{ background: V.red }} />
              <span className="text-[14px] font-medium" style={{ color: ui.textPrimary }}>{fmtDur(recordingTime)}</span>
              <span className="text-[12px]" style={{ color: ui.textMuted }}>recording...</span>
            </div>
            <button onClick={stopRecording} className="shrink-0 w-[40px] h-[40px] rounded-full flex items-center justify-center" style={{ background: V.royal }}><Square size={16} fill="#FFF" style={{ color: '#FFF' }} /></button>
          </div>
        </div>
      ) : (
        /* ── Composer ── */
        <div className="shrink-0 px-3 py-3" style={{ background: ui.dark ? '#09090B' : '#F8F8FA', borderTop: `1px solid ${ui.border}`, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-2xl px-4 py-2.5" style={{ background: ui.dark ? V.surfaceDark : '#EBEBF0' }}>
              <textarea ref={inputRef} value={input} onChange={(e) => onInputChange(e.target.value)} placeholder="Write a message..." rows={1} disabled={sending || recording}
                className="w-full bg-transparent text-[14px] leading-relaxed resize-none outline-none" style={{ color: ui.textPrimary, maxHeight: '80px', fontFamily: 'inherit' }} />
            </div>
            {input.trim() ? (
              <button onClick={handleSend} disabled={!input.trim() || sending}
                className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all" style={{ background: input.trim() && !sending ? V.royal : (ui.dark ? V.surfaceDark : '#D4D4DC'), opacity: input.trim() && !sending ? 1 : 0.5 }}>
                {sending ? <Loader2 size={16} className="animate-spin" style={{ color: '#FFF' }} /> : <Send size={16} style={{ color: input.trim() ? '#FFF' : (ui.dark ? '#71717A' : '#8E8E96') }} strokeWidth={2.5} />}
              </button>
            ) : (
              <button onClick={startRecording} disabled={uploadingVoice}
                className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ background: V.royal }}>
                {uploadingVoice ? <Loader2 size={16} className="animate-spin" style={{ color: '#FFF' }} /> : <Mic size={16} style={{ color: '#FFF' }} strokeWidth={2.5} />}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ChatScreen;
