// ============================================================================
// Vio — ChatScreen (DM experience: text + voice notes)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, Send, Trash2, AlertCircle, Mic, MicOff, Play, Pause, Square, Paperclip, X, Upload } from 'lucide-react';
import { V, timeAgo } from '../utils/design-system.js';
import {
  getConversationMessages, sendMessage, sendVoiceMessage,
  markConversationAsRead, deleteMessage, subscribeToConversation, uploadVoiceBlob,
} from '../lib/messages.js';
import Avatar from '../components/ui/Avatar.jsx';

// ── VoiceNotePlayer (inline custom audio player) ──
function VoiceNotePlayer({ url, duration, isMine, ui, messageId }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef(null);
  const animRef = useRef(null);

  // Global: only one player at a time
  useEffect(() => {
    if (playing && window.__vioActiveAudio && window.__vioActiveAudio !== messageId) {
      window.__vioActiveAudioEl?.pause();
    }
    if (playing) {
      window.__vioActiveAudio = messageId;
      window.__vioActiveAudioEl = audioRef.current;
    }
  }, [playing, messageId]);

  const handlePlayPause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => setError(true));
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  }, []);

  const onLoaded = () => {
    setLoaded(true);
    const a = audioRef.current;
    if (a) {
      // Try to use real duration from audio
      if (isFinite(a.duration) && a.duration > 0 && !isNaN(a.duration)) {
        // Use real duration
      }
    }
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a && isFinite(a.duration) && a.duration > 0) {
      setProgress(a.currentTime / a.duration);
    } else if (duration && duration > 0 && a) {
      // Fallback to using stored duration
      const elapsed = a.currentTime;
      setProgress(Math.min(elapsed / duration, 1));
    }
  };

  const onEnded = () => { setPlaying(false); setProgress(0); };
  const onError = () => setError(true);

  // Simulated progress using stored duration when real duration unavailable
  useEffect(() => {
    if (playing && audioRef.current) {
      const a = audioRef.current;
      animRef.current = setInterval(() => {
        if (a && a.paused) return;
        if (duration && duration > 0 && (!isFinite(a?.duration) || a?.duration <= 0)) {
          setProgress(p => {
            const step = 1 / (duration * 10);
            const next = p + step;
            if (next >= 1) { clearInterval(animRef.current); setPlaying(false); return 1; }
            return next;
          });
        }
      }, 100);
    }
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [playing, duration]);

  const fmtDuration = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const accent = isMine ? '#FFF' : V.royal;
  const bg = isMine ? 'rgba(255,255,255,0.2)' : (ui.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)');

  if (error) {
    return (
      <div className="flex items-center gap-2 text-[12px]" style={{ color: isMine ? 'rgba(255,255,255,0.6)' : V.red }}>
        <AlertCircle size={12} /> Playback failed
      </div>
    );
  }

  return (
    <div className="voice-note inline-flex items-center gap-2 min-w-[140px]">
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={onError}
        style={{ display: 'none' }}
      />
      <button
        onClick={handlePlayPause}
        className="shrink-0 w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all hover:brightness-110"
        style={{ background: bg }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <Pause size={13} style={{ color: accent }} />
        ) : (
          <Play size={14} style={{ color: accent, marginLeft: 1 }} className="fill-current" />
        )}
      </button>
      <div className="flex-1 h-[4px] rounded-full overflow-hidden relative" style={{ background: bg }}>
        <div
          className="absolute inset-0 rounded-full transition-all duration-100"
          style={{ width: `${Math.min(progress * 100, 100)}%`, background: accent, opacity: 0.7 }}
        />
      </div>
      <span className="text-[11px] shrink-0" style={{ color: isMine ? 'rgba(255,255,255,0.65)' : ui.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        {fmtDuration(duration)}
      </span>
    </div>
  );
}

// ── ChatScreen ──
function ChatScreen({ ui, conversation, onBack, onViewProfile }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [newMsgBelow, setNewMsgBelow] = useState(false);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micPermDenied, setMicPermDenied] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingMsgId, setUploadingMsgId] = useState(null);

  const bottomRef = useRef(null);
  const msgListRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const seenIds = useRef(new Set());
  const PAGE_SIZE = 30;
  const MAX_RECORD_SEC = 120; // 2 min max

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

  // ── Send text ──
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !conversation?.id) return;
    setSending(true);
    setInput('');
    const optimistic = { id: `opt-${Date.now()}`, conversation_id: conversation.id, sender_id: uid, content: trimmed, message_type: 'text', created_at: new Date().toISOString(), _pending: true };
    setMessages(prev => [...prev, optimistic]);
    setScrolledUp(false);

    const { message: sent, error: sendErr } = await sendMessage(conversation.id, trimmed);
    if (sent) {
      seenIds.current.add(sent.id);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? sent : m));
    } else {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, _failed: true } : m));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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

  // ── Voice recording ──
  const startRecording = async () => {
    setMicPermDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime.split(';')[0] });
        if (blob.size < 100) return; // too small, discard
        await handleVoiceSend(blob, recordingTime);
      };

      recorder.start(200);
      setRecording(true);
      setRecordingTime(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t + 1 >= MAX_RECORD_SEC) { stopRecording(); return MAX_RECORD_SEC; }
          return t + 1;
        });
      }, 1000);
    } catch (e) {
      if (e.name === 'NotAllowedError') setMicPermDenied(true);
      else console.error('[Vio] Mic error:', e);
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.onstop = null; // prevent upload
      mediaRecorderRef.current.stop();
      // Get the stream tracks and stop
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    chunksRef.current = [];
    setRecording(false);
    setRecordingTime(0);
  };

  const handleVoiceSend = async (blob, duration) => {
    if (!conversation?.id) return;
    setUploadingVoice(true);
    // Optimistic placeholder
    const optId = `vopt-${Date.now()}`;
    const optimistic = {
      id: optId, conversation_id: conversation.id, sender_id: uid,
      message_type: 'voice', voice_duration: duration, created_at: new Date().toISOString(), _pending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setUploadingMsgId(optId);
    setScrolledUp(false);

    // Upload to storage first
    const { url, error: upErr } = await uploadVoiceBlob(blob, conversation.id, uid, `voice-${Date.now()}`);
    if (upErr || !url) {
      setMessages(prev => prev.map(m => m.id === optId ? { ...m, _failed: true } : m));
      setUploadingVoice(false);
      setUploadingMsgId(null);
      return;
    }

    // Create message record
    const { message: sent, error: sendErr } = await sendVoiceMessage(conversation.id, url, duration);
    if (sent) {
      seenIds.current.add(sent.id);
      setMessages(prev => prev.map(m => m.id === optId ? { ...sent, voice_url: url } : m));
    } else {
      setMessages(prev => prev.map(m => m.id === optId ? { ...m, _failed: true, voice_url: url } : m));
    }
    setUploadingVoice(false);
    setUploadingMsgId(null);
  };

  // Cleanup on unmount
  useEffect(() => () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    window.__vioActiveAudioEl?.pause();
    window.__vioActiveAudio = null;
    window.__vioActiveAudioEl = null;
  }, []);

  // ── Timestamps ──
  const formatTime = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    now.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const fmtVoiceTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Render bubble ──
  const renderBubble = (msg, idx) => {
    const isMine = msg.sender_id === uid;
    const isDeleted = !!msg.deleted_at;
    const isFailed = msg._failed;
    const isPending = msg._pending;
    const isVoice = msg.message_type === 'voice';
    const isDeleting = deletingId === msg.id;
    const isUploading = uploadingMsgId === msg.id;
    const prev = idx > 0 ? messages[idx - 1] : null;
    const showTimestamp = !prev || prev.sender_id !== msg.sender_id || (new Date(msg.created_at) - new Date(prev.created_at)) > 5 * 60 * 1000;
    const prevIsMine = prev?.sender_id === uid;

    // Show continuation avatar only for first received message in a block
    const showAvatar = !isMine && (!prev || prev.sender_id !== msg.sender_id);
    // Subtle top rounding when continuing same sender
    const sameAsPrev = prev && prev.sender_id === msg.sender_id;

    return (
      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1.5 px-3`}>
        <div className={`flex items-end gap-2 max-w-[82%] ${isMine ? 'flex-row-reverse' : ''}`}>
          {showAvatar && (
            <div className="shrink-0 mb-0.5">
              <Avatar handle={otherUser?.username} name={otherUser?.display_name} src={otherUser?.avatar_url || null} size={26} />
            </div>
          )}
          {!isMine && !showAvatar && <div className="shrink-0" style={{ width: 26 }} />}

          <div className="group relative">
            <div
              className={`px-3.5 py-2.5 text-[14px] leading-relaxed break-words transition-opacity ${isFailed ? 'opacity-60' : ''} ${isPending || isUploading ? 'opacity-75' : ''}`}
              style={{
                background: isMine ? V.royal : (ui.dark ? V.surfaceDark : '#F1F1F4'),
                color: isMine ? '#FFF' : ui.textPrimary,
                borderRadius: isMine
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                borderTopRightRadius: isMine && sameAsPrev ? '4px' : '18px',
                borderTopLeftRadius: !isMine && sameAsPrev ? '4px' : '18px',
              }}
            >
              {isDeleted ? (
                <span className="italic opacity-50 text-[12px]">Message deleted</span>
              ) : isVoice ? (
                <VoiceNotePlayer
                  url={msg.voice_url || ''}
                  duration={msg.voice_duration || 0}
                  isMine={isMine}
                  ui={ui}
                  messageId={msg.id}
                />
              ) : (
                <span>{msg.content}</span>
              )}
            </div>

            {showTimestamp && !isPending && !isUploading && (
              <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {isFailed ? (
                  <button onClick={() => handleRetry(msg)} className="flex items-center gap-1" style={{ color: V.red }} aria-label="Retry">
                    <AlertCircle size={10} /><span className="text-[10px] font-medium">Failed</span>
                  </button>
                ) : (
                  <span className="text-[10px]" style={{ color: ui.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(msg.created_at)}
                  </span>
                )}
                {isMine && !isDeleted && !isFailed && !isPending && (
                  <button onClick={() => handleDelete(msg.id)} disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5" aria-label="Delete">
                    {isDeleting ? <Loader2 size={10} className="animate-spin" style={{ color: ui.textMuted }} />
                      : <Trash2 size={10} style={{ color: ui.textMuted }} />}
                  </button>
                )}
              </div>
            )}
            {(isPending || isUploading) && (
              <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <Loader2 size={10} className="animate-spin" style={{ color: isMine ? 'rgba(255,255,255,0.5)' : ui.textMuted }} />
                <span className="text-[10px]" style={{ color: isMine ? 'rgba(255,255,255,0.5)' : ui.textMuted }}>
                  {isUploading ? 'Uploading...' : 'Sending...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col relative" style={{ height: '100vh', maxWidth: '600px', margin: '0 auto' }}>
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-3 z-20"
        style={{ background: ui.dark ? 'rgba(9,9,11,0.94)' : 'rgba(248,248,250,0.94)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: `1px solid ${ui.border}` }}>
        <button onClick={onBack} className="p-1.5 rounded-full" aria-label="Back"><ArrowLeft size={18} style={{ color: ui.textPrimary }} /></button>
        <button onClick={() => { if (onViewProfile && otherUser?.user_id) { onBack(); setTimeout(() => onViewProfile(otherUser.user_id), 100); } }}
          className="flex items-center gap-3 flex-1 min-w-0" style={{ background: 'none', border: 'none', cursor: onViewProfile ? 'pointer' : 'default' }}>
          <Avatar handle={otherUser?.username} name={otherUser?.display_name} src={otherUser?.avatar_url || null} size={36} />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[14.5px] font-semibold truncate" style={{ color: ui.textPrimary }}>{otherUser?.display_name || otherUser?.username || 'Unknown'}</div>
            <div className="text-[11px]" style={{ color: ui.textMuted }}>@{otherUser?.username || 'unknown'}</div>
          </div>
        </button>
      </div>

      {/* ── Messages ── */}
      <div ref={msgListRef} className="flex-1 overflow-y-auto py-2" style={{ background: ui.bg }} onScroll={handleScroll}>
        {hasMore && (<div className="flex justify-center py-2">{loadingOlder ? <Loader2 size={14} className="animate-spin" style={{ color: ui.textMuted }} /> : <div className="text-[11px]" style={{ color: ui.textMuted }}>Scroll for older</div>}</div>)}

        {loading && (<div className="flex items-center justify-center py-12 gap-2" style={{ color: ui.textMuted }}><Loader2 size={16} className="animate-spin" /><span className="text-[13px]">Loading...</span></div>)}

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
        <button onClick={() => { setScrolledUp(false); setNewMsgBelow(false); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
          className="absolute bottom-[90px] left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-[11px] font-semibold shadow-lg" style={{ background: V.royal, color: '#FFF' }}>
          New messages ↓
        </button>
      )}

      {/* ── Mic permission denied banner ── */}
      {micPermDenied && (
        <div className="px-3 py-2 text-center text-[12px] font-medium shrink-0" style={{ background: `${V.red}12`, color: V.red, borderTop: `1px solid ${V.red}20` }}>
          Microphone access needed for voice messages. Enable it in your browser settings.
          <button onClick={() => setMicPermDenied(false)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* ── Recording UI ── */}
      {recording ? (
        <div className="shrink-0 px-3 py-3" style={{ background: ui.dark ? '#09090B' : '#F8F8FA', borderTop: `1px solid ${ui.border}`, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="shrink-0 w-[40px] h-[40px] rounded-full flex items-center justify-center"
              style={{ background: ui.dark ? V.surfaceDark : '#E4E4EA' }} aria-label="Cancel recording">
              <X size={18} style={{ color: V.red }} />
            </button>
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: ui.dark ? V.surfaceDark : '#FFFFFF', border: `1px solid ${ui.border}` }}>
              <span className="w-[8px] h-[8px] rounded-full animate-pulse" style={{ background: V.red }} />
              <span className="text-[14px] font-medium" style={{ color: ui.textPrimary }}>{fmtVoiceTime(recordingTime)}</span>
              <span className="text-[12px]" style={{ color: ui.textMuted }}>recording...</span>
            </div>
            <button onClick={stopRecording} className="shrink-0 w-[40px] h-[40px] rounded-full flex items-center justify-center"
              style={{ background: V.royal }} aria-label="Stop recording">
              <Square size={16} fill="#FFF" style={{ color: '#FFF' }} />
            </button>
          </div>
        </div>
      ) : (
        /* ── Composer ── */
        <div className="shrink-0 px-3 py-3" style={{ background: ui.dark ? '#09090B' : '#F8F8FA', borderTop: `1px solid ${ui.border}`, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-end gap-2">
            {/* Attachment button — visual placeholder for future use */}
            <button
              disabled
              className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center opacity-30"
              style={{ background: ui.dark ? V.surfaceDark : '#E4E4EA' }}
              aria-label="Attach (coming soon)"
            >
              <Paperclip size={16} style={{ color: ui.textMuted }} />
            </button>

            {/* Text input */}
            <div className="flex-1 rounded-2xl px-4 py-2.5" style={{ background: ui.dark ? V.surfaceDark : '#EBEBF0' }}>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Write a message..." rows={1} disabled={sending}
                className="w-full bg-transparent text-[14px] leading-relaxed resize-none outline-none"
                style={{ color: ui.textPrimary, maxHeight: '80px', fontFamily: 'inherit' }} />
            </div>

            {/* Mic / Send toggle */}
            {input.trim() ? (
              <button onClick={handleSend} disabled={!input.trim() || sending}
                className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all duration-200"
                style={{ background: !input.trim() || sending ? (ui.dark ? V.surfaceDark : '#D4D4DC') : V.royal, opacity: !input.trim() || sending ? 0.5 : 1 }}
                aria-label="Send">
                {sending ? <Loader2 size={16} className="animate-spin" style={{ color: '#FFF' }} />
                  : <Send size={16} style={{ color: input.trim() ? '#FFF' : (ui.dark ? '#71717A' : '#8E8E96') }} strokeWidth={2.5} />}
              </button>
            ) : (
              <button onClick={startRecording} disabled={uploadingVoice}
                className="shrink-0 w-[38px] h-[38px] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: V.royal }}
                aria-label="Record voice message">
                {uploadingVoice ? <Loader2 size={16} className="animate-spin" style={{ color: '#FFF' }} />
                  : <Mic size={16} style={{ color: '#FFF' }} strokeWidth={2.5} />}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ChatScreen;
